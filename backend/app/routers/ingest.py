import re
import hashlib
import asyncio
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, AsyncSessionLocal
from app.models.api_models import IngestRequest, IngestResponse
from app.services.chunker import chunk_transcript
from app.services.embedder import embed_texts
from app.services.metadata_store import (
    get_source_with_videos,
    mark_source_status,
    save_chunks,
    save_source,
    save_video,
)
from app.services.transcript_service import fetch_transcript
from app.services.vector_store import upsert_chunks
from app.services.youtube_service import (
    fetch_source_metadata,
    resolve_source_video_ids_and_meta,
)
from app.services.url_resolver import resolve_url, SourceInfo


router = APIRouter()


class IngestRequestError(ValueError):
    pass


# Global in-memory progress tracking: source_id -> progress dict
ingest_progress: dict[str, dict[str, Any]] = {}


def parse_link_entries(*entries: str | None) -> list[str]:
    links: list[str] = []
    for entry in entries:
        if not entry:
            continue
        links.extend(part.strip() for part in re.split(r"[\n,]+", entry) if part.strip())
    return links


async def _resolve_ingest_source(
    request: IngestRequest,
) -> tuple[SourceInfo, dict, list[str], dict[str, dict]]:
    urls = parse_link_entries(request.url, *request.urls)
    if not urls:
        raise IngestRequestError("Please provide a valid YouTube URL.")
    
    if len(urls) == 1:
        url = urls[0]
        try:
            source_info = resolve_url(url)
        except ValueError as exc:
            raise IngestRequestError(str(exc)) from exc

        video_ids, video_metadata = await resolve_source_video_ids_and_meta(source_info)
        source_meta = await fetch_source_metadata(source_info, video_ids)
        return source_info, source_meta, video_ids, video_metadata

    # Multiple URLs: Group into a single virtual "batch" source
    async def resolve_one(url: str):
        try:
            s_info = resolve_url(url)
            v_ids, v_meta = await resolve_source_video_ids_and_meta(s_info)
            s_meta = await fetch_source_metadata(s_info, v_ids)
            return s_info, s_meta, v_ids, v_meta
        except Exception as exc:
            raise IngestRequestError(f"Failed to resolve URL '{url}': {exc}")

    tasks = [resolve_one(u) for u in urls]
    try:
        resolved = await asyncio.gather(*tasks)
    except Exception as exc:
        raise IngestRequestError(str(exc)) from exc

    # Merge video_ids and video_metadata, keeping order and avoiding duplicates
    merged_video_ids = []
    seen_video_ids = set()
    merged_video_metadata = {}
    
    for _, _, v_ids, v_meta in resolved:
        for vid in v_ids:
            if vid not in seen_video_ids:
                seen_video_ids.add(vid)
                merged_video_ids.append(vid)
                merged_video_metadata[vid] = v_meta.get(vid, {})

    # Generate a stable batch source_id based on the sorted video IDs
    hasher = hashlib.md5()
    for vid in sorted(merged_video_ids):
        hasher.update(vid.encode("utf-8"))
    batch_hash = hasher.hexdigest()[:8]
    batch_source_id = f"batch_{batch_hash}"

    # Build descriptive title
    titles = [meta.get("title", "") for _, meta, _, _ in resolved]
    titles = [t for t in titles if t]
    if len(titles) > 2:
        batch_title = f"Batch: {titles[0]}, {titles[1]} and {len(titles)-2} more"
    elif len(titles) == 2:
        batch_title = f"Batch: {titles[0]} & {titles[1]}"
    elif titles:
        batch_title = f"Batch: {titles[0]}"
    else:
        batch_title = f"Batch Ingest ({len(urls)} sources)"

    # Create virtual SourceInfo and source metadata
    source_info = SourceInfo(
        source_type="batch",
        source_id=batch_source_id,
        normalized_url=";".join(urls),
    )
    
    source_meta = {
        "title": batch_title,
        "channel_id": "",
        "channel_title": "Multiple Channels" if len(set(m.get("channel_title", "") for _, m, _, _ in resolved)) > 1 else (resolved[0][1].get("channel_title") or ""),
        "url": ";".join(urls),
        "video_count": len(merged_video_ids),
    }

    return source_info, source_meta, merged_video_ids, merged_video_metadata


async def _bg_ingest_source(
    source_info: SourceInfo,
    source_meta: dict,
    video_ids: list[str],
    video_metadata: dict[str, dict],
    limit_override: bool,
) -> None:
    source_id = source_info.source_id
    indexed = 0
    skipped: list[str] = []

    try:
        if len(video_ids) > 100 and not limit_override:
            video_ids = video_ids[:100]

        async with AsyncSessionLocal() as db:
            existing_source = await get_source_with_videos(db, source_id)
            existing_video_ids = set()
            if existing_source:
                existing_video_ids = {v["video_id"] for v in existing_source["videos"] if v.get("transcript_available")}
                
            videos_to_process = [vid for vid in video_ids if vid not in existing_video_ids]

            await save_source(
                db, 
                source_id, 
                source_info.source_type,
                source_meta, 
                source_info.normalized_url, 
                video_count=len(video_ids)
            )

            if not videos_to_process:
                # All videos are already indexed
                status = "complete"
                await mark_source_status(db, source_id, status)
                ingest_progress[source_id] = {
                    "status": status,
                    "current_video": "All videos are already indexed",
                    "processed": 0,
                    "total": 0,
                    "videos_indexed": 0,
                    "videos_skipped": 0,
                    "skipped_video_ids": [],
                }
                return

            # Build per-video progress entries
            videos_progress = {}
            for vid in videos_to_process:
                v_meta = video_metadata.get(vid, {})
                videos_progress[vid] = {
                    "video_id": vid,
                    "title": v_meta.get("title", vid),
                    "thumbnail_url": v_meta.get("thumbnail_url", f"https://i.ytimg.com/vi/{vid}/default.jpg"),
                    "status": "queued",
                }

            # Update initial progress state
            ingest_progress[source_id].update({
                "current_video": "Preparing chunking and embedding models...",
                "processed": 0,
                "total": len(videos_to_process),
                "videos": videos_progress,
            })

            # Concurrency limit (3 parallel videos at a time)
            sem = asyncio.Semaphore(3)
            processed_count = 0
            
            async def process_video(idx: int, video_id: str) -> None:
                nonlocal indexed, processed_count
                async with sem:
                    # Stagger startups slightly to avoid simultaneous spikes
                    if idx > 0:
                        await asyncio.sleep(idx * 0.2)
                        
                    video_meta = video_metadata.get(video_id, {})
                    video_title = video_meta.get("title", video_id)
                    
                    # Mark video as downloading
                    vp = ingest_progress[source_id].get("videos", {})
                    if video_id in vp:
                        vp[video_id]["status"] = "downloading"
                    ingest_progress[source_id].update({
                        "current_video": f"Indexing: {video_title}",
                    })
                    
                    try:
                        segments = await fetch_transcript(video_id)
                        if not segments:
                            skipped.append(video_id)
                            if video_id in vp:
                                vp[video_id]["status"] = "skipped"
                            async with AsyncSessionLocal() as sub_db:
                                await save_video(
                                    sub_db,
                                    video_id,
                                    source_id,
                                    video_meta,
                                    transcript_available=False,
                                )
                            return

                        chunks = chunk_transcript(segments, video_id, source_id, video_meta)

                        # Mark video as embedding
                        if video_id in vp:
                            vp[video_id]["status"] = "embedding"

                        embeddings = await embed_texts([chunk["text"] for chunk in chunks])
                        await upsert_chunks(chunks, embeddings)
                        
                        async with AsyncSessionLocal() as sub_db:
                            await save_video(
                                sub_db,
                                video_id,
                                source_id,
                                video_meta,
                                transcript_available=True,
                                chunk_count=len(chunks),
                            )
                            await save_chunks(sub_db, chunks)
                        indexed += 1
                        if video_id in vp:
                            vp[video_id]["status"] = "completed"
                    except Exception as exc:
                        print(f"[WARN] Failed to process video {video_id}: {exc}")
                        skipped.append(video_id)
                        if video_id in vp:
                            vp[video_id]["status"] = "failed"
                        async with AsyncSessionLocal() as sub_db:
                            await save_video(
                                sub_db,
                                video_id,
                                source_id,
                                video_meta,
                                transcript_available=False,
                            )
                    finally:
                        processed_count += 1
                        ingest_progress[source_id].update({
                            "processed": processed_count,
                        })

            tasks = [process_video(idx, vid) for idx, vid in enumerate(videos_to_process)]
            await asyncio.gather(*tasks)

            status = "complete" if not skipped else "partial"
            await mark_source_status(db, source_id, status)

            # Update final progress state
            ingest_progress[source_id].update({
                "status": status,
                "current_video": "Done",
                "videos_indexed": indexed,
                "videos_skipped": len(skipped),
                "skipped_video_ids": skipped,
            })
    except Exception as exc:
        print(f"[ERROR] Background ingestion failed for {source_id}: {exc}")
        ingest_progress[source_id] = {
            "status": "failed",
            "current_video": f"Failed: {exc}",
            "processed": 0,
            "total": 0,
            "videos_indexed": 0,
            "videos_skipped": 0,
            "skipped_video_ids": [],
        }
        try:
            async with AsyncSessionLocal() as db:
                await mark_source_status(db, source_id, "failed")
        except Exception:
            pass


@router.post("/", response_model=IngestResponse)
async def ingest_source(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
) -> IngestResponse:
    try:
        source_info, source_meta, video_ids, video_metadata = await _resolve_ingest_source(request)
        source_id = source_info.source_id

        # Check if already indexing
        if ingest_progress.get(source_id, {}).get("status") == "indexing":
            return IngestResponse(
                source_id=source_id,
                source_title=source_meta["title"],
                source_type=source_info.source_type,
                videos_indexed=0,
                videos_skipped=0,
                skipped_video_ids=[],
                status="indexing",
            )

        # Initialize progress tracker
        ingest_progress[source_id] = {
            "status": "indexing",
            "current_video": "Resolving source...",
            "processed": 0,
            "total": len(video_ids),
            "videos_indexed": 0,
            "videos_skipped": 0,
            "skipped_video_ids": [],
        }

        # Dispatch background task
        background_tasks.add_task(
            _bg_ingest_source,
            source_info,
            source_meta,
            video_ids,
            video_metadata,
            request.limit_override,
        )

        return IngestResponse(
            source_id=source_id,
            source_title=source_meta["title"],
            source_type=source_info.source_type,
            videos_indexed=0,
            videos_skipped=0,
            skipped_video_ids=[],
            status="indexing",
        )
    except IngestRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if "quota" in str(exc).lower():
            raise HTTPException(status_code=429, detail=str(exc)) from exc
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}") from exc


@router.get("/progress/{source_id}")
async def get_ingest_progress(source_id: str) -> dict[str, Any]:
    progress = ingest_progress.get(source_id)
    if not progress:
        return {
            "status": "idle",
            "current_video": "",
            "processed": 0,
            "total": 0,
            "videos_indexed": 0,
            "videos_skipped": 0,
            "skipped_video_ids": [],
        }
    return progress

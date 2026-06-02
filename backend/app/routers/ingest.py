import re
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
    
    url = urls[0]
    
    try:
        source_info = resolve_url(url)
    except ValueError as exc:
        raise IngestRequestError(str(exc)) from exc

    video_ids, video_metadata = await resolve_source_video_ids_and_meta(source_info)
    source_meta = await fetch_source_metadata(source_info, video_ids)
    
    return source_info, source_meta, video_ids, video_metadata


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

            # Update initial progress state
            ingest_progress[source_id].update({
                "current_video": "Preparing chunking and embedding models...",
                "processed": 0,
                "total": len(videos_to_process),
            })

            for idx, video_id in enumerate(videos_to_process):
                # Add 0.1 second delay to prevent rate limits
                if idx > 0:
                    await asyncio.sleep(0.1)

                video_meta = video_metadata.get(video_id, {})
                video_title = video_meta.get("title", video_id)

                # Update progress for active video
                ingest_progress[source_id].update({
                    "current_video": f"Indexing: {video_title}",
                    "processed": idx + 1,
                })

                try:
                    segments = await fetch_transcript(video_id)
                    if not segments:
                        skipped.append(video_id)
                        await save_video(
                            db,
                            video_id,
                            source_id,
                            video_meta,
                            transcript_available=False,
                        )
                        continue

                    chunks = chunk_transcript(segments, video_id, source_id, video_meta)
                    embeddings = await embed_texts([chunk["text"] for chunk in chunks])
                    await upsert_chunks(chunks, embeddings)
                    await save_video(
                        db,
                        video_id,
                        source_id,
                        video_meta,
                        transcript_available=True,
                        chunk_count=len(chunks),
                    )
                    await save_chunks(db, chunks)
                    indexed += 1
                except Exception as exc:
                    print(f"[WARN] Failed to process video {video_id}: {exc}")
                    skipped.append(video_id)
                    await save_video(
                        db,
                        video_id,
                        source_id,
                        video_meta,
                        transcript_available=False,
                    )

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

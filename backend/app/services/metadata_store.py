from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Chunk, Source, Video
from app.services.vector_store import delete_by_source


def _video_row_id(source_id: str, video_id: str) -> str:
    return f"{source_id}:{video_id}"


def _display_video_id(source_id: str, stored_video_id: str) -> str:
    prefix = f"{source_id}:"
    if stored_video_id.startswith(prefix):
        return stored_video_id[len(prefix) :]
    return stored_video_id


async def save_source(
    db: AsyncSession,
    source_id: str,
    source_type: str,
    meta: dict,
    url: str,
    video_count: int,
) -> None:
    source = Source(
        id=source_id,
        source_type=source_type,
        title=meta.get("title") or "",
        channel_id=meta.get("channel_id") or "",
        channel_title=meta.get("channel_title") or "",
        url=url,
        video_count=video_count,
        created_at=datetime.utcnow(),
        last_indexed_at=datetime.utcnow(),
        status="indexing",
    )
    await db.merge(source)
    await db.commit()


async def mark_source_status(db: AsyncSession, source_id: str, status: str) -> None:
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if source:
        source.status = status
        source.last_indexed_at = datetime.utcnow()
        await db.commit()


async def save_video(
    db: AsyncSession,
    video_id: str,
    source_id: str,
    meta: dict,
    transcript_available: bool,
    chunk_count: int = 0,
) -> None:
    video = Video(
        id=_video_row_id(source_id, video_id),
        source_id=source_id,
        title=meta.get("title", ""),
        description=meta.get("description", ""),
        published_at=meta.get("published_at", ""),
        duration_secs=meta.get("duration_secs"),
        thumbnail_url=meta.get("thumbnail_url", ""),
        transcript_available=transcript_available,
        chunk_count=chunk_count,
        indexed_at=datetime.utcnow() if transcript_available else None,
    )
    await db.merge(video)
    await db.commit()


async def save_chunks(db: AsyncSession, chunks: list[dict]) -> None:
    for item in chunks:
        chunk = Chunk(
            id=item["id"],
            video_id=_video_row_id(item["source_id"], item["video_id"]),
            source_id=item["source_id"],
            chunk_index=item["chunk_index"],
            start_seconds=item["start_seconds"],
            end_seconds=item["end_seconds"],
            text=item["text"],
            youtube_url=item["youtube_url"],
        )
        await db.merge(chunk)
    await db.commit()


async def get_source_with_videos(db: AsyncSession, source_id: str) -> dict | None:
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        return None

    videos_result = await db.execute(select(Video).where(Video.source_id == source_id))
    videos = videos_result.scalars().all()

    return {
        "source_id": source.id,
        "source_type": source.source_type,
        "title": source.title or "",
        "video_count": len(videos),
        "created_at": source.created_at or datetime.utcnow(),
        "last_indexed_at": source.last_indexed_at or datetime.utcnow(),
        "videos": [
            {
                "video_id": _display_video_id(source.id, video.id),
                "title": video.title or "",
                "thumbnail_url": video.thumbnail_url,
                "published_at": video.published_at,
                "chunk_count": video.chunk_count or 0,
                "transcript_available": bool(video.transcript_available),
            }
            for video in videos
        ],
    }


async def delete_source_data(db: AsyncSession, source_id: str) -> None:
    await delete_by_source(source_id)
    await db.execute(delete(Chunk).where(Chunk.source_id == source_id))
    await db.execute(delete(Video).where(Video.source_id == source_id))
    await db.execute(delete(Source).where(Source.id == source_id))
    await db.commit()

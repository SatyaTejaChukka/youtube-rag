from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.api_models import SourceSummary, VideoChunk
from app.services.metadata_store import delete_source_data, get_source_with_videos, get_video_chunks


router = APIRouter()


@router.get("/{source_id}", response_model=SourceSummary)
async def get_sources(
    source_id: str,
    db: AsyncSession = Depends(get_db),
) -> SourceSummary:
    data = await get_source_with_videos(db, source_id)
    if not data:
        raise HTTPException(status_code=404, detail="Source not found")
    return data


@router.get("/{source_id}/videos/{video_id}/chunks", response_model=list[VideoChunk])
async def get_chunks(
    source_id: str,
    video_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[VideoChunk]:
    chunks = await get_video_chunks(db, source_id, video_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for this video")
    return chunks


@router.delete("/{source_id}")
async def delete_sources(
    source_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await delete_source_data(db, source_id)
    return {"message": f"Source {source_id} deleted successfully"}


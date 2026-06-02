from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.api_models import SourceSummary
from app.services.metadata_store import delete_source_data, get_source_with_videos


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


@router.delete("/{source_id}")
async def delete_sources(
    source_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await delete_source_data(db, source_id)
    return {"message": f"Source {source_id} deleted successfully"}

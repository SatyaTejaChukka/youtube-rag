from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    url: Optional[str] = None
    urls: list[str] = Field(default_factory=list)
    limit_override: bool = False


class VideoIngested(BaseModel):
    video_id: str
    title: str
    chunk_count: int


class IngestResponse(BaseModel):
    source_id: str
    source_title: str
    source_type: str
    videos_indexed: int
    videos_skipped: int
    skipped_video_ids: list[str]
    status: str


class AskRequest(BaseModel):
    question: str
    source_id: Optional[str] = None


class SourceReference(BaseModel):
    video_id: str
    video_title: str
    start_seconds: int
    timestamp_label: str
    snippet: str
    youtube_url: str
    thumbnail_url: Optional[str] = None


class VideoChunk(BaseModel):
    chunk_index: int
    start_seconds: float
    end_seconds: float
    timestamp_label: str
    text: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    question: str


class VideoSummary(BaseModel):
    video_id: str
    title: str
    thumbnail_url: Optional[str] = None
    published_at: Optional[str] = None
    chunk_count: int
    transcript_available: bool


class SourceSummary(BaseModel):
    source_id: str
    source_type: str
    title: str
    video_count: int
    created_at: datetime
    last_indexed_at: datetime
    videos: list[VideoSummary]

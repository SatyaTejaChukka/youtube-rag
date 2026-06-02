from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base


Base = declarative_base()


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True)
    source_type = Column(String)
    title = Column(String)
    url = Column(String)
    channel_id = Column(String)
    channel_title = Column(String)
    video_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_indexed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True)
    source_id = Column(String, ForeignKey("sources.id"))
    title = Column(String)
    description = Column(Text)
    published_at = Column(String)
    duration_secs = Column(Integer)
    thumbnail_url = Column(String)
    transcript_available = Column(Boolean, default=False)
    chunk_count = Column(Integer, default=0)
    indexed_at = Column(DateTime)


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True)
    video_id = Column(String, ForeignKey("videos.id"))
    source_id = Column(String)
    chunk_index = Column(Integer)
    start_seconds = Column(Float)
    end_seconds = Column(Float)
    text = Column(Text)
    youtube_url = Column(String)

# Folder Structure & Backend Specification

## Complete Folder Structure

```
youtube-rag/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app, CORS, router registration
│   │   ├── config.py                  # Settings loaded from .env
│   │   ├── database.py                # SQLAlchemy setup, session factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── db_models.py           # SQLAlchemy ORM models
│   │   │   └── api_models.py          # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── ingest.py              # POST /api/ingest, GET /api/ingest/status
│   │   │   ├── ask.py                 # POST /api/ask
│   │   │   ├── sources.py             # GET/DELETE /api/sources
│   │   │   └── health.py              # GET /api/health
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── youtube_service.py     # YouTube Data API calls
│   │       ├── transcript_service.py  # youtube-transcript-api calls
│   │       ├── chunker.py             # Transcript chunking logic
│   │       ├── embedder.py            # OpenAI embeddings
│   │       ├── vector_store.py        # ChromaDB wrapper
│   │       ├── metadata_store.py      # SQLite CRUD operations
│   │       ├── retriever.py           # Query + rerank logic
│   │       └── answer_generator.py    # Claude prompt + response
│   ├── tests/
│   │   ├── test_chunker.py
│   │   ├── test_youtube_service.py
│   │   └── test_retriever.py
│   ├── .env                           # Secrets (never commit)
│   ├── .env.example                   # Template to commit
│   ├── requirements.txt
│   └── run.py                         # Entry point: uvicorn main:app
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts              # Axios/fetch wrappers for API calls
│   │   ├── components/
│   │   │   ├── IngestPanel.tsx        # URL input + submit + status
│   │   │   ├── ChatWindow.tsx         # Message list
│   │   │   ├── MessageBubble.tsx      # User or assistant message
│   │   │   ├── SourceCard.tsx         # Video reference card
│   │   │   ├── SourceList.tsx         # Container for multiple SourceCards
│   │   │   └── IndexedVideos.tsx      # Sidebar: list of indexed videos
│   │   ├── hooks/
│   │   │   ├── useIngest.ts           # Ingestion state management
│   │   │   └── useChat.ts             # Chat state management
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript interfaces
│   │   └── styles/
│   │       └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Backend — requirements.txt

```txt
fastapi==0.111.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.2.1
python-dotenv==1.0.1
sqlalchemy==2.0.30
aiosqlite==0.20.0
httpx==0.27.0
openai==1.30.0
anthropic==0.28.0
chromadb==0.5.0
youtube-transcript-api==0.6.2
google-api-python-client==2.131.0
tiktoken==0.7.0
```

---

## config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    youtube_api_key: str
    openai_api_key: str
    anthropic_api_key: str
    frontend_url: str = "http://localhost:5173"
    chroma_persist_dir: str = "./chroma_db"
    sqlite_db_path: str = "./app.db"
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "claude-sonnet-4-20250514"
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 50
    retrieval_top_k: int = 8

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import ingest, ask, sources, health

app = FastAPI(title="YouTube RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()

app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api/ingest")
app.include_router(ask.router, prefix="/api/ask")
app.include_router(sources.router, prefix="/api/sources")
```

---

## api_models.py (Pydantic Schemas)

```python
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

# ---- Ingest ----
class IngestRequest(BaseModel):
    url: str  # playlist or channel URL

class VideoIngested(BaseModel):
    video_id: str
    title: str
    chunk_count: int

class IngestResponse(BaseModel):
    playlist_id: str
    playlist_title: str
    videos_indexed: int
    videos_skipped: int
    skipped_video_ids: List[str]
    status: str  # "complete" | "partial" | "error"

# ---- Ask ----
class AskRequest(BaseModel):
    question: str
    playlist_id: str

class SourceReference(BaseModel):
    video_id: str
    video_title: str
    start_seconds: int
    timestamp_label: str        # e.g. "12:43"
    snippet: str                # short excerpt from the chunk
    youtube_url: str            # https://youtube.com/watch?v=...&t=Ns
    thumbnail_url: Optional[str]

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceReference]
    question: str

# ---- Sources ----
class VideoSummary(BaseModel):
    video_id: str
    title: str
    thumbnail_url: Optional[str]
    published_at: Optional[str]
    chunk_count: int
    transcript_available: bool

class PlaylistSummary(BaseModel):
    playlist_id: str
    title: str
    video_count: int
    indexed_at: datetime
    videos: List[VideoSummary]
```

---

## db_models.py (SQLAlchemy ORM)

```python
from sqlalchemy import Column, String, Integer, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Playlist(Base):
    __tablename__ = "playlists"
    id            = Column(String, primary_key=True)
    title         = Column(String)
    channel_id    = Column(String)
    channel_title = Column(String)
    url           = Column(String)
    video_count   = Column(Integer)
    indexed_at    = Column(DateTime, default=datetime.utcnow)
    status        = Column(String, default="pending")

class Video(Base):
    __tablename__ = "videos"
    id                   = Column(String, primary_key=True)
    playlist_id          = Column(String, ForeignKey("playlists.id"))
    title                = Column(String)
    description          = Column(Text)
    published_at         = Column(String)
    duration_secs        = Column(Integer)
    thumbnail_url        = Column(String)
    transcript_available = Column(Boolean, default=False)
    chunk_count          = Column(Integer, default=0)
    indexed_at           = Column(DateTime)

class Chunk(Base):
    __tablename__ = "chunks"
    id            = Column(String, primary_key=True)
    video_id      = Column(String, ForeignKey("videos.id"))
    playlist_id   = Column(String)
    chunk_index   = Column(Integer)
    start_seconds = Column(Float)
    end_seconds   = Column(Float)
    text          = Column(Text)
    youtube_url   = Column(String)
```

---

## database.py

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.db_models import Base

DATABASE_URL = f"sqlite+aiosqlite:///{settings.sqlite_db_path}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## routers/ingest.py

```python
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.api_models import IngestRequest, IngestResponse
from app.services.youtube_service import resolve_playlist_id, fetch_playlist_metadata, fetch_video_metadata
from app.services.transcript_service import fetch_transcript
from app.services.chunker import chunk_transcript
from app.services.embedder import embed_texts
from app.services.vector_store import upsert_chunks
from app.services.metadata_store import save_playlist, save_video, save_chunks
import re

router = APIRouter()

def extract_playlist_id(url: str) -> str:
    """Extract playlist ID from a YouTube playlist URL."""
    match = re.search(r"list=([A-Za-z0-9_-]+)", url)
    if not match:
        raise ValueError("Could not extract playlist ID from URL")
    return match.group(1)

@router.post("/", response_model=IngestResponse)
async def ingest_playlist(request: IngestRequest):
    try:
        playlist_id = extract_playlist_id(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fetch playlist metadata
    playlist_meta = await fetch_playlist_metadata(playlist_id)
    await save_playlist(playlist_id, playlist_meta, request.url)

    # Fetch all video IDs from playlist
    video_ids = await resolve_playlist_id(playlist_id)

    indexed = 0
    skipped = []

    for video_id in video_ids:
        try:
            # Fetch video metadata
            video_meta = await fetch_video_metadata(video_id)

            # Fetch transcript
            segments = await fetch_transcript(video_id)
            if not segments:
                skipped.append(video_id)
                await save_video(video_id, playlist_id, video_meta, transcript_available=False)
                continue

            # Chunk transcript
            chunks = chunk_transcript(segments, video_id, playlist_id, video_meta)

            # Embed chunk texts
            texts = [c["text"] for c in chunks]
            embeddings = await embed_texts(texts)

            # Upsert into ChromaDB
            await upsert_chunks(chunks, embeddings)

            # Save to SQLite
            await save_video(video_id, playlist_id, video_meta, transcript_available=True, chunk_count=len(chunks))
            await save_chunks(chunks)

            indexed += 1

        except Exception as e:
            print(f"[WARN] Failed to process video {video_id}: {e}")
            skipped.append(video_id)

    return IngestResponse(
        playlist_id=playlist_id,
        playlist_title=playlist_meta["title"],
        videos_indexed=indexed,
        videos_skipped=len(skipped),
        skipped_video_ids=skipped,
        status="complete" if not skipped else "partial"
    )
```

---

## routers/ask.py

```python
from fastapi import APIRouter, HTTPException
from app.models.api_models import AskRequest, AskResponse
from app.services.embedder import embed_text
from app.services.retriever import retrieve_chunks
from app.services.answer_generator import generate_answer

router = APIRouter()

@router.post("/", response_model=AskResponse)
async def ask_question(request: AskRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Embed user question
    question_embedding = await embed_text(request.question)

    # Retrieve top-K relevant chunks
    chunks = await retrieve_chunks(
        query_embedding=question_embedding,
        playlist_id=request.playlist_id,
        top_k=8
    )

    # Generate grounded answer
    result = await generate_answer(request.question, chunks)

    return AskResponse(
        question=request.question,
        answer=result["answer"],
        sources=result["sources"]
    )
```

---

## routers/sources.py

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.metadata_store import get_playlist_with_videos, delete_playlist_data
from app.models.api_models import PlaylistSummary

router = APIRouter()

@router.get("/{playlist_id}", response_model=PlaylistSummary)
async def get_sources(playlist_id: str, db: AsyncSession = Depends(get_db)):
    data = await get_playlist_with_videos(db, playlist_id)
    if not data:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return data

@router.delete("/{playlist_id}")
async def delete_sources(playlist_id: str, db: AsyncSession = Depends(get_db)):
    await delete_playlist_data(db, playlist_id)
    return {"message": f"Playlist {playlist_id} deleted successfully"}
```

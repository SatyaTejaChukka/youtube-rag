# Phase 2 Features & Production Hardening

This document covers everything beyond the MVP. Implement Phase 1 fully before starting here.

---

## Phase 2A — Channel URL Support

Currently the system only handles playlist URLs like `youtube.com/playlist?list=PLxxx`.

Phase 2 adds support for channel URLs like:
- `https://www.youtube.com/@ChannelName`
- `https://www.youtube.com/channel/UCxxx`

### How Channel Uploads Work

Every YouTube channel has a hidden **uploads playlist**. Its ID is constructed from the channel ID:
```
channel_id = "UCxxxxxxxxxx"
uploads_playlist_id = "UUxxxxxxxxxx"  # Replace "UC" prefix with "UU"
```

This is the most reliable way to get all public videos from a channel without pagination issues.

### URL Parsing Logic (extend `ingest.py`)

```python
import re

def parse_youtube_url(url: str) -> tuple[str, str]:
    """
    Returns (type, id) where type is 'playlist' or 'channel'.
    Raises ValueError if URL format is unrecognized.
    """
    # Playlist URL
    playlist_match = re.search(r"[?&]list=([A-Za-z0-9_-]+)", url)
    if playlist_match:
        return ("playlist", playlist_match.group(1))

    # @Handle style channel
    handle_match = re.search(r"youtube\.com/@([A-Za-z0-9_.-]+)", url)
    if handle_match:
        return ("channel_handle", handle_match.group(1))

    # /channel/UCxxx style
    channel_match = re.search(r"youtube\.com/channel/([A-Za-z0-9_-]+)", url)
    if channel_match:
        return ("channel_id", channel_match.group(1))

    raise ValueError(
        "Unrecognized YouTube URL. Please use a playlist URL (list=PLxxx) "
        "or a channel URL (youtube.com/@handle)."
    )
```

### Resolving Channel to Uploads Playlist (in `youtube_service.py`)

```python
async def resolve_channel_to_uploads_playlist(url_type: str, identifier: str) -> tuple[str, dict]:
    """
    Resolves a channel handle or ID to its uploads playlist ID.
    Returns (uploads_playlist_id, channel_meta).
    """
    youtube = get_youtube_client()

    if url_type == "channel_handle":
        response = youtube.channels().list(
            part="snippet,contentDetails",
            forHandle=identifier
        ).execute()
    else:  # channel_id
        response = youtube.channels().list(
            part="snippet,contentDetails",
            id=identifier
        ).execute()

    items = response.get("items", [])
    if not items:
        raise ValueError("Channel not found")

    channel = items[0]
    uploads_playlist_id = channel["contentDetails"]["relatedPlaylists"]["uploads"]
    channel_meta = {
        "title": channel["snippet"]["title"],
        "channel_id": channel["id"],
    }
    return uploads_playlist_id, channel_meta
```

### Updated Ingest Router Logic

```python
@router.post("/", response_model=IngestResponse)
async def ingest(request: IngestRequest):
    url_type, identifier = parse_youtube_url(request.url)

    if url_type == "playlist":
        playlist_id = identifier
        playlist_meta = await fetch_playlist_metadata(playlist_id)
    else:
        # Channel → resolve to uploads playlist
        playlist_id, channel_meta = await resolve_channel_to_uploads_playlist(url_type, identifier)
        playlist_meta = {
            "title": f"{channel_meta['title']} — All Videos",
            "channel_id": channel_meta["channel_id"],
            "channel_title": channel_meta["title"],
        }

    # Rest of ingestion pipeline is the same
    ...
```

---

## Phase 2B — Incremental Indexing

When a playlist is re-submitted for indexing, only process new videos (not already in SQLite).

```python
async def get_already_indexed_video_ids(db: AsyncSession, playlist_id: str) -> set[str]:
    result = await db.execute(
        select(Video.id).where(
            Video.playlist_id == playlist_id,
            Video.transcript_available == True
        )
    )
    return {row[0] for row in result.all()}

# In the ingest router, before processing videos:
already_indexed = await get_already_indexed_video_ids(db, playlist_id)
video_ids_to_process = [vid for vid in all_video_ids if vid not in already_indexed]
```

Add a response field:
```python
class IngestResponse(BaseModel):
    ...
    videos_already_indexed: int  # NEW
```

---

## Phase 2C — Background Task Ingestion

For large playlists (100+ videos), ingestion takes too long for a synchronous HTTP request.

### Approach: In-memory job tracking (MVP of background processing)

```python
import asyncio
from fastapi import BackgroundTasks
from collections import defaultdict

# Global job tracker (use Redis in production)
jobs: dict[str, dict] = {}

def run_job_id() -> str:
    import uuid
    return str(uuid.uuid4())

@router.post("/", response_model=dict)
async def ingest(request: IngestRequest, background_tasks: BackgroundTasks):
    job_id = run_job_id()
    jobs[job_id] = {"status": "running", "progress": 0, "total": 0, "result": None}
    background_tasks.add_task(run_ingestion, job_id, request.url)
    return {"job_id": job_id, "status": "started"}

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

async def run_ingestion(job_id: str, url: str):
    try:
        # ... same ingestion logic ...
        # Update jobs[job_id]["progress"] as each video completes
        jobs[job_id]["status"] = "complete"
        jobs[job_id]["result"] = { ... }
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
```

### Frontend: Poll for status

```ts
async function pollJobStatus(jobId: string, onProgress: (p: number) => void) {
  while (true) {
    const { data } = await api.get(`/ingest/status/${jobId}`);
    onProgress(data.progress / data.total * 100);
    if (data.status === 'complete') return data.result;
    if (data.status === 'error') throw new Error(data.error);
    await new Promise(r => setTimeout(r, 2000)); // poll every 2s
  }
}
```

---

## Phase 3 — Production Hardening

### Switch from SQLite → PostgreSQL

```python
# In database.py
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/tuberag"
```

Install: `pip install asyncpg`

### Switch from ChromaDB → pgvector

```python
# Install: pip install pgvector sqlalchemy[asyncio]
# Create extension in Postgres: CREATE EXTENSION IF NOT EXISTS vector;

# New chunk table column:
from pgvector.sqlalchemy import Vector
class Chunk(Base):
    ...
    embedding = Column(Vector(1536))

# Query:
from sqlalchemy import text
result = await db.execute(
    text("""
        SELECT id, text, metadata, embedding <=> :query_vec AS distance
        FROM chunks
        WHERE playlist_id = :playlist_id
        ORDER BY distance ASC
        LIMIT :k
    """),
    {"query_vec": query_embedding, "playlist_id": playlist_id, "k": top_k}
)
```

### Re-ranking with Cross-Encoder

After vector retrieval, re-rank with a cross-encoder for better precision.

```python
# Install: pip install sentence-transformers
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank_chunks(question: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    pairs = [(question, c["text"]) for c in chunks]
    scores = reranker.predict(pairs)
    scored = sorted(zip(scores, chunks), reverse=True)
    return [chunk for _, chunk in scored[:top_n]]
```

### Hybrid Search (BM25 + Vector)

```python
# Install: pip install rank-bm25
from rank_bm25 import BM25Okapi

def build_bm25_index(chunks: list[dict]) -> BM25Okapi:
    tokenized = [c["text"].lower().split() for c in chunks]
    return BM25Okapi(tokenized)

def hybrid_search(
    query: str,
    query_embedding: list[float],
    chunks: list[dict],
    bm25_index: BM25Okapi,
    alpha: float = 0.5  # weight: 0=BM25 only, 1=vector only
) -> list[dict]:
    # BM25 scores
    bm25_scores = bm25_index.get_scores(query.lower().split())
    bm25_scores = (bm25_scores - bm25_scores.min()) / (bm25_scores.max() + 1e-9)

    # Vector similarity scores (from chromadb distances, convert to similarity)
    # Combine: hybrid_score = alpha * vector_score + (1-alpha) * bm25_score
    # Return re-sorted chunks
    ...
```

### Transcript Denoising

Auto-generated YouTube transcripts have common issues:
- No punctuation
- Run-on sentences
- Filler words ("um", "uh", "like")

Simple cleanup before chunking:

```python
import re

FILLER_WORDS = re.compile(r'\b(um|uh|like|you know|i mean|basically|literally)\b', re.IGNORECASE)

def clean_transcript_text(text: str) -> str:
    text = FILLER_WORDS.sub('', text)          # Remove fillers
    text = re.sub(r'\s+', ' ', text).strip()   # Normalize whitespace
    return text
```

Apply in `transcript_service.py`:
```python
for seg in segments:
    seg["text"] = clean_transcript_text(seg["text"])
```

---

## Performance Benchmarks (Expected)

| Operation | Expected Time |
|---|---|
| Ingest 10-video playlist | ~30–60 seconds |
| Ingest 100-video playlist | ~5–10 minutes |
| Single question answer | ~2–4 seconds |
| ChromaDB query (1000 chunks) | <100ms |
| OpenAI embedding (single) | ~200ms |
| Claude answer generation | ~1–2 seconds |

---

## Scaling Considerations

| Concern | Solution |
|---|---|
| Ingestion too slow | Background tasks → Celery + Redis |
| Too many playlists | PostgreSQL + pgvector instead of SQLite + Chroma |
| Answer quality low | Add re-ranking, increase top_k, clean transcripts |
| YouTube quota limits | Cache video metadata, batch API calls |
| Multi-user support | Add user authentication, scope playlists per user |

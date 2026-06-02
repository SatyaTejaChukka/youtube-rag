# Free Stack Implementation

Drop-in replacements for the three paid services. All other files (`chunker.py`, `vector_store.py`, `metadata_store.py`, `retriever.py`, routers, frontend) remain identical.

---

## Updated config.py

```python
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # LLM provider — "groq" or "ollama"
    llm_provider: Literal["groq", "ollama"] = "groq"

    # Groq (used when llm_provider = "groq")
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    # Ollama (used when llm_provider = "ollama")
    ollama_model: str = "llama3.2"
    ollama_base_url: str = "http://localhost:11434"

    # Local embeddings — no key needed
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384  # must match the model above

    # App
    frontend_url: str = "http://localhost:5173"
    chroma_persist_dir: str = "./chroma_db"
    sqlite_db_path: str = "./app.db"

    # Chunking
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 50
    retrieval_top_k: int = 8

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Replacement 1 — youtube_service.py (yt-dlp version)

Replaces the Google API client entirely. Handles playlist URLs, channel URLs (`@handle`, `/channel/UCxxx`), and even single video URLs.

```python
import yt_dlp
import asyncio
from functools import partial

# ── yt-dlp options ────────────────────────────────────────────────────────
BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extract_flat': True,    # Metadata only — never downloads video files
}

def _run_ydl(url: str, opts: dict) -> dict:
    """Synchronous yt-dlp call — wrapped for async use."""
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)

async def _extract(url: str, opts: dict) -> dict:
    """Run yt-dlp in a thread so it doesn't block the async event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_run_ydl, url, opts))

# ── Public API ─────────────────────────────────────────────────────────────

async def resolve_playlist_id(playlist_url: str) -> list[str]:
    """
    Returns all video IDs from a playlist or channel URL.

    Accepts:
      - https://youtube.com/playlist?list=PLxxx
      - https://youtube.com/@ChannelHandle
      - https://youtube.com/@ChannelHandle/videos
      - https://youtube.com/channel/UCxxx
    """
    info = await _extract(playlist_url, BASE_OPTS)

    entries = info.get("entries", [])
    if not entries:
        raise ValueError("No videos found at the provided URL. Is it a public playlist or channel?")

    # Filter out None entries (deleted/private videos yt-dlp can't access)
    video_ids = [e["id"] for e in entries if e and e.get("id")]
    return video_ids

async def fetch_playlist_metadata(playlist_url: str) -> dict:
    """
    Returns playlist-level metadata: title, uploader, webpage_url.
    """
    info = await _extract(playlist_url, BASE_OPTS)
    return {
        "title":         info.get("title", "Untitled Playlist"),
        "channel_id":    info.get("channel_id", ""),
        "channel_title": info.get("uploader", info.get("channel", "")),
        "url":           info.get("webpage_url", playlist_url),
        "video_count":   len(info.get("entries", [])),
    }

async def fetch_video_metadata(video_id: str) -> dict:
    """
    Returns per-video metadata: title, description, thumbnail, duration.

    yt-dlp fetches this without needing the YouTube Data API.
    The 'flat' extract gives us title and thumbnail from the playlist;
    we only call this for the full description and exact duration.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    opts = {**BASE_OPTS, 'extract_flat': False}  # Full info for single video

    try:
        info = await _extract(url, opts)
        # Get best thumbnail
        thumbnails = info.get("thumbnails", [])
        thumb_url = ""
        if thumbnails:
            # yt-dlp returns thumbnails sorted by preference; take the last (best)
            thumb_url = thumbnails[-1].get("url", "")

        # Fallback to standard thumbnail URL pattern
        if not thumb_url:
            thumb_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

        return {
            "title":        info.get("title", ""),
            "description":  info.get("description", "")[:2000],  # Trim long descriptions
            "published_at": info.get("upload_date", ""),         # YYYYMMDD format
            "thumbnail_url": thumb_url,
            "duration_secs": int(info.get("duration", 0) or 0),
        }

    except Exception as e:
        print(f"[WARN] Could not fetch full metadata for {video_id}: {e}")
        # Fallback: minimal metadata from the thumbnail URL pattern
        return {
            "title":        video_id,
            "description":  "",
            "published_at": "",
            "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "duration_secs": 0,
        }

def extract_playlist_id_from_url(url: str) -> str:
    """
    For SQLite storage — extract a stable identifier from any YouTube URL.
    For playlists: the PLxxx ID.
    For channels: the @handle or UCxxx.
    """
    import re

    # Playlist URL
    m = re.search(r"[?&]list=([A-Za-z0-9_-]+)", url)
    if m:
        return m.group(1)

    # @handle
    m = re.search(r"youtube\.com/@([A-Za-z0-9_.-]+)", url)
    if m:
        return f"@{m.group(1)}"

    # /channel/UCxxx
    m = re.search(r"youtube\.com/channel/([A-Za-z0-9_-]+)", url)
    if m:
        return m.group(1)

    # Last resort: hash the URL
    import hashlib
    return hashlib.md5(url.encode()).hexdigest()[:12]
```

### Notes on yt-dlp behavior
- `extract_flat=True` is fast — it gets video IDs from the playlist page without loading each video page.
- `extract_flat=False` on a single video loads the full video info page. Use sparingly — only for the detailed `fetch_video_metadata` call.
- For channels, yt-dlp automatically follows `@handle/videos` to the uploads playlist.
- For very large channels (1000+ videos), yt-dlp handles pagination automatically.

---

## Replacement 2 — embedder.py (sentence-transformers version)

Runs fully locally. The model is downloaded from HuggingFace on first run (~130MB) and cached permanently.

```python
import asyncio
import numpy as np
from functools import partial
from sentence_transformers import SentenceTransformer
from app.config import settings

# ── Singleton model ────────────────────────────────────────────────────────
# Loaded once when the module is first imported.
# This avoids reloading the model on every request.
_model: SentenceTransformer | None = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"[INFO] Loading embedding model: {settings.embedding_model}")
        _model = SentenceTransformer(settings.embedding_model)
        print(f"[INFO] Embedding model loaded. Dim: {_model.get_sentence_embedding_dimension()}")
    return _model

# ── Embedding functions ────────────────────────────────────────────────────

def _encode_sync(texts: list[str]) -> list[list[float]]:
    """
    Synchronous encode call.
    sentence-transformers is CPU-bound — we run it in an executor
    so it doesn't block FastAPI's async event loop.

    normalize_embeddings=True is important for BAAI/bge models —
    it improves cosine similarity accuracy.
    """
    model = get_model()
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,          # Process 32 texts at a time
        show_progress_bar=False,
    )
    return vectors.tolist()

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of strings. Returns list of float arrays.
    Runs in a thread pool to avoid blocking the event loop.
    """
    if not texts:
        return []
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_encode_sync, texts))

async def embed_text(text: str) -> list[float]:
    """Embed a single string. Returns a float array."""
    results = await embed_texts([text])
    return results[0]
```

### BGE model query prefix (important for quality)
The `BAAI/bge-*` family of models gets better retrieval quality when you prefix the **query** (not the documents) with `"Represent this sentence for searching relevant passages: "`.

This is handled automatically by the newer versions of sentence-transformers via `prompt_name="query"`, but to be safe, update `ask.py`:

```python
# In routers/ask.py — update the embed call:
question_embedding = await embed_text(
    f"Represent this sentence for searching relevant passages: {request.question}"
)
```

Documents (transcript chunks) are embedded as-is — no prefix needed.

---

## Replacement 3A — answer_generator.py (Groq version)

```python
from groq import AsyncGroq
from app.config import settings
from app.models.api_models import SourceReference

client = AsyncGroq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided YouTube video transcript excerpts.

Rules:
1. Answer only using information present in the provided excerpts.
2. If the answer cannot be found in the excerpts, say exactly: "I couldn't find relevant information about this in the indexed videos."
3. Be concise and clear — 3 to 6 sentences is ideal.
4. Do not speculate or add information from your general training knowledge.
5. When referencing information, you may naturally cite the video title or timestamp if it adds clarity.
"""

def format_context(chunks: list[dict]) -> str:
    lines = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        lines.append(
            f"[Excerpt {i}]\n"
            f"Video: {meta['video_title']}\n"
            f"Timestamp: {meta['timestamp_label']} ({int(meta['start_seconds'])}s)\n"
            f"Content: {chunk['text']}\n"
        )
    return "\n---\n".join(lines)

def build_source_references(chunks: list[dict]) -> list[SourceReference]:
    sources = []
    for chunk in chunks:
        meta = chunk["metadata"]
        snippet = chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"]
        sources.append(SourceReference(
            video_id=meta["video_id"],
            video_title=meta["video_title"],
            start_seconds=int(meta["start_seconds"]),
            timestamp_label=meta["timestamp_label"],
            snippet=snippet,
            youtube_url=meta["youtube_url"],
            thumbnail_url=meta.get("thumbnail_url"),
        ))
    return sources

async def generate_answer(question: str, chunks: list[dict]) -> dict:
    if not chunks:
        return {
            "answer": "I couldn't find relevant information about this in the indexed videos.",
            "sources": []
        }

    context = format_context(chunks)
    user_message = f"""Here are the relevant transcript excerpts from the YouTube videos:

{context}

Question: {question}

Please answer based only on the excerpts above."""

    response = await client.chat.completions.create(
        model=settings.groq_model,
        max_tokens=1024,
        temperature=0.3,           # Lower temperature = more faithful to context
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ]
    )

    answer_text = response.choices[0].message.content
    sources = build_source_references(chunks)

    return {"answer": answer_text, "sources": sources}
```

---

## Replacement 3B — answer_generator.py (Ollama version)

Use this version instead of 3A if `LLM_PROVIDER=ollama` in your `.env`.

```python
import ollama
import asyncio
from functools import partial
from app.config import settings
from app.models.api_models import SourceReference

# Reuse the same helpers from above
SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided YouTube video transcript excerpts.

Rules:
1. Answer only using information present in the provided excerpts.
2. If the answer cannot be found in the excerpts, say exactly: "I couldn't find relevant information about this in the indexed videos."
3. Be concise and clear — 3 to 6 sentences is ideal.
4. Do not speculate or add information from your general training knowledge.
"""

def format_context(chunks: list[dict]) -> str:
    lines = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        lines.append(
            f"[Excerpt {i}]\n"
            f"Video: {meta['video_title']}\n"
            f"Timestamp: {meta['timestamp_label']} ({int(meta['start_seconds'])}s)\n"
            f"Content: {chunk['text']}\n"
        )
    return "\n---\n".join(lines)

def build_source_references(chunks: list[dict]) -> list[SourceReference]:
    sources = []
    for chunk in chunks:
        meta = chunk["metadata"]
        snippet = chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"]
        sources.append(SourceReference(
            video_id=meta["video_id"],
            video_title=meta["video_title"],
            start_seconds=int(meta["start_seconds"]),
            timestamp_label=meta["timestamp_label"],
            snippet=snippet,
            youtube_url=meta["youtube_url"],
            thumbnail_url=meta.get("thumbnail_url"),
        ))
    return sources

def _ollama_chat_sync(model: str, system: str, user: str) -> str:
    """Synchronous ollama call — run in executor from async context."""
    response = ollama.chat(
        model=model,
        options={"temperature": 0.3, "num_predict": 1024},
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ]
    )
    return response["message"]["content"]

async def generate_answer(question: str, chunks: list[dict]) -> dict:
    if not chunks:
        return {
            "answer": "I couldn't find relevant information about this in the indexed videos.",
            "sources": []
        }

    context = format_context(chunks)
    user_message = f"""Here are the relevant transcript excerpts from the YouTube videos:

{context}

Question: {question}

Please answer based only on the excerpts above."""

    loop = asyncio.get_event_loop()
    answer_text = await loop.run_in_executor(
        None,
        partial(_ollama_chat_sync, settings.ollama_model, SYSTEM_PROMPT, user_message)
    )

    sources = build_source_references(chunks)
    return {"answer": answer_text, "sources": sources}
```

---

## Provider Switch — answer_generator.py (Auto-Select)

If you want one file that reads `LLM_PROVIDER` from config and switches automatically:

```python
# app/services/answer_generator.py
from app.config import settings

if settings.llm_provider == "groq":
    from app.services._answer_groq import generate_answer, build_source_references
elif settings.llm_provider == "ollama":
    from app.services._answer_ollama import generate_answer, build_source_references
else:
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}. Must be 'groq' or 'ollama'.")

__all__ = ["generate_answer", "build_source_references"]
```

Save the Groq version as `_answer_groq.py` and Ollama as `_answer_ollama.py`.

---

## Updated ingest.py Router (yt-dlp version)

The only change here is calling `extract_playlist_id_from_url` instead of parsing the URL with regex:

```python
from app.services.youtube_service import (
    extract_playlist_id_from_url,
    resolve_playlist_id,
    fetch_playlist_metadata,
    fetch_video_metadata,
)

@router.post("/", response_model=IngestResponse)
async def ingest_playlist(request: IngestRequest):
    url = request.url.strip()

    # Derive a stable ID for this source (playlist ID, @handle, or channel ID)
    source_id = extract_playlist_id_from_url(url)

    # Fetch playlist/channel metadata via yt-dlp
    try:
        playlist_meta = await fetch_playlist_metadata(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not access URL: {e}")

    await save_playlist(source_id, playlist_meta, url)

    # Get all video IDs
    try:
        video_ids = await resolve_playlist_id(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    indexed = 0
    skipped = []

    for video_id in video_ids:
        try:
            video_meta = await fetch_video_metadata(video_id)
            segments = await fetch_transcript(video_id)

            if not segments:
                skipped.append(video_id)
                await save_video(video_id, source_id, video_meta, transcript_available=False)
                continue

            chunks = chunk_transcript(segments, video_id, source_id, video_meta)
            texts = [c["text"] for c in chunks]
            embeddings = await embed_texts(texts)

            await upsert_chunks(chunks, embeddings)
            await save_video(video_id, source_id, video_meta, transcript_available=True, chunk_count=len(chunks))
            await save_chunks(chunks)

            indexed += 1

        except Exception as e:
            print(f"[WARN] Failed to process video {video_id}: {e}")
            skipped.append(video_id)

    return IngestResponse(
        playlist_id=source_id,
        playlist_title=playlist_meta["title"],
        videos_indexed=indexed,
        videos_skipped=len(skipped),
        skipped_video_ids=skipped,
        status="complete" if not skipped else "partial",
    )
```

---

## Full .env.example for Free Stack

```env
# ────────────────────────────────────────────────
# TubeRAG Free Stack — Environment Variables
# Copy to .env and fill in the values
# ────────────────────────────────────────────────

# LLM provider: "groq" or "ollama"
LLM_PROVIDER=groq

# ── Groq (if LLM_PROVIDER=groq) ──────────────
# Free account: https://console.groq.com
# No credit card required
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant

# ── Ollama (if LLM_PROVIDER=ollama) ──────────
# Install: https://ollama.com/download
# Then run: ollama pull llama3.2
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434

# ── Embeddings (local, no key needed) ────────
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIM=384

# ── App ──────────────────────────────────────
FRONTEND_URL=http://localhost:5173
CHROMA_PERSIST_DIR=./chroma_db
SQLITE_DB_PATH=./app.db

# Chunking
CHUNK_SIZE_TOKENS=500
CHUNK_OVERLAP_TOKENS=50
RETRIEVAL_TOP_K=8
```

---

## First-Time Setup Checklist (Free Stack)

### If using Groq:
- [ ] Sign up at https://console.groq.com (free, no credit card)
- [ ] Create an API key
- [ ] Add `GROQ_API_KEY=gsk_...` to `.env`
- [ ] Set `LLM_PROVIDER=groq` in `.env`
- [ ] Run `pip install -r requirements.txt`
- [ ] Start backend: `python run.py`
- [ ] First request will download the embedding model (~130MB) — takes 30–60s once

### If using Ollama:
- [ ] Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
- [ ] Pull a model: `ollama pull llama3.2`
- [ ] Start Ollama: `ollama serve` (keep this terminal open)
- [ ] Set `LLM_PROVIDER=ollama` in `.env`
- [ ] Set `OLLAMA_MODEL=llama3.2` in `.env`
- [ ] Run `pip install -r requirements.txt`
- [ ] Start backend: `python run.py`

### Both paths:
- [ ] **No YouTube API key needed** — yt-dlp handles it
- [ ] **No OpenAI key needed** — embeddings run locally
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open http://localhost:5173

---

## Troubleshooting

### "yt-dlp fails on my playlist URL"
- Make sure the playlist is public (not unlisted or private)
- Update yt-dlp: `pip install -U yt-dlp`
- Try pasting the URL directly in a browser first to confirm it's accessible

### "Embedding model download fails"
- You need internet for the first download
- If behind a proxy, set `HF_HUB_OFFLINE=1` after downloading once
- Alternative: use `all-MiniLM-L6-v2` which is smaller and widely mirrored

### "Ollama response is very slow"
- This is normal on CPU — expect 5–30s per response depending on machine
- On Apple Silicon Macs (M1/M2/M3), Ollama uses the Neural Engine and is much faster
- On Linux with NVIDIA GPU, Ollama auto-detects CUDA

### "Groq rate limit hit"
- Switch to `mixtral-8x7b-32768` which has a separate quota
- Or add a brief `asyncio.sleep(1)` between questions

### "ChromaDB dimension mismatch error"
- This happens if you previously used the paid stack (OpenAI, 1536 dims)
- Delete the `chroma_db/` folder entirely: `rm -rf ./chroma_db`
- Re-ingest your playlists — they'll be stored with 384 dims

### "sentence-transformers import is slow"
- The first import takes a few seconds as PyTorch loads
- Subsequent imports are instant (model stays in memory while the server runs)

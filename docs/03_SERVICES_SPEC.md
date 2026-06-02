# Services Implementation Specification

All services live in `backend/app/services/`. This document gives the complete implementation for each service.

---

## youtube_service.py

```python
from googleapiclient.discovery import build
from app.config import settings

def get_youtube_client():
    return build("youtube", "v3", developerKey=settings.youtube_api_key)

async def resolve_playlist_id(playlist_id: str) -> list[str]:
    """
    Returns all video IDs in a playlist, handling pagination.
    """
    youtube = get_youtube_client()
    video_ids = []
    next_page_token = None

    while True:
        response = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page_token
        ).execute()

        for item in response.get("items", []):
            vid = item["contentDetails"]["videoId"]
            video_ids.append(vid)

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return video_ids

async def fetch_playlist_metadata(playlist_id: str) -> dict:
    """
    Returns title, channel info for a playlist.
    """
    youtube = get_youtube_client()
    response = youtube.playlists().list(
        part="snippet",
        id=playlist_id
    ).execute()

    items = response.get("items", [])
    if not items:
        raise ValueError(f"Playlist {playlist_id} not found")

    snippet = items[0]["snippet"]
    return {
        "title": snippet["title"],
        "channel_id": snippet["channelId"],
        "channel_title": snippet["channelTitle"],
    }

async def fetch_video_metadata(video_id: str) -> dict:
    """
    Returns title, description, thumbnail, published date, duration for a video.
    Duration comes from contentDetails in ISO 8601 format — convert to seconds.
    """
    youtube = get_youtube_client()
    response = youtube.videos().list(
        part="snippet,contentDetails",
        id=video_id
    ).execute()

    items = response.get("items", [])
    if not items:
        return {}

    snippet = items[0]["snippet"]
    content_details = items[0]["contentDetails"]

    # Get best available thumbnail
    thumbs = snippet.get("thumbnails", {})
    thumb_url = (
        thumbs.get("high", {}).get("url")
        or thumbs.get("medium", {}).get("url")
        or thumbs.get("default", {}).get("url")
        or ""
    )

    return {
        "title": snippet["title"],
        "description": snippet.get("description", ""),
        "published_at": snippet.get("publishedAt", ""),
        "thumbnail_url": thumb_url,
        "duration_iso": content_details.get("duration", ""),
    }

async def resolve_channel_uploads_playlist(channel_url: str) -> str:
    """
    Phase 2: Resolves a channel URL to its uploads playlist ID.
    Channel uploads playlist ID = "UU" + channel_id[2:]
    """
    youtube = get_youtube_client()
    # Handle @handle style URLs
    if "@" in channel_url:
        handle = channel_url.split("@")[-1].split("/")[0]
        response = youtube.channels().list(
            part="contentDetails",
            forHandle=handle
        ).execute()
    else:
        # Fall back to direct channel ID lookup
        channel_id = channel_url.split("/")[-1]
        response = youtube.channels().list(
            part="contentDetails",
            id=channel_id
        ).execute()

    items = response.get("items", [])
    if not items:
        raise ValueError("Channel not found")

    uploads_playlist_id = (
        items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
    )
    return uploads_playlist_id
```

---

## transcript_service.py

```python
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

async def fetch_transcript(video_id: str) -> list[dict] | None:
    """
    Fetches transcript segments for a video.
    Returns list of { text, start, duration } or None if unavailable.

    Tries English first, then auto-generated English.
    """
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Prefer manually created English transcript
        try:
            transcript = transcript_list.find_manually_created_transcript(["en"])
        except Exception:
            # Fall back to auto-generated
            transcript = transcript_list.find_generated_transcript(["en"])

        segments = transcript.fetch()
        # Each segment: { text: str, start: float, duration: float }
        return segments

    except (NoTranscriptFound, TranscriptsDisabled):
        return None
    except Exception as e:
        print(f"[WARN] Transcript fetch failed for {video_id}: {e}")
        return None
```

---

## chunker.py

```python
import tiktoken
from app.config import settings

# Use cl100k_base tokenizer (same as OpenAI embedding models)
tokenizer = tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text))

def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM:SS or HH:MM:SS label."""
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def chunk_transcript(
    segments: list[dict],
    video_id: str,
    playlist_id: str,
    video_meta: dict,
    chunk_size: int = None,
    overlap_tokens: int = None,
) -> list[dict]:
    """
    Splits a list of transcript segments into overlapping text chunks.
    Each chunk preserves start_seconds and end_seconds.

    Returns list of chunk dicts ready to be embedded and stored.
    """
    chunk_size = chunk_size or settings.chunk_size_tokens
    overlap_tokens = overlap_tokens or settings.chunk_overlap_tokens

    chunks = []
    buffer_segments = []
    buffer_tokens = 0
    chunk_index = 0

    for seg in segments:
        seg_text = seg["text"].strip().replace("\n", " ")
        seg_tokens = count_tokens(seg_text)

        if buffer_tokens + seg_tokens > chunk_size and buffer_segments:
            # Flush current buffer as a chunk
            chunk = _make_chunk(
                buffer_segments, chunk_index, video_id, playlist_id, video_meta
            )
            chunks.append(chunk)
            chunk_index += 1

            # Keep overlap: drop segments from front until under overlap limit
            while buffer_segments and buffer_tokens > overlap_tokens:
                dropped = buffer_segments.pop(0)
                buffer_tokens -= count_tokens(dropped["text"])

        buffer_segments.append(seg)
        buffer_tokens += seg_tokens

    # Flush remaining segments
    if buffer_segments:
        chunk = _make_chunk(
            buffer_segments, chunk_index, video_id, playlist_id, video_meta
        )
        chunks.append(chunk)

    return chunks

def _make_chunk(
    segments: list[dict],
    chunk_index: int,
    video_id: str,
    playlist_id: str,
    video_meta: dict,
) -> dict:
    text = " ".join(s["text"].strip() for s in segments)
    start_seconds = segments[0]["start"]
    end_seconds = segments[-1]["start"] + segments[-1].get("duration", 0)
    youtube_url = f"https://www.youtube.com/watch?v={video_id}&t={int(start_seconds)}s"
    chunk_id = f"{playlist_id}_{video_id}_{chunk_index:04d}"

    return {
        "id": chunk_id,
        "video_id": video_id,
        "playlist_id": playlist_id,
        "chunk_index": chunk_index,
        "text": text,
        "start_seconds": start_seconds,
        "end_seconds": end_seconds,
        "timestamp_label": format_timestamp(start_seconds),
        "youtube_url": youtube_url,
        "video_title": video_meta.get("title", ""),
        "thumbnail_url": video_meta.get("thumbnail_url", ""),
        "published_at": video_meta.get("published_at", ""),
    }
```

---

## embedder.py

```python
from openai import AsyncOpenAI
from app.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

async def embed_text(text: str) -> list[float]:
    """Embed a single string. Returns a 1536-dim float list."""
    response = await client.embeddings.create(
        input=text,
        model=settings.embedding_model
    )
    return response.data[0].embedding

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of strings in one API call (batched).
    OpenAI supports up to 2048 inputs per call.
    """
    if not texts:
        return []

    # Batch in groups of 100 to be safe
    all_embeddings = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i+100]
        response = await client.embeddings.create(
            input=batch,
            model=settings.embedding_model
        )
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings
```

---

## vector_store.py

```python
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings

# Singleton client
_client = None
_collection = None

def get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        _collection = _client.get_or_create_collection(
            name="youtube_chunks",
            metadata={"hnsw:space": "cosine"}
        )
    return _collection

async def upsert_chunks(chunks: list[dict], embeddings: list[list[float]]):
    """
    Upsert chunks and their embeddings into ChromaDB.
    """
    collection = get_collection()

    ids = [c["id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "playlist_id": c["playlist_id"],
            "video_id": c["video_id"],
            "video_title": c["video_title"],
            "start_seconds": c["start_seconds"],
            "end_seconds": c["end_seconds"],
            "timestamp_label": c["timestamp_label"],
            "youtube_url": c["youtube_url"],
            "thumbnail_url": c["thumbnail_url"],
            "published_at": c["published_at"],
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

async def query_chunks(
    query_embedding: list[float],
    playlist_id: str,
    top_k: int = 8
) -> list[dict]:
    """
    Query ChromaDB for top-K chunks matching query_embedding,
    filtered to a specific playlist.
    """
    collection = get_collection()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"playlist_id": playlist_id},
        include=["documents", "metadatas", "distances"]
    )

    chunks = []
    for i in range(len(results["ids"][0])):
        chunks.append({
            "id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })

    return chunks

async def delete_by_playlist(playlist_id: str):
    """Remove all chunks for a given playlist from ChromaDB."""
    collection = get_collection()
    collection.delete(where={"playlist_id": playlist_id})
```

---

## retriever.py

```python
from app.services.vector_store import query_chunks

async def retrieve_chunks(
    query_embedding: list[float],
    playlist_id: str,
    top_k: int = 8
) -> list[dict]:
    """
    Retrieves top-K relevant chunks from ChromaDB.
    Deduplicates chunks from the same video that are very close together.
    """
    raw_chunks = await query_chunks(query_embedding, playlist_id, top_k=top_k * 2)

    # Deduplicate: if two chunks from same video are within 30s of each other,
    # keep only the one with lower distance (higher similarity)
    deduplicated = []
    seen = []  # list of (video_id, start_seconds)

    for chunk in raw_chunks:
        meta = chunk["metadata"]
        vid = meta["video_id"]
        start = meta["start_seconds"]

        too_close = any(
            v == vid and abs(s - start) < 30
            for v, s in seen
        )

        if not too_close:
            deduplicated.append(chunk)
            seen.append((vid, start))

        if len(deduplicated) >= top_k:
            break

    return deduplicated
```

---

## answer_generator.py

```python
import anthropic
from app.config import settings
from app.models.api_models import SourceReference

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided YouTube video transcript excerpts.

Rules:
1. Only answer using the information present in the provided excerpts.
2. If the answer cannot be found in the excerpts, say: "I couldn't find relevant information about this in the indexed videos."
3. Be concise and clear — 3 to 6 sentences is ideal.
4. Do not speculate or add information from general knowledge.
5. When citing information, refer to the video title or timestamp naturally in your answer if it adds clarity.
"""

def format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a context block for the prompt."""
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
    """Convert retrieved chunks to SourceReference objects for the response."""
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
    """
    Generates a grounded answer using Claude with retrieved chunks as context.
    Returns { answer: str, sources: list[SourceReference] }
    """
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

    response = await client.messages.create(
        model=settings.llm_model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )

    answer_text = response.content[0].text
    sources = build_source_references(chunks)

    return {
        "answer": answer_text,
        "sources": sources
    }
```

---

## metadata_store.py

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import Playlist, Video, Chunk
from app.services.vector_store import delete_by_playlist
from datetime import datetime

async def save_playlist(db: AsyncSession, playlist_id: str, meta: dict, url: str):
    playlist = Playlist(
        id=playlist_id,
        title=meta["title"],
        channel_id=meta.get("channel_id"),
        channel_title=meta.get("channel_title"),
        url=url,
        status="indexing"
    )
    await db.merge(playlist)
    await db.commit()

async def save_video(
    db: AsyncSession,
    video_id: str,
    playlist_id: str,
    meta: dict,
    transcript_available: bool,
    chunk_count: int = 0
):
    video = Video(
        id=video_id,
        playlist_id=playlist_id,
        title=meta.get("title", ""),
        description=meta.get("description", ""),
        published_at=meta.get("published_at", ""),
        thumbnail_url=meta.get("thumbnail_url", ""),
        transcript_available=transcript_available,
        chunk_count=chunk_count,
        indexed_at=datetime.utcnow() if transcript_available else None
    )
    await db.merge(video)
    await db.commit()

async def save_chunks(db: AsyncSession, chunks: list[dict]):
    for c in chunks:
        chunk = Chunk(
            id=c["id"],
            video_id=c["video_id"],
            playlist_id=c["playlist_id"],
            chunk_index=c["chunk_index"],
            start_seconds=c["start_seconds"],
            end_seconds=c["end_seconds"],
            text=c["text"],
            youtube_url=c["youtube_url"],
        )
        await db.merge(chunk)
    await db.commit()

async def get_playlist_with_videos(db: AsyncSession, playlist_id: str):
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()
    if not playlist:
        return None

    videos_result = await db.execute(
        select(Video).where(Video.playlist_id == playlist_id)
    )
    videos = videos_result.scalars().all()

    return {
        "playlist_id": playlist.id,
        "title": playlist.title,
        "video_count": len(videos),
        "indexed_at": playlist.indexed_at,
        "videos": [
            {
                "video_id": v.id,
                "title": v.title,
                "thumbnail_url": v.thumbnail_url,
                "published_at": v.published_at,
                "chunk_count": v.chunk_count,
                "transcript_available": v.transcript_available,
            }
            for v in videos
        ]
    }

async def delete_playlist_data(db: AsyncSession, playlist_id: str):
    # Delete from Chroma
    await delete_by_playlist(playlist_id)

    # Delete from SQLite (chunks, videos, playlist)
    chunks_result = await db.execute(select(Chunk).where(Chunk.playlist_id == playlist_id))
    for chunk in chunks_result.scalars().all():
        await db.delete(chunk)

    videos_result = await db.execute(select(Video).where(Video.playlist_id == playlist_id))
    for video in videos_result.scalars().all():
        await db.delete(video)

    playlist_result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = playlist_result.scalar_one_or_none()
    if playlist:
        await db.delete(playlist)

    await db.commit()
```

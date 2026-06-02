# YouTube Channel RAG — Project Overview

## What This Project Does

This project is a **Retrieval-Augmented Generation (RAG) system** scoped to a specific YouTube channel or playlist.

A user pastes a YouTube playlist URL or channel URL. The system fetches all video transcripts, indexes them with timestamps, and lets a user ask natural-language questions. Answers are grounded only in the indexed video content, and each answer includes **clickable reference cards** that link directly to the exact moment in the video where that information was said.

---

## Core User Flow

```
1. User pastes a YouTube Playlist URL or Channel URL
2. System ingests all videos (transcripts + metadata)
3. User types a question
4. System retrieves the most relevant transcript chunks
5. LLM generates an answer strictly from those chunks
6. UI shows the answer + reference video cards
7. Each card shows: video title, timestamp (e.g. 12:43), snippet
8. Clicking the card opens YouTube at exactly that timestamp
```

---

## Product Requirements

### Must-Have (MVP)
- Accept a playlist URL as input
- Extract video IDs from the playlist using YouTube Data API
- Fetch transcripts using `youtube-transcript-api`
- Chunk transcripts, preserve timestamps per chunk
- Embed chunks and store in a vector database
- Accept a user question and return a grounded answer
- Show 3–5 reference video cards per answer
- Each card links to `https://www.youtube.com/watch?v=VIDEO_ID&t=SECONDS`
- If no relevant content found, say so explicitly — no hallucination

### Nice-to-Have (Phase 2+)
- Channel URL support (not just playlists)
- Incremental indexing for new uploads
- Multi-playlist support
- Ingestion progress bar / status polling
- Filter by date range or video title
- Hybrid search (vector + keyword BM25)
- Chapter-level labels parsed from descriptions

### Out of Scope (for now)
- Videos without transcripts (skip them, log a warning)
- Private or age-restricted videos
- Real-time video ingestion (live streams)
- Multi-language transcript support (only English for MVP)

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Vite (TypeScript) | Fast to build, clean component model |
| Backend | FastAPI (Python 3.11+) | Excellent async support, easy Python ecosystem |
| Vector Store | ChromaDB (local) | Simple, no infrastructure setup, good for MVP |
| Metadata Store | SQLite via SQLAlchemy | Lightweight, stores playlist/video metadata |
| Embeddings | OpenAI `text-embedding-3-small` | Fast, cheap, 1536 dimensions |
| LLM | Claude `claude-sonnet-4-20250514` via Anthropic SDK | High quality answers |
| YouTube Metadata | YouTube Data API v3 | Official API for playlist items and video details |
| Transcripts | `youtube-transcript-api` (Python) | Returns timestamped transcript segments |
| Task Queue | FastAPI BackgroundTasks (MVP) | Async ingestion without extra infra |
| Environment | `.env` file + `python-dotenv` | Secrets management |

---

## Build Phases

### Phase 1 — MVP (Build This First)
- Single playlist ingestion
- Question answering with timestamped references
- Simple React UI

### Phase 2 — Channel Support
- Channel URL → resolve uploads playlist
- Incremental sync (skip already-indexed videos)
- Filter UI

### Phase 3 — Production Hardening
- Background job queue (Celery or ARQ)
- PostgreSQL + pgvector instead of SQLite + Chroma
- Re-ranking with a cross-encoder
- Transcript denoising

---

## Key External APIs

### YouTube Data API v3
- **Purpose:** Get playlist items, video metadata (title, description, duration, thumbnail)
- **Auth:** API key (no OAuth needed for public playlists)
- **Quota:** 10,000 units/day free. A `playlistItems.list` costs 1 unit per call.
- **Docs:** https://developers.google.com/youtube/v3

### youtube-transcript-api (Python)
- **Purpose:** Fetch transcript segments for a given video ID
- **Auth:** No API key needed — uses YouTube's public transcript endpoint
- **Returns:** List of `{ text, start, duration }` objects
- **Install:** `pip install youtube-transcript-api`

---

## Environment Variables Required

```env
# YouTube
YOUTUBE_API_KEY=your_youtube_data_api_key

# OpenAI (for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Anthropic (for LLM answer generation)
ANTHROPIC_API_KEY=your_anthropic_api_key

# App
FRONTEND_URL=http://localhost:5173
CHROMA_PERSIST_DIR=./chroma_db
SQLITE_DB_PATH=./app.db
```

---

## Naming Suggestions
- **TubeRAG** — YouTube RAG assistant
- **ChannelMind** — Ask your channel anything
- **PlaylistQA** — Simple and descriptive

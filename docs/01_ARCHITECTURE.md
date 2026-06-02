# System Architecture

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │ Ingest Panel │   │   Chat / Q&A UI  │   │ Reference Cards│  │
│  │ (paste URL)  │   │ (ask questions)  │   │ (timestamped)  │  │
│  └──────┬───────┘   └────────┬─────────┘   └───────▲────────┘  │
└─────────┼────────────────────┼─────────────────────┼───────────┘
          │ POST /api/ingest   │ POST /api/ask        │ answer + sources
          ▼                    ▼                      │
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   INGESTION PIPELINE                    │   │
│  │                                                         │   │
│  │  YouTube Data API  →  video IDs + metadata              │   │
│  │         ↓                                               │   │
│  │  youtube-transcript-api  →  raw transcript segments     │   │
│  │         ↓                                               │   │
│  │  Chunker  →  timestamped text chunks (~500 tokens each) │   │
│  │         ↓                                               │   │
│  │  OpenAI Embeddings  →  1536-dim vectors                 │   │
│  │         ↓                           ↓                   │   │
│  │  ChromaDB (vectors)         SQLite (metadata)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   RETRIEVAL PIPELINE                    │   │
│  │                                                         │   │
│  │  User Question  →  OpenAI Embed  →  ChromaDB Query      │   │
│  │         ↓                                               │   │
│  │  Top-K chunks retrieved (with metadata + timestamps)    │   │
│  │         ↓                                               │   │
│  │  Build prompt with chunks as context                    │   │
│  │         ↓                                               │   │
│  │  Claude Sonnet  →  grounded answer                      │   │
│  │         ↓                                               │   │
│  │  Return: answer text + source chunks                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌─────────────┐              ┌────────────────┐
   │  ChromaDB   │              │  SQLite DB     │
   │  (vectors)  │              │  (metadata)    │
   └─────────────┘              └────────────────┘
```

---

## Component Responsibilities

### Frontend

| Component | Responsibility |
|---|---|
| `IngestPanel` | Input field for playlist/channel URL, submit button, progress indicator |
| `ChatWindow` | Message thread, input box for questions |
| `MessageBubble` | Renders user message or assistant answer |
| `SourceCard` | Shows video thumbnail, title, timestamp, snippet — links to YouTube |
| `IndexedVideos` | Optional sidebar listing all indexed videos in the current playlist |

### Backend — Routers

| Router | Prefix | Endpoints |
|---|---|---|
| `ingest.py` | `/api/ingest` | `POST /` — trigger ingestion; `GET /status/{job_id}` — poll status |
| `ask.py` | `/api/ask` | `POST /` — ask a question, returns answer + sources |
| `sources.py` | `/api/sources` | `GET /{playlist_id}` — list indexed videos; `DELETE /{playlist_id}` — remove |
| `health.py` | `/api` | `GET /health` — liveness check |

### Backend — Services

| Service | Responsibility |
|---|---|
| `youtube_service.py` | Calls YouTube Data API, extracts video IDs and metadata from playlist or channel |
| `transcript_service.py` | Fetches raw transcripts using youtube-transcript-api |
| `chunker.py` | Splits transcript into overlapping chunks with timestamp tracking |
| `embedder.py` | Calls OpenAI embeddings API, returns vectors |
| `vector_store.py` | Wraps ChromaDB: upsert chunks, query by vector |
| `metadata_store.py` | Wraps SQLite: store and query playlist/video/chunk metadata |
| `retriever.py` | Combines vector search + metadata filtering, returns top-K chunks |
| `answer_generator.py` | Builds prompt from retrieved chunks, calls Claude, returns answer + sources |

---

## Data Flow — Ingestion

```
1. Frontend: POST /api/ingest { "url": "https://youtube.com/playlist?list=PLxxx" }

2. Backend extracts playlist_id from URL

3. YouTube Data API → paginate playlistItems.list → collect all video IDs

4. For each video_id:
   a. YouTube Data API → fetch snippet (title, description, thumbnails, publishedAt)
   b. youtube-transcript-api → fetch transcript segments [{text, start, duration}]
   c. If transcript unavailable → log warning, skip video
   d. Chunker → merge segments into chunks of ~500 tokens
      - Each chunk: { text, start_seconds, end_seconds, video_id }
   e. OpenAI Embeddings API → embed each chunk's text
   f. ChromaDB → upsert { id, embedding, metadata }
   g. SQLite → upsert video record and chunk records

5. Mark playlist as indexed in SQLite

6. Return { job_id, status: "complete", videos_indexed: N, videos_skipped: M }
```

---

## Data Flow — Question Answering

```
1. Frontend: POST /api/ask { "question": "...", "playlist_id": "PLxxx" }

2. Backend embeds the question via OpenAI

3. ChromaDB query:
   - Filter by playlist_id in metadata
   - Return top 8 chunks by cosine similarity

4. Deduplicate chunks (same video, overlapping windows)

5. Build Claude prompt:
   - System: "Answer only from the provided transcript excerpts..."
   - Context: top chunks with [Video Title | Timestamp] labels
   - Question: user's question

6. Call Claude claude-sonnet-4-20250514 → get answer text

7. Build source list from retrieved chunks:
   - video_id, video_title, start_seconds, snippet, youtube_url

8. Return:
   {
     "answer": "...",
     "sources": [
       {
         "video_id": "abc123",
         "video_title": "Episode 12: System Design",
         "start_seconds": 763,
         "timestamp_label": "12:43",
         "snippet": "Load balancers distribute traffic...",
         "youtube_url": "https://youtube.com/watch?v=abc123&t=763s",
         "thumbnail_url": "..."
       }
     ]
   }
```

---

## ChromaDB Collection Design

One collection per playlist (or one global collection with playlist_id metadata filter).

**Recommended:** One global collection `youtube_chunks`, filtered by `playlist_id` at query time. Simpler for multi-playlist support.

**Document schema in Chroma:**
```python
{
  "id": "PLxxx_abc123_0042",          # {playlist_id}_{video_id}_{chunk_index}
  "embedding": [...],                  # 1536-dim float array
  "document": "transcript chunk text", # the text that was embedded
  "metadata": {
    "playlist_id": "PLxxx",
    "video_id": "abc123",
    "video_title": "Episode 12: System Design",
    "channel_title": "TechChannel",
    "start_seconds": 763,
    "end_seconds": 812,
    "youtube_url": "https://youtube.com/watch?v=abc123&t=763s",
    "thumbnail_url": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    "chunk_index": 42,
    "published_at": "2024-03-15"
  }
}
```

---

## SQLite Schema Design

```sql
-- Playlists table
CREATE TABLE playlists (
  id          TEXT PRIMARY KEY,       -- YouTube playlist ID e.g. PLxxx
  title       TEXT,
  channel_id  TEXT,
  channel_title TEXT,
  url         TEXT,
  video_count INTEGER,
  indexed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status      TEXT DEFAULT 'pending'  -- pending | indexing | complete | error
);

-- Videos table
CREATE TABLE videos (
  id            TEXT PRIMARY KEY,     -- YouTube video ID
  playlist_id   TEXT REFERENCES playlists(id),
  title         TEXT,
  description   TEXT,
  published_at  TEXT,
  duration_secs INTEGER,
  thumbnail_url TEXT,
  transcript_available BOOLEAN DEFAULT FALSE,
  chunk_count   INTEGER DEFAULT 0,
  indexed_at    TIMESTAMP
);

-- Chunks table (optional — Chroma is source of truth for chunks)
CREATE TABLE chunks (
  id            TEXT PRIMARY KEY,     -- matches Chroma document ID
  video_id      TEXT REFERENCES videos(id),
  playlist_id   TEXT,
  chunk_index   INTEGER,
  start_seconds REAL,
  end_seconds   REAL,
  text          TEXT,
  youtube_url   TEXT
);
```

---

## CORS and API Design

- FastAPI backend runs on `http://localhost:8000`
- React frontend runs on `http://localhost:5173`
- Enable CORS for `http://localhost:5173` in FastAPI middleware
- All API routes prefixed with `/api/`
- API returns JSON only
- HTTP errors use standard status codes: 400 (bad input), 404 (not found), 500 (server error)

---

## Error Handling Strategy

| Scenario | Behavior |
|---|---|
| Video has no transcript | Skip video, continue ingestion, log `video_id` in skipped list |
| YouTube API quota exceeded | Return HTTP 429, message explains quota issue |
| Invalid playlist URL | Return HTTP 400 with validation message |
| Chroma not initialized | Return HTTP 500, log error |
| LLM call fails | Return HTTP 502, do not cache partial answer |
| No relevant chunks found | Return answer = "I couldn't find relevant information in the indexed videos." with empty sources |

# Setup Guide & Step-by-Step Build Order

This document tells an AI agent (or developer) exactly how to set up the environment and build the project in the correct sequence with no ambiguity.

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Google Cloud project with YouTube Data API v3 enabled
- An OpenAI API account (for embeddings)
- An Anthropic API account (for answer generation)

---

## Step 1 — Get API Keys

### YouTube Data API v3
1. Go to https://console.cloud.google.com
2. Create or select a project
3. Go to "APIs & Services" → "Library"
4. Search "YouTube Data API v3" → Enable it
5. Go to "APIs & Services" → "Credentials" → "Create Credentials" → "API Key"
6. Copy the API key. No OAuth needed for public playlists.

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. The embedding model used is `text-embedding-3-small` (cheap, fast)

### Anthropic API Key
1. Go to https://console.anthropic.com
2. Create a new API key

---

## Step 2 — Backend Setup

```bash
# From project root
mkdir youtube-rag && cd youtube-rag
mkdir backend frontend

cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
YOUTUBE_API_KEY=AIza...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:5173
CHROMA_PERSIST_DIR=./chroma_db
SQLITE_DB_PATH=./app.db
```

Create `backend/run.py`:
```python
import uvicorn
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

Start the backend:
```bash
cd backend
python run.py
```

Verify it works:
```bash
curl http://localhost:8000/api/health
# Expected: {"status": "ok"}
```

---

## Step 3 — Frontend Setup

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install axios tailwindcss @tailwindcss/vite
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Build Order for the AI Agent

Implement files in this exact order. Each step should be fully working before moving to the next.

### Phase 1A — Backend Foundation

**Order:**
1. `backend/app/__init__.py` (empty)
2. `backend/app/config.py`
3. `backend/app/models/__init__.py` (empty)
4. `backend/app/models/db_models.py`
5. `backend/app/models/api_models.py`
6. `backend/app/database.py`
7. `backend/app/routers/__init__.py` (empty)
8. `backend/app/routers/health.py`
9. `backend/app/services/__init__.py` (empty)
10. `backend/app/main.py` (register only health router for now)

**Verify:** `curl http://localhost:8000/api/health` returns `{"status": "ok"}`

---

### Phase 1B — Ingestion Services

**Order:**
1. `backend/app/services/youtube_service.py`
2. `backend/app/services/transcript_service.py`
3. `backend/app/services/chunker.py`
4. `backend/app/services/embedder.py`
5. `backend/app/services/vector_store.py`
6. `backend/app/services/metadata_store.py`

**Manual test for chunker** (no API keys needed):
```python
# Run from backend/ directory
from app.services.chunker import chunk_transcript
test_segments = [
    {"text": "Hello world this is a test.", "start": 0.0, "duration": 3.0},
    {"text": "Another segment of text.", "start": 3.0, "duration": 2.0},
]
chunks = chunk_transcript(test_segments, "testvid", "PLtest", {"title": "Test Video", "thumbnail_url": ""})
print(chunks)
```

---

### Phase 1C — Ingest Endpoint

**Order:**
1. `backend/app/routers/ingest.py`
2. Register ingest router in `backend/app/main.py`

**Verify:** Send a real playlist URL:
```bash
curl -X POST http://localhost:8000/api/ingest/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID"}'
```
Expected response:
```json
{
  "playlist_id": "PLxxx",
  "playlist_title": "My Playlist",
  "videos_indexed": 5,
  "videos_skipped": 1,
  "skipped_video_ids": ["abc123"],
  "status": "partial"
}
```

---

### Phase 1D — Ask Endpoint

**Order:**
1. `backend/app/services/retriever.py`
2. `backend/app/services/answer_generator.py`
3. `backend/app/routers/ask.py`
4. Register ask router in `backend/app/main.py`

**Verify:**
```bash
curl -X POST http://localhost:8000/api/ask/ \
  -H "Content-Type: application/json" \
  -d '{"question": "What topics are covered?", "playlist_id": "PLxxx"}'
```
Expected: JSON with `answer` string and `sources` array.

---

### Phase 1E — Sources Endpoint

**Order:**
1. `backend/app/routers/sources.py`
2. Register sources router in `backend/app/main.py`

**Verify:**
```bash
curl http://localhost:8000/api/sources/PLxxx
```

---

### Phase 1F — Frontend

Build frontend components in this order:
1. `src/types/index.ts`
2. `src/api/client.ts`
3. `src/components/SourceCard.tsx`
4. `src/components/SourceList.tsx`
5. `src/components/MessageBubble.tsx`
6. `src/components/IngestPanel.tsx`
7. `src/components/ChatWindow.tsx`
8. `src/components/IndexedVideos.tsx`
9. `src/App.tsx`
10. `src/main.tsx` (update to render App)

---

## Known Gotchas & Fixes

### Issue: `youtube-transcript-api` returns no transcript
- Some videos have transcripts disabled. The code already handles this by skipping.
- If ALL videos are skipped, check that the playlist is public.

### Issue: ChromaDB version conflicts
- Use `chromadb==0.5.0` exactly. Newer versions changed the API.
- If you see `PersistentClient` errors, check the version.

### Issue: YouTube API quota exceeded
- Free quota is 10,000 units/day.
- `playlistItems.list` = 1 unit per call (50 items per call).
- `videos.list` = 1 unit per call (up to 50 video IDs per call — batch them!).
- To batch `videos.list`, join IDs with commas: `id=vid1,vid2,vid3,...`

### Issue: CORS errors in browser
- Make sure `FRONTEND_URL=http://localhost:5173` is in `.env`
- Make sure the vite proxy is set up (see `vite.config.ts`)

### Issue: Large playlists take too long
- For 100+ videos, ingestion can take 5–10 minutes.
- The endpoint is synchronous in MVP — for production, move to BackgroundTasks.
- The frontend should show a loading state during this time.

### Issue: SQLAlchemy async with SQLite
- Use `aiosqlite` driver: `sqlite+aiosqlite:///path`
- Use `AsyncSession` everywhere; never use synchronous session in async routes.

---

## Testing Checklist

After building the full MVP, run through this checklist manually:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Paste a real playlist URL → ingestion completes without crashing
- [ ] Ingestion response shows correct `videos_indexed` count
- [ ] Indexed videos appear in sidebar
- [ ] Asking a question returns a non-empty answer
- [ ] Sources array has at least 1 item
- [ ] Each source card shows thumbnail, title, and timestamp
- [ ] Clicking a source card opens YouTube in a new tab at the correct timestamp
- [ ] Asking about a topic not in the videos returns the "not found" message
- [ ] Ingesting a second playlist works without breaking the first

---

## .gitignore

```
# Python
__pycache__/
*.pyc
venv/
.env
*.db
chroma_db/

# Node
node_modules/
dist/
.env.local

# OS
.DS_Store
```

---

## README.md Template

```markdown
# TubeRAG — Ask Questions About Any YouTube Playlist

Ask natural language questions about any YouTube playlist and get grounded answers with clickable video references that jump to the exact timestamp.

## Features
- 🔍 Semantic search over video transcripts
- 🎯 Answers grounded only in video content
- 🕐 Clickable timestamp references
- 📺 Works with any public YouTube playlist

## Quick Start

### Backend
cd backend && pip install -r requirements.txt
cp .env.example .env    # Fill in your API keys
python run.py

### Frontend
cd frontend && npm install && npm run dev

Open http://localhost:5173
```

# AGENT INSTRUCTIONS — YouTube RAG Project

## How to Use These Documents

You are an AI agent tasked with building the TubeRAG project. This folder contains all the specifications you need. Read this file first, then refer to the other documents as directed.

---

## Document Map

| File | What It Contains | When to Read It |
|---|---|---|
| `00_PROJECT_OVERVIEW.md` | Goals, tech stack, phases, API keys needed | Read first — understand the full picture |
| `01_ARCHITECTURE.md` | System diagrams, data flows, DB schemas, error strategy | Read before writing any code |
| `02_BACKEND_SPEC.md` | Folder structure, requirements.txt, all router code | Follow when building backend |
| `03_SERVICES_SPEC.md` | Complete implementation of all 8 service files | Reference for each service file |
| `04_FRONTEND_SPEC.md` | All React component code, types, API client | Follow when building frontend |
| `05_SETUP_AND_BUILD_ORDER.md` | Step-by-step setup, exact build sequence, testing checklist | Follow strictly — do not skip steps |
| `06_PHASE2_AND_PRODUCTION.md` | Channel support, background tasks, production DB | Only after Phase 1 works fully |

---

## Your Primary Mission

Build the Phase 1 MVP:

1. A FastAPI backend that can:
   - Accept a YouTube playlist URL and ingest all videos with transcripts
   - Store chunks in ChromaDB with timestamps and metadata
   - Accept a question and return a grounded answer with source references

2. A React frontend that can:
   - Let a user paste a playlist URL and trigger ingestion
   - Show a chat interface for asking questions
   - Display source video cards with clickable timestamped YouTube links

---

## Non-Negotiable Requirements

These are the most important rules. Never violate them:

1. **Answers must be grounded** — The LLM must be instructed to answer ONLY from retrieved transcript chunks. The system prompt must explicitly say to not use general knowledge.

2. **Timestamps must be correct** — Every source card must link to `https://www.youtube.com/watch?v=VIDEO_ID&t=SECONDS`. The `start_seconds` from the chunk must be used — never round to minutes.

3. **No transcript = skip, not crash** — If a video has no transcript, log a warning and continue processing other videos. Never crash the entire ingestion.

4. **ChromaDB must be filtered by playlist** — When querying, ALWAYS filter by `playlist_id` in the `where` clause. Never return chunks from a different playlist.

5. **No secrets in code** — All API keys come from `.env` via `config.py`. Never hardcode keys.

---

## Implementation Rules

### For the Backend
- All route functions must be `async def`
- Use `AsyncSession` everywhere (never sync SQLAlchemy in async routes)
- Return appropriate HTTP status codes (400 for bad input, 404 for not found, 500 for server errors)
- Use Pydantic models for all request and response bodies
- The ingest endpoint must be idempotent — reingest the same playlist safely using `merge` in SQLAlchemy

### For the Frontend
- All API calls go through `src/api/client.ts` — no inline fetch calls in components
- TypeScript types must be defined in `src/types/index.ts`
- SourceCard must open YouTube links in a new tab (`target="_blank"`)
- Loading states must be shown for both ingestion and question answering
- If no sources are returned, do not show the "Referenced in these videos" section

### For the Chunker
- Chunk size target: 500 tokens (configurable via `settings.chunk_size_tokens`)
- Overlap: 50 tokens (keep context continuity between chunks)
- Each chunk must preserve `start_seconds` from the FIRST segment in that chunk
- `end_seconds` is from the LAST segment's `start + duration`
- Chunk ID format: `{playlist_id}_{video_id}_{chunk_index:04d}` (zero-padded to 4 digits)

### For ChromaDB
- Collection name: `youtube_chunks`
- Distance metric: cosine (`hnsw:space: cosine`)
- Always use `upsert` not `add` (allows re-indexing without duplicates)
- When querying, request `include=["documents", "metadatas", "distances"]`

### For the LLM Prompt
- Use the exact system prompt defined in `03_SERVICES_SPEC.md → answer_generator.py`
- Format each chunk as `[Excerpt N]\nVideo: ...\nTimestamp: ...\nContent: ...`
- Keep max_tokens at 1024 for answers — longer answers are not needed
- Model: `claude-sonnet-4-20250514`

---

## How to Verify Each Phase

### Phase 1A (backend foundation) is done when:
```bash
curl http://localhost:8000/api/health
# Returns: {"status": "ok"}
```

### Phase 1B (services) is done when:
- `chunker.py` runs the manual test shown in `05_SETUP_AND_BUILD_ORDER.md` without errors
- All service files exist and import without errors

### Phase 1C (ingest) is done when:
```bash
curl -X POST http://localhost:8000/api/ingest/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/playlist?list=VALID_PLAYLIST_ID"}'
# Returns: JSON with playlist_id, videos_indexed > 0
```

### Phase 1D (ask) is done when:
```bash
curl -X POST http://localhost:8000/api/ask/ \
  -H "Content-Type: application/json" \
  -d '{"question": "What is covered in these videos?", "playlist_id": "PLAYLIST_ID_FROM_ABOVE"}'
# Returns: JSON with non-empty answer and at least 1 source
```

### Phase 1E (sources) is done when:
```bash
curl http://localhost:8000/api/sources/PLAYLIST_ID
# Returns: JSON with playlist title and list of videos
```

### Phase 1F (frontend) is done when:
- Frontend loads at `http://localhost:5173` without console errors
- Pasting a playlist URL and clicking "Index Playlist" shows a success message
- The sidebar updates with indexed video thumbnails
- Typing a question and pressing Enter returns an answer
- Source cards appear below the answer with thumbnails and timestamps
- Clicking a source card opens YouTube in a new tab at the correct time

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Using `chromadb.Client()` (deprecated) | Use `chromadb.PersistentClient(path=...)` |
| Forgetting `await` on async functions | All service functions are async — always await them |
| Not filtering ChromaDB by playlist_id | Always pass `where={"playlist_id": playlist_id}` in query |
| Returning exact LLM response without structured sources | Always build `SourceReference` list from retrieved chunks |
| Hard-coding playlist_id in frontend | Always pass `playlistId` from state into the API call |
| Embedding the question + context together | Embed the question ALONE for retrieval; context goes in the prompt |
| Running sync code in async route | Use `asyncio.to_thread()` for CPU-bound sync work if needed |
| Not handling YouTube API pagination | Use `nextPageToken` loop in `resolve_playlist_id()` |

---

## Recommended Test Playlist

Use a small, public playlist for testing during development. A playlist with 5–10 videos with auto-generated transcripts works fine.

Example: Search YouTube for any educational channel's playlist (e.g. a Python tutorial series, a history series) and use the playlist URL from the address bar.

---

## Definition of Done (MVP)

The project is complete when:
- [ ] Both backend and frontend start without errors
- [ ] A playlist can be successfully ingested
- [ ] Asking a question returns a grounded, non-hallucinated answer
- [ ] Every answer includes at least 1 source card
- [ ] Every source card timestamp link opens YouTube at the correct moment
- [ ] The code is organized exactly per the folder structure in `02_BACKEND_SPEC.md`
- [ ] `.env` is in `.gitignore`
- [ ] `README.md` exists with setup instructions

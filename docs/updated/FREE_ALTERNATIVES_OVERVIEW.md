# Free Stack Alternatives — Overview

## What We're Replacing

The original stack used three paid APIs. This document shows exactly what replaces each one, why, and what the tradeoffs are.

| Original (Paid) | Replacement (Free) | Category |
|---|---|---|
| YouTube Data API v3 | `yt-dlp` | Playlist & video metadata |
| OpenAI `text-embedding-3-small` | `sentence-transformers` (local model) | Embeddings |
| Anthropic Claude API | **Groq** (recommended) or **Ollama** (fully offline) | LLM answer generation |

Everything else stays identical:
- `youtube-transcript-api` — already free, no key needed
- `ChromaDB` — already free, runs locally
- `SQLite` — already free
- `FastAPI` backend — unchanged
- React frontend — unchanged

---

## Replacement 1 — YouTube Data API → yt-dlp

### What yt-dlp is
`yt-dlp` is the most actively maintained YouTube download/extraction tool. It can extract full playlist metadata — video IDs, titles, descriptions, thumbnails, durations — without any API key or account. It scrapes YouTube directly.

### Why it's better than the alternative
- **No quota** — YouTube Data API gives 10,000 units/day. yt-dlp has no quota.
- **No API key setup** — zero configuration, just `pip install yt-dlp`.
- **Handles more URL formats** — playlist URLs, channel URLs, `@handle` URLs, even single video URLs.
- **Actively maintained** — updates weekly to stay ahead of YouTube changes.

### Limitation
- Slightly slower than the API for large playlists (it scrapes the page rather than hitting a JSON endpoint).
- YouTube occasionally changes page structure, which can temporarily break extraction until yt-dlp updates (usually within hours).

### Install
```bash
pip install yt-dlp
```

### Usage pattern
```python
import yt_dlp

ydl_opts = {
    'quiet': True,
    'extract_flat': True,     # Don't download videos, just metadata
    'no_warnings': True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(playlist_url, download=False)
    # info['entries'] contains each video
    # info['title'] is the playlist title
    # Each entry has: id, title, description, thumbnail, duration
```

---

## Replacement 2 — OpenAI Embeddings → sentence-transformers

### What sentence-transformers is
A Python library from HuggingFace that runs embedding models locally on your machine — no API calls, no billing, no rate limits. Models are downloaded once and cached.

### Recommended model: `BAAI/bge-small-en-v1.5`
- **Size:** ~130MB download
- **Dimensions:** 384 (vs OpenAI's 1536 — smaller means faster ChromaDB queries)
- **Quality:** State-of-the-art for retrieval tasks at this size
- **Speed:** ~500 embeddings/sec on CPU, ~5000/sec on GPU
- **License:** MIT — fully free for commercial use

### Alternative models (if you want different tradeoffs)

| Model | Dimensions | Size | Speed | Quality | Use when |
|---|---|---|---|---|---|
| `all-MiniLM-L6-v2` | 384 | ~90MB | Fastest | Good | Low-RAM machines |
| `BAAI/bge-small-en-v1.5` | 384 | ~130MB | Fast | **Best at this size** | ✅ Recommended |
| `BAAI/bge-base-en-v1.5` | 768 | ~440MB | Medium | Better | More RAM available |
| `all-mpnet-base-v2` | 768 | ~420MB | Medium | Better | Quality priority |

### Install
```bash
pip install sentence-transformers
# torch CPU-only (smaller install, ~500MB vs ~2GB for CUDA):
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### First run
The model downloads automatically on first use and is cached in `~/.cache/huggingface/`. Subsequent runs load from cache instantly.

### Usage pattern
```python
from sentence_transformers import SentenceTransformer

# Load once at startup (singleton)
model = SentenceTransformer('BAAI/bge-small-en-v1.5')

# Embed a single text
vector = model.encode("What is overfitting?").tolist()

# Embed a batch
vectors = model.encode(["text 1", "text 2", "text 3"]).tolist()
```

### Important: ChromaDB dimension change
Because this model produces 384-dimensional vectors (not 1536 like OpenAI), you must **delete any existing ChromaDB collection and start fresh** when switching. Mixed-dimension collections will crash at query time.

---

## Replacement 3 — Anthropic Claude → Groq or Ollama

You have two good free options here. Choose based on your setup.

---

### Option A: Groq API (Recommended for most users)

**What Groq is:** A cloud inference service with an extremely generous free tier. It runs open-source LLMs (Llama 3, Mixtral, Gemma) at 500–800 tokens/second — much faster than even paid Claude or GPT-4.

**Free tier limits (as of 2025):**
- 14,400 requests/day
- 500,000 tokens/day per model
- 30 requests/minute

For a RAG Q&A app with typical usage, you will almost never hit these limits.

**Getting a Groq API key:**
1. Go to https://console.groq.com
2. Sign up (free, no credit card required)
3. Go to "API Keys" → "Create API key"
4. Copy it to `.env`

**Recommended free model: `llama-3.1-8b-instant`**
- Fast (instant responses)
- High quality — excellent instruction following
- Context: 128K tokens (more than enough for our prompts)

**Alternative models on Groq free tier:**

| Model | Quality | Speed | Context |
|---|---|---|---|
| `llama-3.1-8b-instant` | Good | ⚡ Fastest | 128K |
| `llama3-8b-8192` | Good | Fast | 8K |
| `mixtral-8x7b-32768` | Better | Medium | 32K |
| `llama-3.1-70b-versatile` | Best | Slower | 128K |

**Install:**
```bash
pip install groq
```

**`.env` change:**
```env
# Remove: OPENAI_API_KEY, ANTHROPIC_API_KEY, YOUTUBE_API_KEY
GROQ_API_KEY=gsk_...   # Only key you need
```

---

### Option B: Ollama (Fully Offline, No Account Needed)

**What Ollama is:** A tool that runs LLMs locally on your machine. After installing Ollama and pulling a model, everything runs 100% offline. No API keys, no rate limits, no internet required.

**Hardware requirements:**
- Minimum 8GB RAM (for 7B parameter models)
- 16GB RAM recommended for comfortable use
- GPU not required — CPU inference works fine

**Install Ollama:**
```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: Download installer from https://ollama.com/download
```

**Pull a model (choose one):**
```bash
ollama pull llama3.2          # 2GB — fast, good quality, recommended
ollama pull mistral           # 4GB — very good quality
ollama pull llama3.1:8b       # 5GB — excellent quality
ollama pull gemma2:2b         # 1.6GB — smallest, still decent
```

**Install Python client:**
```bash
pip install ollama
```

**Usage pattern:**
```python
import ollama

response = ollama.chat(
    model='llama3.2',
    messages=[
        {'role': 'system', 'content': system_prompt},
        {'role': 'user',   'content': user_message},
    ]
)
answer = response['message']['content']
```

**Note:** Ollama must be running as a background service (`ollama serve`) before you start the FastAPI backend.

---

## Which LLM Option Should You Choose?

| Factor | Groq | Ollama |
|---|---|---|
| Setup effort | Minimal (just sign up) | Moderate (install + pull model) |
| Internet required | Yes | No (after model download) |
| Hardware needed | Any machine | 8GB+ RAM |
| Response speed | ⚡ Very fast (cloud inference) | Moderate (depends on CPU/GPU) |
| Rate limits | Yes (generous) | None |
| Answer quality | Excellent | Good to excellent (depends on model) |
| Privacy | Data sent to Groq | Fully local |
| Recommended for | Most users | Privacy-first / offline use |

**Recommendation: Start with Groq.** It requires the least setup and gives the fastest, highest-quality answers. Switch to Ollama if you need full offline capability or have privacy constraints.

---

## Updated Environment Variables

```env
# ── Free stack .env ──────────────────────────

# LLM choice: "groq" or "ollama"
LLM_PROVIDER=groq

# Groq (only needed if LLM_PROVIDER=groq)
GROQ_API_KEY=gsk_...

# Ollama (only needed if LLM_PROVIDER=ollama)
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434

# Embedding model (local, no key needed)
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

# App settings (unchanged)
FRONTEND_URL=http://localhost:5173
CHROMA_PERSIST_DIR=./chroma_db
SQLITE_DB_PATH=./app.db
```

---

## Updated requirements.txt

```txt
# Web framework
fastapi==0.111.0
uvicorn[standard]==0.30.0
pydantic==2.7.0
pydantic-settings==2.2.1
python-dotenv==1.0.1

# Database
sqlalchemy==2.0.30
aiosqlite==0.20.0

# HTTP client
httpx==0.27.0

# ── FREE REPLACEMENTS ────────────────────────
# YouTube playlist/video metadata (replaces YouTube Data API)
yt-dlp==2026.3.17

# Local embeddings (replaces OpenAI embeddings)
sentence-transformers==3.0.0
torch==2.3.0          # CPU-only install recommended (see below)

# LLM inference — Option A: Groq API
groq==0.9.0

# LLM inference — Option B: Ollama (uncomment if using)
# ollama==0.2.1

# ── UNCHANGED ────────────────────────────────
# YouTube transcripts (already free)
youtube-transcript-api==0.6.2

# Vector store (already free)
chromadb==0.5.0

# Tokenizer for chunking
tiktoken==0.7.0
```

### CPU-only PyTorch install (saves ~1.5GB vs default)
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install sentence-transformers
# Install the rest normally
pip install -r requirements.txt
```

---

## Cost Comparison

| Component | Paid Stack | Free Stack |
|---|---|---|
| YouTube metadata | Free (but needs API key setup) | Free (no setup) |
| Embeddings | ~$0.02 per 1M tokens | **$0** |
| LLM inference | ~$3–15 per 1M tokens | **$0** |
| Vector store | $0 (ChromaDB local) | $0 |
| **Total for 100 questions** | ~$0.05–0.20 | **$0** |
| **Total for 10,000 questions** | ~$5–20 | **$0** |

---

## Performance Comparison

| Metric | Paid Stack | Free Stack (Groq) | Free Stack (Ollama) |
|---|---|---|---|
| Embedding speed | Fast (API call) | Slower (local CPU) | Slower (local CPU) |
| LLM response | ~1–2s | ~0.5–1s ⚡ | ~5–30s (CPU) |
| Ingest time (10 videos) | ~30s | ~45s | ~45s |
| Answer quality | Excellent | Very good | Good–Very good |
| Setup complexity | Medium | Low | Medium |

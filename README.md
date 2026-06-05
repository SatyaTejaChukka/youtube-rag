---
title: Youtube Rag Backend
emoji: 📽️
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
---

# TubeRAG

TubeRAG is an open-source, privacy-first Retrieval-Augmented Generation (RAG) application that allows you to ask natural language questions about any YouTube channel, playlist, or single video. It extracts transcripts, generates semantic embeddings, and provides highly accurate answers grounded entirely in the video content—complete with clickable source citations that jump straight to the exact timestamp in the video.

![TubeRAG Preview](https://via.placeholder.com/1000x500.png?text=TubeRAG+Preview)

## ✨ Key Features

- **Unified Source Ingestion**: Seamlessly index YouTube Channels (`@handle` or channel ID), Playlists, or individual video links through a single input.
- **Privacy-First Hybrid BYOK**: No user accounts required. Bring Your Own Key (BYOK) for LLM inference (supports Groq and local Ollama). Keys are stored safely in your browser's IndexedDB and never saved to the backend database.
- **Clickable Timestamp Citations**: Every answer includes detailed source cards. Click a source card to instantly open the YouTube video at the exact moment the information was spoken.
- **Free-Tier Optimized Stack**: Engineered to run entirely on free or highly accessible tools:
  - **yt-dlp**: For fast, API-key-less YouTube metadata extraction.
  - **ChromaDB**: Local, open-source vector database.
  - **SQLite**: Local relational database for metadata and sync states.
  - **SentenceTransformers**: Fast, local embedding generation.
- **Incremental Syncing**: Smart ingestion only processes new videos when you re-index a channel or playlist, saving time and compute resources.
- **Fully Dockerized**: Spin up the entire application locally with a single `docker compose up` command.

## 🏗️ Architecture

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Vite, Dexie.js (for secure local key storage).
- **Backend**: Python 3.11, FastAPI, SQLAlchemy (Async), yt-dlp.
- **AI/ML**:
  - Embedding Model: `sentence-transformers` (runs locally).
  - LLM Provider: Groq (via API) or Ollama (fully local).
  - Vector Store: ChromaDB.

## 🚀 Getting Started

The easiest way to run TubeRAG is using Docker. This ensures all dependencies (like `ffmpeg` for `yt-dlp` and `chromadb` requirements) are perfectly configured.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose)
- A [Groq API Key](https://console.groq.com/keys) (Optional, if using BYOK in the browser, but recommended for server demo mode).

### 1. Run with Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/youtube-rag.git
   cd youtube-rag
   ```

2. (Optional) Set up a `.env` file for Demo Mode:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and add GROQ_API_KEY=gsk_...
   ```

3. Start the application:
   ```bash
   docker compose up -d --build
   ```

4. Open the application in your browser:
   **http://localhost:5173**

*(Note: The first ingestion might take a moment as the backend downloads the local embedding model).*

### 2. Run Locally (Development)

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Add your keys
python run.py
```
*The API will be available at `http://localhost:8000`*

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The UI will be available at `http://localhost:5173`*

## 💡 Usage Guide

### 1. Configure Your AI Provider
Click the **Settings (Gear Icon)** in the top right of the sidebar.
- **Groq**: Select Groq and paste your API key. It will be securely stored in your browser.
- **Ollama**: Select Ollama to use local LLMs (ensure Ollama is running and accessible to the backend).

### 2. Index a Source
Paste a YouTube link into the sidebar input. Supported formats include:
- Channel Handle: `https://youtube.com/@freecodecamp`
- Playlist: `https://youtube.com/playlist?list=PL...`
- Single Video: `https://youtube.com/watch?v=...`

Click **Index Source**. The backend will extract transcripts, chunk them, generate embeddings, and store them locally.

### 3. Ask Questions
Once indexed, the source will appear in the sidebar. Select it, and ask questions like:
- *"What are the main topics covered?"*
- *"Summarize the explanation of gradient descent."*
- *"What did the creator say about error handling?"*

TubeRAG will retrieve the most relevant transcript chunks and synthesize an answer grounded strictly in the video content.

## 🔒 Data & Privacy (Hybrid BYOK)

TubeRAG is built to respect your privacy:
- **Server Storage**: Transcripts, metadata, and embeddings are stored locally on the server/machine running the backend (in `chroma_db` and `app.db`).
- **Browser Storage**: API keys, UI themes, and chat history remain strictly on your device (using `IndexedDB`).
- User API keys sent via request headers are **never logged, saved, or persisted** by the backend. 

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major architectural changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT License](LICENSE)

# Frontend Specification

## Stack
- **React + Vite** (TypeScript)
- **TailwindCSS** for styling
- **Axios** for HTTP requests
- **No UI component library** — keep it minimal for MVP

---

## Setup Commands

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios tailwindcss @tailwindcss/vite
```

### vite.config.ts
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000'  // Proxy API calls to FastAPI
    }
  }
})
```

---

## TypeScript Types — `src/types/index.ts`

```ts
export interface SourceReference {
  video_id: string;
  video_title: string;
  start_seconds: number;
  timestamp_label: string;    // e.g. "12:43"
  snippet: string;
  youtube_url: string;
  thumbnail_url?: string;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: SourceReference[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  timestamp: Date;
}

export interface IngestResponse {
  playlist_id: string;
  playlist_title: string;
  videos_indexed: number;
  videos_skipped: number;
  skipped_video_ids: string[];
  status: 'complete' | 'partial' | 'error';
}

export interface VideoSummary {
  video_id: string;
  title: string;
  thumbnail_url?: string;
  published_at?: string;
  chunk_count: number;
  transcript_available: boolean;
}
```

---

## API Client — `src/api/client.ts`

```ts
import axios from 'axios';
import type { IngestResponse, AskResponse, VideoSummary } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function ingestPlaylist(url: string): Promise<IngestResponse> {
  const { data } = await api.post('/ingest/', { url });
  return data;
}

export async function askQuestion(question: string, playlist_id: string): Promise<AskResponse> {
  const { data } = await api.post('/ask/', { question, playlist_id });
  return data;
}

export async function getSources(playlist_id: string): Promise<{ videos: VideoSummary[] }> {
  const { data } = await api.get(`/sources/${playlist_id}`);
  return data;
}

export async function deletePlaylist(playlist_id: string): Promise<void> {
  await api.delete(`/sources/${playlist_id}`);
}
```

---

## App.tsx — Main Layout

```tsx
import { useState } from 'react';
import IngestPanel from './components/IngestPanel';
import ChatWindow from './components/ChatWindow';
import IndexedVideos from './components/IndexedVideos';

export default function App() {
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string>('');

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-72 flex flex-col border-r border-gray-800 bg-gray-900">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white">🎬 TubeRAG</h1>
          <p className="text-xs text-gray-400 mt-1">Ask questions about any YouTube playlist</p>
        </div>
        <IngestPanel
          onIngested={(id, title) => {
            setPlaylistId(id);
            setPlaylistTitle(title);
          }}
        />
        {playlistId && (
          <IndexedVideos playlistId={playlistId} />
        )}
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {playlistId ? (
          <>
            <header className="px-6 py-3 border-b border-gray-800 bg-gray-900">
              <p className="text-sm text-gray-300">
                Asking about: <span className="font-semibold text-white">{playlistTitle}</span>
              </p>
            </header>
            <ChatWindow playlistId={playlistId} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-white mb-2">Get started</h2>
              <p className="text-gray-400 max-w-sm">
                Paste a YouTube playlist URL in the sidebar to index the videos,
                then ask questions about their content.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## IngestPanel.tsx

```tsx
import { useState } from 'react';
import { ingestPlaylist } from '../api/client';

interface Props {
  onIngested: (playlistId: string, title: string) => void;
}

export default function IngestPanel({ onIngested }: Props) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    if (!url.trim()) return;
    setStatus('loading');
    setMessage('');

    try {
      const result = await ingestPlaylist(url.trim());
      setStatus('done');
      setMessage(
        `✅ Indexed ${result.videos_indexed} videos` +
        (result.videos_skipped > 0 ? `, skipped ${result.videos_skipped}` : '')
      );
      onIngested(result.playlist_id, result.playlist_title);
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.detail || 'Ingestion failed. Check the URL and try again.');
    }
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Playlist URL
      </label>
      <textarea
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                   placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
        placeholder="https://youtube.com/playlist?list=PL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        disabled={status === 'loading'}
        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                   text-sm font-semibold text-white transition-colors"
      >
        {status === 'loading' ? 'Indexing...' : 'Index Playlist'}
      </button>

      {status === 'loading' && (
        <div className="text-xs text-gray-400 animate-pulse">
          Fetching transcripts and building index…
        </div>
      )}
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
```

---

## ChatWindow.tsx

```tsx
import { useState, useRef, useEffect } from 'react';
import { askQuestion } from '../api/client';
import MessageBubble from './MessageBubble';
import type { Message } from '../types';

interface Props {
  playlistId: string;
}

export default function ChatWindow({ playlistId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await askQuestion(q, playlistId);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-8">
            Ask anything about the indexed videos.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="text-sm text-gray-400 animate-pulse pl-2">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-3 items-end">
          <textarea
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm
                       text-white placeholder-gray-500 resize-none focus:outline-none
                       focus:ring-1 focus:ring-blue-500"
            rows={2}
            placeholder="Ask a question about the videos…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                       text-sm font-semibold text-white transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## MessageBubble.tsx

```tsx
import SourceList from './SourceList';
import type { Message } from '../types';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2`}>
      <div
        className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        }`}
      >
        {message.content}
      </div>

      {/* Show source cards below assistant messages */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="text-xs text-gray-500 mb-2 pl-1">Referenced in these videos:</p>
          <SourceList sources={message.sources} />
        </div>
      )}
    </div>
  );
}
```

---

## SourceList.tsx

```tsx
import SourceCard from './SourceCard';
import type { SourceReference } from '../types';

interface Props {
  sources: SourceReference[];
}

export default function SourceList({ sources }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {sources.map((source, i) => (
        <SourceCard key={`${source.video_id}-${source.start_seconds}-${i}`} source={source} />
      ))}
    </div>
  );
}
```

---

## SourceCard.tsx

```tsx
import type { SourceReference } from '../types';

interface Props {
  source: SourceReference;
}

export default function SourceCard({ source }: Props) {
  return (
    <a
      href={source.youtube_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700
                 hover:border-gray-600 transition-all group cursor-pointer"
    >
      {/* Thumbnail */}
      {source.thumbnail_url ? (
        <div className="relative flex-shrink-0">
          <img
            src={source.thumbnail_url}
            alt={source.video_title}
            className="w-28 h-16 object-cover rounded-lg"
          />
          {/* Timestamp badge */}
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs
                           px-1.5 py-0.5 rounded font-mono">
            {source.timestamp_label}
          </span>
          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100
                          transition-opacity rounded-lg flex items-center justify-center">
            <span className="text-white text-xl">▶</span>
          </div>
        </div>
      ) : (
        <div className="w-28 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-gray-400 text-xs font-mono">{source.timestamp_label}</span>
        </div>
      )}

      {/* Text info */}
      <div className="flex flex-col justify-between min-w-0">
        <p className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
          {source.video_title}
        </p>
        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
          {source.snippet}
        </p>
        <p className="text-xs text-blue-400 mt-1 font-mono">
          Jump to {source.timestamp_label} →
        </p>
      </div>
    </a>
  );
}
```

---

## IndexedVideos.tsx

```tsx
import { useEffect, useState } from 'react';
import { getSources } from '../api/client';
import type { VideoSummary } from '../types';

interface Props {
  playlistId: string;
}

export default function IndexedVideos({ playlistId }: Props) {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSources(playlistId)
      .then((data) => setVideos(data.videos || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [playlistId]);

  if (loading) return <p className="p-4 text-xs text-gray-500">Loading videos…</p>;
  if (!videos.length) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 border-t border-gray-800">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Indexed Videos ({videos.length})
      </p>
      <div className="space-y-2">
        {videos.map((v) => (
          <div key={v.video_id} className="flex gap-2 items-start">
            {v.thumbnail_url && (
              <img
                src={v.thumbnail_url}
                alt={v.title}
                className="w-14 h-10 object-cover rounded flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-gray-300 line-clamp-2">{v.title}</p>
              <p className="text-xs text-gray-500">
                {v.transcript_available ? `${v.chunk_count} chunks` : 'No transcript'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

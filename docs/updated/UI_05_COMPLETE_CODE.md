# Complete Assembled Frontend Code

This file contains the remaining assembled components not fully covered in Component Spec — Sidebar, TopBar, EmptyState — plus `main.tsx` and `index.html`. Piece these together with the components from `UI_03_COMPONENTS_SPEC.md`.

---

## index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TubeRAG — Ask Your Playlist</title>
    <meta name="description" content="Ask questions about any YouTube playlist and get answers with timestamped video references." />

    <!-- Favicon: use a simple SVG emoji favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>" />

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## src/main.tsx

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## src/App.tsx

```tsx
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ChatWindow from './components/ChatWindow'
import EmptyState from './components/EmptyState'

export default function App() {
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [playlistTitle, setPlaylistTitle] = useState<string>('')

  function handleIngested(id: string, title: string) {
    setPlaylistId(id)
    setPlaylistTitle(title)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Ambient background effects ── */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {/* Top center violet glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] blur-3xl opacity-60"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
        />
        {/* Bottom right cyan glow */}
        <div
          className="absolute bottom-0 right-0 w-[600px] h-[400px] blur-3xl opacity-50"
          style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, transparent 70%)' }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Sidebar ── */}
      <Sidebar
        playlistId={playlistId}
        onIngested={handleIngested}
        style={{ animation: 'sidebarEnter 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
      />

      {/* ── Main area ── */}
      <main
        className="relative z-10 flex flex-1 flex-col overflow-hidden"
        style={{ animation: 'mainEnter 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}
      >
        {playlistId ? (
          <>
            <TopBar
              playlistTitle={playlistTitle}
              onClear={() => { setPlaylistId(null); setPlaylistTitle('') }}
            />
            <ChatWindow playlistId={playlistId} />
          </>
        ) : (
          <EmptyState />
        )}
      </main>

    </div>
  )
}
```

---

## src/components/Sidebar.tsx

```tsx
import { CSSProperties } from 'react'
import { Youtube, BookOpen, Sparkles } from 'lucide-react'
import IngestPanel from './IngestPanel'
import IndexedVideos from './IndexedVideos'

interface Props {
  playlistId: string | null
  onIngested: (id: string, title: string) => void
  style?: CSSProperties
}

export default function Sidebar({ playlistId, onIngested, style }: Props) {
  return (
    <aside
      className="flex flex-col shrink-0 z-20 relative"
      style={{
        width: '280px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {/* ── Logo Header ── */}
      <header className="flex items-center gap-3 px-5 shrink-0" style={{ height: '64px', borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
            boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}
        >
          <Youtube size={16} className="text-white" />
        </div>

        {/* Brand */}
        <span
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}
        >
          TubeRAG
        </span>

        {/* Version */}
        <span
          className="ml-auto font-mono text-[10px] px-2 py-0.5 rounded-full"
          style={{
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          v1.0
        </span>
      </header>

      {/* ── Ingest Panel ── */}
      <IngestPanel onIngested={onIngested} />

      {/* ── Indexed Videos section ── */}
      {playlistId ? (
        <>
          {/* Section label */}
          <div
            className="flex items-center gap-2 px-5 pt-4 pb-2 shrink-0"
          >
            <BookOpen size={11} style={{ color: 'var(--text-muted)' }} />
            <span
              className="font-mono text-[10px] uppercase font-medium"
              style={{ letterSpacing: '0.18em', color: 'var(--text-muted)' }}
            >
              Indexed Videos
            </span>
          </div>

          {/* Video list */}
          <IndexedVideos playlistId={playlistId} />
        </>
      ) : (
        <div className="flex-1" />
      )}

      {/* ── Footer ── */}
      <footer
        className="h-10 flex items-center px-5 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span
          className="text-[11px] flex items-center gap-1.5"
          style={{ color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif' }}
        >
          <Sparkles size={10} style={{ color: '#818CF8' }} />
          Powered by Claude
        </span>
      </footer>
    </aside>
  )
}
```

---

## src/components/TopBar.tsx

```tsx
import { Trash2, LayoutSidebar } from 'lucide-react'
import { IconButton } from './ui/IconButton'

interface Props {
  playlistTitle: string
  onClear: () => void
}

export default function TopBar({ playlistTitle, onClear }: Props) {
  return (
    <header
      className="flex items-center justify-between px-6 shrink-0 z-30"
      style={{
        height: '56px',
        background: 'rgba(13,13,20,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left: status + playlist title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Live indicator dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: '#10B981',
            boxShadow: '0 0 8px rgba(16,185,129,0.6)',
            animation: 'glowPulse 2s ease-in-out infinite',
          }}
        />
        <span
          className="text-sm shrink-0"
          style={{ color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}
        >
          Asking about
        </span>
        <span
          className="text-sm font-semibold truncate max-w-xs"
          style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}
          title={playlistTitle}
        >
          {playlistTitle}
        </span>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          variant="danger"
          onClick={onClear}
          title="Clear and load a different playlist"
        >
          <Trash2 size={15} />
        </IconButton>
      </div>
    </header>
  )
}
```

---

## src/components/EmptyState.tsx

```tsx
import { Film } from 'lucide-react'

const FEATURE_PILLS = [
  'Timestamped references',
  'Grounded answers only',
  'Any public playlist',
  'Clickable video clips',
]

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">

      {/* Floating icon */}
      <div
        className="relative mb-8"
        style={{ animation: 'gentleFloat 4s ease-in-out infinite' }}
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background: 'rgba(99,102,241,0.15)',
            filter: 'blur(24px)',
            transform: 'scale(1.5)',
            animation: 'glowExpand 4s ease-in-out infinite',
          }}
        />

        {/* Icon box */}
        <div
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Film size={36} style={{ color: '#A5B4FC' }} />
        </div>
      </div>

      {/* Heading */}
      <h2
        className="text-2xl font-bold tracking-tight mb-3 fade-in-up delay-1"
        style={{
          fontFamily: 'Syne, sans-serif',
          color: 'var(--text-primary)',
        }}
      >
        Your channel,{' '}
        <span
          style={{
            background: 'linear-gradient(135deg, #A5B4FC 0%, #6366F1 40%, #22D3EE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          answering back
        </span>
      </h2>

      {/* Subtitle */}
      <p
        className="text-sm leading-relaxed max-w-sm mb-8 fade-in-up delay-2"
        style={{ color: 'var(--text-secondary)', fontFamily: 'Outfit, sans-serif' }}
      >
        Paste a YouTube playlist URL in the sidebar to index the videos.
        Then ask any question — TubeRAG retrieves exactly where the answer lives,
        with clickable timestamps.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center fade-in-up delay-3">
        {FEATURE_PILLS.map(feat => (
          <span
            key={feat}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              color: '#A5B4FC',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {feat}
          </span>
        ))}
      </div>

    </div>
  )
}
```

---

## src/types/index.ts (Complete)

```ts
export interface SourceReference {
  video_id: string
  video_title: string
  start_seconds: number
  timestamp_label: string
  snippet: string
  youtube_url: string
  thumbnail_url?: string
}

export interface AskResponse {
  question: string
  answer: string
  sources: SourceReference[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceReference[]
  timestamp: Date
}

export interface IngestResponse {
  playlist_id: string
  playlist_title: string
  videos_indexed: number
  videos_skipped: number
  skipped_video_ids: string[]
  status: 'complete' | 'partial' | 'error'
}

export interface VideoSummary {
  video_id: string
  title: string
  thumbnail_url?: string
  published_at?: string
  chunk_count: number
  transcript_available: boolean
}

export interface PlaylistSummary {
  playlist_id: string
  title: string
  video_count: number
  indexed_at: string
  videos: VideoSummary[]
}
```

---

## src/api/client.ts (Complete)

```ts
import axios from 'axios'
import type { IngestResponse, AskResponse, PlaylistSummary } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 300_000, // 5 min — ingestion can take a while
})

export async function ingestPlaylist(url: string): Promise<IngestResponse> {
  const { data } = await api.post<IngestResponse>('/ingest/', { url })
  return data
}

export async function askQuestion(question: string, playlist_id: string): Promise<AskResponse> {
  const { data } = await api.post<AskResponse>('/ask/', { question, playlist_id })
  return data
}

export async function getSources(playlist_id: string): Promise<PlaylistSummary> {
  const { data } = await api.get<PlaylistSummary>(`/sources/${playlist_id}`)
  return data
}

export async function deletePlaylist(playlist_id: string): Promise<void> {
  await api.delete(`/sources/${playlist_id}`)
}
```

---

## package.json (Complete)

```json
{
  "name": "tuberag-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "tsc && vite build",
    "preview": "vite preview",
    "lint":    "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "react":       "^18.3.1",
    "react-dom":   "^18.3.1",
    "axios":       "^1.7.2",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "@types/react":          "^18.3.3",
    "@types/react-dom":      "^18.3.0",
    "@vitejs/plugin-react":  "^4.3.0",
    "@tailwindcss/vite":     "^4.0.0",
    "tailwindcss":           "^4.0.0",
    "typescript":            "^5.4.5",
    "vite":                  "^5.3.1"
  }
}
```

---

## vite.config.ts (Complete)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

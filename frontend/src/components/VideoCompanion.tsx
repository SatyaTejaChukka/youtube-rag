import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { X, Search, ChevronDown, Film, Loader2 } from 'lucide-react';

import { getVideoChunks, getSources } from '../api/client';
import type { ActiveVideo, VideoChunk, VideoSummary } from '../types';

interface Props {
  sourceId: string;
  activeVideo: ActiveVideo;
  onClose: () => void;
  onChangeVideo: (video: ActiveVideo) => void;
}

export default function VideoCompanion({ sourceId, activeVideo, onClose, onChangeVideo }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track what's actually loaded in the iframe to avoid unnecessary reloads
  const loadedVideoIdRef = useRef<string>('');
  const [iframeSrc, setIframeSrc] = useState('');

  // Transcript state
  const [chunks, setChunks] = useState<VideoChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const activeChunkRef = useRef<HTMLButtonElement>(null);

  // Player time tracking (from YouTube postMessage API)
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  // Distinguish auto-follow scroll (nearest) from user-click scroll (center)
  const scrollBehaviorRef = useRef<'center' | 'nearest'>('nearest');

  // Video selector state
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // ── Build the YouTube embed URL ──────────────────────────────────────────
  function buildSrc(videoId: string, startSeconds: number) {
    const start = Math.max(0, Math.floor(startSeconds));
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&start=${start}&rel=0&modestbranding=1`;
  }

  // ── postMessage seek (same-video, no reload) ────────────────────────────
  const seekTo = useCallback((seconds: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [Math.floor(seconds), true] }),
      '*',
    );
  }, []);

  // ── React to activeVideo prop changes ──────────────────────────────────
  useEffect(() => {
    if (!activeVideo) return;

    if (loadedVideoIdRef.current === activeVideo.videoId) {
      // Same video already in player → just seek
      seekTo(activeVideo.startSeconds);
    } else {
      // Different video → reload iframe
      loadedVideoIdRef.current = activeVideo.videoId;
      setIframeSrc(buildSrc(activeVideo.videoId, activeVideo.startSeconds));
      setActiveChunkIndex(null);
      setPlayerCurrentTime(0);
      setSearchQuery('');
      loadChunks(activeVideo.videoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideo]);

  // ── Load transcript chunks ─────────────────────────────────────────────
  async function loadChunks(videoId: string) {
    setChunksLoading(true);
    setChunks([]);
    try {
      const data = await getVideoChunks(sourceId, videoId);
      setChunks(data);
    } catch {
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  }

  // ── Load video list for selector ───────────────────────────────────────
  useEffect(() => {
    getSources(sourceId)
      .then((src) => setVideos(src.videos.filter((v) => v.transcript_available)))
      .catch(() => setVideos([]));
  }, [sourceId]);

  // ── YouTube postMessage: receive continuous currentTime updates ──────────
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'ready') {
          // Ask YouTube to send periodic infoDelivery events
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'listening', id: 1 }),
            '*',
          );
        } else if (data.event === 'infoDelivery' && typeof data.info?.currentTime === 'number') {
          setPlayerCurrentTime(data.info.currentTime);
        }
      } catch {
        // ignore malformed messages
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── Derive the active chunk index from playerCurrentTime ─────────────────
  const autoChunkIndex = useMemo(() => {
    if (chunks.length === 0 || playerCurrentTime <= 0) return null;
    let idx: number | null = null;
    for (const chunk of chunks) {
      if (chunk.start_seconds <= playerCurrentTime) idx = chunk.chunk_index;
      else break;
    }
    return idx;
  }, [chunks, playerCurrentTime]);

  // Push auto-derived chunk index → activeChunkIndex (auto-follow)
  useEffect(() => {
    if (autoChunkIndex !== null && autoChunkIndex !== activeChunkIndex) {
      scrollBehaviorRef.current = 'nearest'; // gentle, non-intrusive scroll
      setActiveChunkIndex(autoChunkIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoChunkIndex]);

  // ── Transcript chunk click (user-initiated) ───────────────────────────
  function handleChunkClick(chunk: VideoChunk) {
    scrollBehaviorRef.current = 'center'; // scroll user's choice into center view
    setActiveChunkIndex(chunk.chunk_index);
    seekTo(chunk.start_seconds);
  }

  // ── Scroll active chunk into view ─────────────────────────────────────
  useEffect(() => {
    activeChunkRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: scrollBehaviorRef.current,
    });
  }, [activeChunkIndex]);

  // ── Video selector ─────────────────────────────────────────────────────
  function handleVideoSelect(video: VideoSummary) {
    setSelectorOpen(false);
    if (video.video_id === activeVideo.videoId) return;
    onChangeVideo({ videoId: video.video_id, videoTitle: video.title, startSeconds: 0 });
  }

  // ── Filtered chunks ────────────────────────────────────────────────────
  const filteredChunks = searchQuery.trim()
    ? chunks.filter((c) => c.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : chunks;

  return (
    <aside
      className="relative z-10 flex shrink-0 flex-col overflow-hidden"
      style={{
        width: '360px',
        borderLeft: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        animation: 'panelSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {/* ── Header ── */}
      <header
        className="flex h-14 shrink-0 items-center gap-2.5 px-4"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        <Film size={14} className="shrink-0 text-[var(--accent-400)]" />
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text-primary)]"
          title={activeVideo.videoTitle}
        >
          {activeVideo.videoTitle}
        </span>
        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          onClick={onClose}
          title="Close companion"
          type="button"
        >
          <X size={14} />
        </button>
      </header>

      {/* ── YouTube iframe ── */}
      <div className="shrink-0" style={{ background: '#000' }}>
        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          {iframeSrc && (
            <iframe
              ref={iframeRef}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              src={iframeSrc}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title={activeVideo.videoTitle}
            />
          )}
        </div>
      </div>

      {/* ── Video Selector ── */}
      {videos.length > 1 && (
        <div className="shrink-0 px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative">
            <button
              className="flex w-full items-center gap-2 rounded-[8px] border border-white/8 bg-[var(--bg-elevated)] px-3 py-2 text-left transition-colors hover:border-white/14"
              onClick={() => setSelectorOpen((o) => !o)}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-secondary)]">
                {activeVideo.videoTitle}
              </span>
              <ChevronDown
                size={12}
                className={`shrink-0 text-[var(--text-muted)] transition-transform ${selectorOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {selectorOpen && (
              <div
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-[10px] border border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                style={{ background: 'var(--bg-overlay)' }}
              >
                {videos.map((v) => (
                  <button
                    key={v.video_id}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${
                      v.video_id === activeVideo.videoId ? 'text-[var(--accent-300)]' : 'text-[var(--text-secondary)]'
                    }`}
                    onClick={() => handleVideoSelect(v)}
                    type="button"
                  >
                    {v.thumbnail_url && (
                      <img
                        alt=""
                        className="h-[30px] w-[52px] shrink-0 rounded-[4px] object-cover opacity-80"
                        src={v.thumbnail_url}
                      />
                    )}
                    <span className="line-clamp-2 text-[11px] leading-snug">{v.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Transcript Header + Search ── */}
      <div
        className="shrink-0 px-3 pb-2 pt-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Transcript
        </p>
        <div className="flex items-center gap-2 rounded-[8px] border border-white/8 bg-[var(--bg-elevated)] px-2.5 py-1.5">
          <Search size={11} className="shrink-0 text-[var(--text-muted)]" />
          <input
            className="flex-1 bg-transparent text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            type="text"
            value={searchQuery}
          />
        </div>
      </div>

      {/* ── Transcript List ── */}
      <div className="flex-1 overflow-y-auto">
        {chunksLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-[var(--text-muted)]">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[11px]">Loading transcript…</span>
          </div>
        )}

        {!chunksLoading && chunks.length === 0 && (
          <p className="px-4 py-6 text-center text-[11px] italic text-[var(--text-muted)]">
            No transcript available for this video.
          </p>
        )}

        {!chunksLoading && filteredChunks.length === 0 && chunks.length > 0 && (
          <p className="px-4 py-6 text-center text-[11px] italic text-[var(--text-muted)]">
            No results for "{searchQuery}"
          </p>
        )}

        {!chunksLoading && filteredChunks.length > 0 && (
          <div className="space-y-0.5 p-2">
            {filteredChunks.map((chunk) => {
              const isActive = chunk.chunk_index === activeChunkIndex;
              return (
                <button
                  key={chunk.chunk_index}
                  ref={isActive ? activeChunkRef : undefined}
                  className={`group flex w-full items-start gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left transition-all duration-150 ${
                    isActive
                      ? 'border border-indigo-500/30 bg-indigo-500/10'
                      : 'border border-transparent hover:border-white/5 hover:bg-white/[0.03]'
                  }`}
                  onClick={() => handleChunkClick(chunk)}
                  type="button"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] font-medium ${
                      isActive
                        ? 'bg-indigo-500/30 text-[var(--accent-300)]'
                        : 'bg-white/[0.06] text-[var(--text-muted)] group-hover:bg-white/[0.08] group-hover:text-[var(--accent-400)]'
                    }`}
                  >
                    {chunk.timestamp_label}
                  </span>
                  <span
                    className={`line-clamp-3 text-[11px] leading-relaxed transition-colors ${
                      isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {chunk.text}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

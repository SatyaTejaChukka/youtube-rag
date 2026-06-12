import { FormEvent, KeyboardEvent, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Sparkles,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

import { apiErrorMessage, ingestSource, getIngestProgress } from '../api/client';
import type { IngestRequest, VideoProgress } from '../types';
import { Button } from './ui/Button';

interface Props {
  onIngested: (sourceId: string, title: string) => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

interface ProgressDetails {
  currentVideo: string;
  processed: number;
  total: number;
  videos: Record<string, VideoProgress>;
}

function splitLinks(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((link) => link.trim())
    .filter(Boolean);
}

const STATUS_CONFIG: Record<
  VideoProgress['status'],
  { icon: typeof Clock; label: string; color: string; animate: boolean }
> = {
  queued: { icon: Clock, label: 'Queued', color: '#6b7280', animate: false },
  downloading: { icon: Download, label: 'Fetching', color: '#3b82f6', animate: true },
  embedding: { icon: Sparkles, label: 'Embedding', color: '#6366f1', animate: true },
  completed: { icon: CheckCircle2, label: 'Done', color: '#10b981', animate: false },
  skipped: { icon: AlertTriangle, label: 'Skipped', color: '#f59e0b', animate: false },
  failed: { icon: XCircle, label: 'Failed', color: '#ef4444', animate: false },
};

function VideoProgressRow({ video, index }: { video: VideoProgress; index: number }) {
  const config = STATUS_CONFIG[video.status];
  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 transition-colors"
      style={{
        animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`,
        background: video.status === 'completed' ? 'rgba(16,185,129,0.04)' : 'transparent',
      }}
    >
      {/* Thumbnail */}
      <img
        alt=""
        className="h-[18px] w-[32px] shrink-0 rounded-[3px] object-cover"
        src={video.thumbnail_url}
        style={{
          opacity: video.status === 'queued' ? 0.4 : 1,
          filter: video.status === 'queued' ? 'grayscale(0.5)' : 'none',
          transition: 'opacity 0.3s, filter 0.3s',
        }}
      />

      {/* Title */}
      <span
        className="min-w-0 flex-1 truncate text-[11px]"
        style={{
          color:
            video.status === 'completed'
              ? 'var(--text-primary)'
              : video.status === 'queued'
                ? 'var(--text-muted)'
                : 'var(--text-secondary)',
          transition: 'color 0.3s',
        }}
      >
        {video.title}
      </span>

      {/* Status badge */}
      <div
        className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5"
        style={{
          color: config.color,
          background: `${config.color}15`,
          animation: config.animate ? 'statusPulse 1.8s ease-in-out infinite' : undefined,
          transition: 'all 0.3s',
        }}
      >
        <Icon size={9} />
        <span className="text-[9px] font-semibold uppercase tracking-wider">{config.label}</span>
      </div>
    </div>
  );
}

export default function IngestPanel({ onIngested }: Props) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [progressDetails, setProgressDetails] = useState<ProgressDetails | null>(null);

  const disabled = status === 'loading' || !sourceUrl.trim();

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (status === 'loading') {
      return;
    }

    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      return;
    }

    setStatus('loading');
    setMessage('');
    setProgressDetails(null);

    const urls = splitLinks(trimmed);
    const request: IngestRequest = urls.length > 1 ? { urls } : { url: urls[0] };

    try {
      const result = await ingestSource(request);

      if (result.status === 'indexing') {
        setProgressDetails({
          currentVideo: 'Initializing background indexing...',
          processed: 0,
          total: 0,
          videos: {},
        });

        const sourceId = result.source_id;
        const intervalId = setInterval(async () => {
          try {
            const progress = await getIngestProgress(sourceId);
            if (progress.status === 'indexing') {
              setProgressDetails({
                currentVideo: progress.current_video,
                processed: progress.processed,
                total: progress.total,
                videos: progress.videos || {},
              });
            } else {
              clearInterval(intervalId);
              setProgressDetails(null);

              if (progress.status === 'complete' || progress.status === 'partial') {
                const label = progress.videos_indexed === 1 ? 'video indexed' : 'videos indexed';
                setStatus('success');
                setMessage(
                  `${progress.videos_indexed} ${label}` +
                    (progress.videos_skipped > 0 ? `, ${progress.videos_skipped} skipped` : ''),
                );
                onIngested(result.source_id, result.source_title);
              } else {
                setStatus('error');
                setMessage(progress.current_video || 'Ingestion failed.');
              }
            }
          } catch (err) {
            clearInterval(intervalId);
            setProgressDetails(null);
            setStatus('error');
            setMessage('Failed to get ingestion progress.');
          }
        }, 1500);
      } else {
        const label = result.videos_indexed === 1 ? 'video indexed' : 'videos indexed';
        setStatus('success');
        setMessage(
          `${result.videos_indexed} ${label}` +
            (result.videos_skipped > 0 ? `, ${result.videos_skipped} skipped` : ''),
        );
        onIngested(result.source_id, result.source_title);
      }
    } catch (error) {
      setStatus('error');
      setMessage(apiErrorMessage(error, 'Ingestion failed. Check the links.'));
    }
  }

  function handleShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      void handleSubmit();
    }
  }

  const videoEntries = progressDetails ? Object.values(progressDetails.videos) : [];
  const hasVideoList = videoEntries.length > 0;

  return (
    <form className="space-y-3 border-b border-white/[0.04] p-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          YouTube Link(s)
        </label>
        <textarea
          className="
            h-[88px] w-full resize-none rounded-[12px] border border-white/8 bg-[#191926]
            px-3 py-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            placeholder:italic transition-all duration-200
            focus:border-indigo-500/60 focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
          "
          onChange={(event) => setSourceUrl(event.target.value)}
          onKeyDown={handleShortcut}
          placeholder={'https://youtube.com/@channel\nhttps://youtube.com/playlist?list=...\nhttps://youtu.be/...'}
          value={sourceUrl}
        />
      </div>

      <Button
        className="w-full"
        disabled={disabled}
        icon={<Plus size={15} />}
        loading={status === 'loading'}
        size="md"
        type="submit"
      >
        {status === 'loading' ? 'Indexing...' : 'Index Source'}
      </Button>

      {status === 'loading' && (
        <div className="space-y-2">
          {/* Overall progress bar */}
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/5">
            {progressDetails && progressDetails.total > 0 ? (
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.round((progressDetails.processed / progressDetails.total) * 100)}%`,
                  background: 'linear-gradient(90deg, #6366F1, #06B6D4)',
                }}
              />
            ) : (
              <div
                className="h-full w-1/3 rounded-full"
                style={{
                  animation: 'progressSlide 1.4s ease-in-out infinite',
                  background: 'linear-gradient(90deg, transparent, #6366F1, transparent)',
                }}
              />
            )}
          </div>

          {/* Summary line */}
          {progressDetails && (
            <div className="flex justify-between px-0.5 font-mono text-[10px] text-[var(--text-muted)]">
              <span>
                {progressDetails.total > 0
                  ? `Processed ${progressDetails.processed} / ${progressDetails.total}`
                  : 'Resolving source...'}
              </span>
              {progressDetails.total > 0 && (
                <span>
                  {Math.round((progressDetails.processed / progressDetails.total) * 100)}%
                </span>
              )}
            </div>
          )}

          {/* Per-video progress list */}
          {hasVideoList && (
            <div
              className="space-y-0.5 overflow-y-auto rounded-[10px] border border-white/[0.04] bg-[#12121e] p-1.5"
              style={{ maxHeight: '160px' }}
            >
              {videoEntries.map((video, idx) => (
                <VideoProgressRow key={video.video_id} index={idx} video={video} />
              ))}
            </div>
          )}

          {/* Fallback: show current_video text if no per-video list available */}
          {!hasVideoList && progressDetails && (
            <div className="truncate px-0.5 font-sans text-[11px] italic text-[var(--text-secondary)] animate-[pulse_2s_infinite]">
              {progressDetails.currentVideo}
            </div>
          )}
        </div>
      )}

      {message && (
        <div
          className={`flex items-center gap-2 rounded-[8px] border px-3 py-2 text-[12px] font-medium ${
            status === 'success'
              ? 'border-emerald-500/15 bg-emerald-500/8 text-emerald-400'
              : 'border-red-500/15 bg-red-500/8 text-red-400'
          }`}
          style={status === 'success' ? { animation: 'successPop 0.4s cubic-bezier(0.22,1,0.36,1) both' } : undefined}
        >
          {status === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {message}
        </div>
      )}
    </form>
  );
}

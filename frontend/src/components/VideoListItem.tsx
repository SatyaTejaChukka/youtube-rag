import { Film, Play } from 'lucide-react';

import type { VideoSummary } from '../types';

interface Props {
  video: VideoSummary;
  onSelect?: (video: VideoSummary) => void;
}

export default function VideoListItem({ video, onSelect }: Props) {
  return (
    <button
      className={`group flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left transition-all duration-150 hover:bg-white/[0.04] active:scale-[0.98] ${
        onSelect && video.transcript_available ? 'cursor-pointer' : 'cursor-default'
      }`}
      disabled={!video.transcript_available}
      onClick={() => video.transcript_available && onSelect?.(video)}
      type="button"
    >
      <div className="relative h-[30px] w-[52px] shrink-0 overflow-hidden rounded-[5px] bg-[#1F1F30]">
        {video.thumbnail_url ? (
          <img
            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            src={video.thumbnail_url}
            alt={video.title}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={12} className="text-[var(--text-muted)]" />
          </div>
        )}
        {video.transcript_available && onSelect && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Play size={10} className="text-white" fill="white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`line-clamp-2 text-[11px] font-medium leading-snug ${
            video.transcript_available ? 'text-[var(--text-secondary)]' : 'italic text-[var(--text-muted)]'
          }`}
        >
          {video.title}
          {!video.transcript_available && ' - no transcript'}
        </p>
        {video.transcript_available && (
          <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{video.chunk_count} chunks</p>
        )}
      </div>
    </button>
  );
}


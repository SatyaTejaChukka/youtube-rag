import { Clock, ExternalLink, Film, PlayCircle } from 'lucide-react';

import type { SourceReference } from '../types';

interface Props {
  source: SourceReference;
  onSelect?: (videoId: string, videoTitle: string, startSeconds: number) => void;
}

export default function SourceCard({ source, onSelect }: Props) {
  return (
    <div
      className="
        group flex cursor-pointer gap-3 rounded-[14px] border border-white/8 bg-[#191926] p-2.5
        no-underline shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_12px_rgba(0,0,0,0.3)]
        transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
        hover:-translate-y-px hover:border-white/14 hover:bg-white/[0.025] active:scale-[0.995]
      "
      onClick={() => onSelect?.(source.video_id, source.video_title, source.start_seconds)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(source.video_id, source.video_title, source.start_seconds)}
    >
      <div className="relative h-[68px] w-[120px] shrink-0 overflow-hidden rounded-[8px] bg-[#1F1F30]">
        {source.thumbnail_url ? (
          <img
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            src={source.thumbnail_url}
            alt={source.video_title}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film size={20} className="text-[var(--text-muted)]" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <PlayCircle size={24} className="text-white drop-shadow-lg" />
        </div>

        <div className="absolute bottom-1.5 right-1.5 rounded-[4px] bg-black/85 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur-sm">
          {source.timestamp_label}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--text-primary)] transition-colors duration-150 group-hover:text-white">
          {source.video_title}
        </p>
        <p className="line-clamp-2 mt-1 text-[11px] leading-snug text-[var(--text-muted)]">{source.snippet}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[var(--accent-300)]">
            <Clock size={10} />
            <span className="font-mono text-[10px] font-medium">Jump to {source.timestamp_label}</span>
          </div>
          <a
            href={source.youtube_url}
            rel="noopener noreferrer"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            title="Open on YouTube"
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--accent-400)]"
          >
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}


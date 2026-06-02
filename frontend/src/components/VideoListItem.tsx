import { Film } from 'lucide-react';

import type { VideoSummary } from '../types';

export default function VideoListItem({ video }: { video: VideoSummary }) {
  return (
    <div className="group flex cursor-default items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors duration-150 hover:bg-white/[0.03]">
      <div className="h-[30px] w-[52px] shrink-0 overflow-hidden rounded-[5px] bg-[#1F1F30]">
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
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`line-clamp-2 text-[11px] font-medium leading-snug ${
            video.transcript_available ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] italic'
          }`}
        >
          {video.title}
          {!video.transcript_available && ' - no transcript'}
        </p>
        {video.transcript_available && (
          <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{video.chunk_count} chunks</p>
        )}
      </div>
    </div>
  );
}

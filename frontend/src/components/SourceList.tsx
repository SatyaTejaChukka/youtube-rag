import { useState } from 'react';

import type { SourceReference } from '../types';
import SourceCard from './SourceCard';

interface Props {
  sources: SourceReference[];
  onSelectSource?: (videoId: string, videoTitle: string, startSeconds: number) => void;
}

const INITIAL_SHOW = 3;

export default function SourceList({ sources, onSelectSource }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sources : sources.slice(0, INITIAL_SHOW);
  const hidden = sources.length - INITIAL_SHOW;

  return (
    <div className="space-y-2">
      {visible.map((source, index) => (
        <div
          key={`${source.video_id}-${source.start_seconds}-${index}`}
          className="fade-in-up"
          style={{ animationDelay: `${index * 0.06 + 0.1}s` }}
        >
          <SourceCard source={source} onSelect={onSelectSource} />
        </div>
      ))}

      {!expanded && hidden > 0 && (
        <button
          className="
            w-full rounded-[8px] border border-white/5 py-2 text-[11px] font-medium
            text-[var(--text-muted)] transition-all duration-150
            hover:border-white/10 hover:bg-white/[0.02] hover:text-[var(--text-secondary)]
          "
          onClick={() => setExpanded(true)}
          type="button"
        >
          +{hidden} more reference{hidden > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}


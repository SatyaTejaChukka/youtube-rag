import { Trash2 } from 'lucide-react';

import { IconButton } from './ui/IconButton';

interface Props {
  sourceTitle: string;
  onClear: () => void;
}

export default function TopBar({ sourceTitle, onClear }: Props) {
  return (
    <header
      className="z-30 flex h-14 shrink-0 items-center justify-between px-6"
      style={{
        background: 'rgba(13,13,20,0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            animation: 'glowPulse 2s ease-in-out infinite',
            background: 'var(--success)',
            boxShadow: '0 0 8px rgba(16,185,129,0.6)',
          }}
        />
        <span className="shrink-0 text-sm text-[var(--text-secondary)]">Asking about</span>
        <span className="line-clamp-1 max-w-xs truncate text-sm font-semibold text-[var(--text-primary)]" title={sourceTitle}>
          {sourceTitle}
        </span>
      </div>

      <IconButton onClick={onClear} title="Clear and load a different source" type="button" variant="danger">
        <Trash2 size={15} />
      </IconButton>
    </header>
  );
}

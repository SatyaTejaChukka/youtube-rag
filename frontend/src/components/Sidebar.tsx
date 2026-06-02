import { CSSProperties, useState } from 'react';
import { BookOpen, Clapperboard, Settings as SettingsIcon, Sparkles } from 'lucide-react';

import IndexedVideos from './IndexedVideos';
import IngestPanel from './IngestPanel';
import SettingsModal from './SettingsModal';

interface Props {
  sourceId: string | null;
  refreshKey: number;
  onIngested: (id: string, title: string) => void;
  style?: CSSProperties;
}

export default function Sidebar({ sourceId, refreshKey, onIngested, style }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <aside
        className="relative z-20 flex shrink-0 flex-col"
        style={{
          width: '280px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          ...style,
        }}
      >
        <header
          className="flex h-16 shrink-0 items-center gap-3 px-5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
              boxShadow: '0 0 16px rgba(99,102,241,0.4)',
            }}
          >
            <Clapperboard size={16} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">TubeRAG</span>
          <button 
            onClick={() => setShowSettings(true)}
            className="ml-auto flex items-center justify-center rounded p-1.5 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)] transition-colors"
            title="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </header>

        <IngestPanel onIngested={onIngested} />

        {sourceId ? (
          <>
            <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-4">
              <BookOpen size={11} className="text-[var(--text-muted)]" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Indexed Videos
              </span>
            </div>
            <IndexedVideos sourceId={sourceId} refreshKey={refreshKey} />
          </>
        ) : (
          <div className="flex-1" />
        )}

        <footer className="flex h-10 shrink-0 items-center px-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Sparkles size={10} className="text-[var(--accent-400)]" />
            Free stack ready
          </span>
        </footer>
      </aside>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

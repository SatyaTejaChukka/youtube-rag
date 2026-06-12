import { CSSProperties, useState, useEffect } from 'react';
import { BookOpen, Clapperboard, Settings as SettingsIcon, Cpu, AlertTriangle } from 'lucide-react';

import IndexedVideos from './IndexedVideos';
import IngestPanel from './IngestPanel';
import SettingsModal from './SettingsModal';
import type { VideoSummary } from '../types';
import { db } from '../db';
import { getHealth } from '../api/client';

interface Props {
  sourceId: string | null;
  refreshKey: number;
  onIngested: (id: string, title: string) => void;
  onSelectVideo?: (video: VideoSummary) => void;
  style?: CSSProperties;
}

export default function Sidebar({ sourceId, refreshKey, onIngested, onSelectVideo, style }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(true);

  const checkKeys = async () => {
    try {
      const keyRecord = await db.keys.get('groq');
      if (keyRecord?.apiKey) {
        setHasGroqKey(true);
        return;
      }
      const health = await getHealth();
      if (health.has_groq_api_key) {
        setHasGroqKey(true);
        return;
      }
      setHasGroqKey(false);
    } catch (error) {
      console.warn('Failed to check Groq API key configuration:', error);
      try {
        const keyRecord = await db.keys.get('groq');
        setHasGroqKey(!!keyRecord?.apiKey);
      } catch {
        setHasGroqKey(false);
      }
    }
  };

  useEffect(() => {
    if (!showSettings) {
      void checkKeys();
    }
  }, [showSettings]);

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

        {!hasGroqKey && (
          <div 
            onClick={() => setShowSettings(true)}
            className="mx-5 mt-4 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl flex gap-2.5 items-start cursor-pointer hover:bg-[#F59E0B]/15 transition-all group duration-200"
          >
            <AlertTriangle size={16} className="text-[#F59E0B] shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-[#F59E0B] group-hover:text-[#FBBF24]">
                Missing Groq API Key
              </span>
              <span className="text-[10px] text-white/60 leading-normal">
                Please click to open settings and configure your key.
              </span>
            </div>
          </div>
        )}
 
        <IngestPanel onIngested={onIngested} />

        {sourceId ? (
          <>
            <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-4">
              <BookOpen size={11} className="text-[var(--text-muted)]" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Indexed Videos
              </span>
            </div>
            <IndexedVideos sourceId={sourceId} refreshKey={refreshKey} onSelectVideo={onSelectVideo} />
          </>
        ) : (
          <div className="flex-1" />
        )}

        <footer className="flex h-10 shrink-0 items-center px-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Cpu size={10} className="text-[var(--accent-400)]" />
            Free stack ready
          </span>
        </footer>
      </aside>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

import { Film } from 'lucide-react';

const FEATURE_PILLS = ['Timestamped references', 'Grounded answers only', 'Any public source', 'Clickable video clips'];

export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="relative mb-8" style={{ animation: 'gentleFloat 4s ease-in-out infinite' }}>
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            animation: 'glowExpand 4s ease-in-out infinite',
            background: 'rgba(99,102,241,0.15)',
            filter: 'blur(24px)',
            transform: 'scale(1.5)',
          }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.10))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <Film size={36} style={{ color: 'var(--accent-300)' }} />
        </div>
      </div>

      <h2 className="delay-1 fade-in-up mb-3 font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        Your videos, <span className="gradient-text">answering back</span>
      </h2>
      <p className="delay-2 fade-in-up mb-8 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
        Paste a YouTube channel, playlist, or video link in the sidebar to index transcripts. Then ask any question and TubeRAG
        retrieves exactly where the answer lives.
      </p>
      <div className="delay-3 fade-in-up flex flex-wrap justify-center gap-2">
        {FEATURE_PILLS.map((feature) => (
          <span
            key={feature}
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              background: 'rgba(99,102,241,0.08)',
              borderColor: 'rgba(99,102,241,0.18)',
              color: 'var(--accent-300)',
            }}
          >
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-3" style={{ animation: 'assistantMessageIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/8 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20">
        <Sparkles size={12} className="text-[var(--accent-400)]" />
      </div>
      <div className="rounded-[4px_18px_18px_18px] border border-white/8 bg-[#191926] px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-[var(--accent-400)] opacity-60"
              style={{
                animation: 'typingBounce 1.2s ease-in-out infinite',
                animationDelay: `${index * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

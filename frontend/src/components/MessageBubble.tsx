import { Brain } from 'lucide-react';

import type { Message } from '../types';
import SourceList from './SourceList';

interface Props {
  message: Message;
  index: number;
}

export default function MessageBubble({ message, index }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        animation: isUser
          ? 'userMessageIn 0.4s cubic-bezier(0.22,1,0.36,1) both'
          : 'assistantMessageIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: `${index * 0.04}s`,
      }}
    >
      <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/8 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20">
            <Brain size={12} className="text-[var(--accent-400)]" />
          </div>
        )}

        <div
          className={`max-w-[80%] whitespace-pre-wrap text-sm leading-relaxed ${
            isUser
              ? 'rounded-[18px_18px_4px_18px] bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-4 py-3 text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]'
              : 'rounded-[4px_18px_18px_18px] border border-white/8 bg-[#191926] px-4 py-3.5 text-[var(--text-primary)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(0,0,0,0.4)]'
          }`}
        >
          {message.content}
        </div>
      </div>

      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="ml-10">
          <p className="mb-2 pl-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Referenced in
          </p>
          <SourceList sources={message.sources} />
        </div>
      )}
    </div>
  );
}

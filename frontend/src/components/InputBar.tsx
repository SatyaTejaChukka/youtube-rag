import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [text]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-white/[0.04] bg-[var(--bg-base)]/80 px-6 pb-4 pt-3 backdrop-blur-2xl">
      <div
        className={`flex items-end gap-3 rounded-[16px] border bg-[#191926] px-4 py-3.5 transition-all duration-200 ${
          hasText && !disabled ? 'border-indigo-500/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]' : 'border-white/8'
        }`}
      >
        <textarea
          ref={textareaRef}
          className="
            max-h-[120px] min-h-[22px] flex-1 resize-none bg-transparent
            text-sm leading-[1.55] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            focus:outline-none disabled:opacity-50
          "
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about the indexed videos..."
          rows={1}
          value={text}
        />

        <button
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
            hasText && !disabled
              ? 'bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-[0_2px_12px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95'
              : 'cursor-not-allowed bg-white/6 opacity-40'
          }`}
          disabled={!hasText || disabled}
          onClick={handleSend}
          type="button"
        >
          <Send size={15} className="-translate-x-px text-white" />
        </button>
      </div>

      <p className="mt-2 text-center font-mono text-[10px] text-[var(--text-muted)]">Enter send - Shift+Enter new line</p>
    </div>
  );
}

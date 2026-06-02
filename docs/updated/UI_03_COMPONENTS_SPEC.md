# UI Components Specification

Every component below includes: visual description, states, exact class strings, and full TSX code. Build each component exactly as specified.

---

## 1. Button Component — `src/components/ui/Button.tsx`

### Visual Spec
Three variants: `primary` (accent filled), `ghost` (transparent), `danger` (red tint).

```
Primary:
  - Background: linear-gradient(135deg, #6366F1, #4F46E5)
  - Border: none
  - Text: white, font-600, text-sm
  - Height: 40px
  - Padding: 0 20px
  - Radius: 10px
  - Shadow: 0 1px 0 rgba(255,255,255,0.12) inset, 0 4px 16px rgba(99,102,241,0.3)
  - Hover: brightness(1.1), shadow expands
  - Active: scale(0.98)
  - Disabled: opacity-40, cursor-not-allowed, no hover effects
  - Loading: shows Loader2 spinner instead of children

Ghost:
  - Background: transparent
  - Border: 1px solid var(--border-default)
  - Text: var(--text-secondary)
  - Hover: bg rgba(255,255,255,0.04), border-strong, text-primary

Danger:
  - Background: rgba(239,68,68,0.08)
  - Border: 1px solid rgba(239,68,68,0.2)
  - Text: #EF4444
  - Hover: bg rgba(239,68,68,0.16), border rgba(239,68,68,0.4)
```

```tsx
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variants = {
  primary: `
    bg-gradient-to-br from-accent-500 to-accent-600 text-white
    shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_16px_rgba(99,102,241,0.3)]
    hover:brightness-110 hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_6px_24px_rgba(99,102,241,0.4)]
    active:scale-[0.98] border-0
  `,
  ghost: `
    bg-transparent text-[var(--text-secondary)]
    border border-white/8
    hover:bg-white/[0.03] hover:border-white/14 hover:text-[var(--text-primary)]
    active:scale-[0.98]
  `,
  danger: `
    bg-red-500/8 text-red-400
    border border-red-500/20
    hover:bg-red-500/16 hover:border-red-500/40
    active:scale-[0.98]
  `,
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-body font-semibold
        rounded-[10px] transition-all duration-150 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        select-none whitespace-nowrap
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  )
}
```

---

## 2. IconButton — `src/components/ui/IconButton.tsx`

```tsx
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger'
  size?: 'sm' | 'md'
}

export function IconButton({ variant = 'default', size = 'md', className = '', ...props }: IconButtonProps) {
  const base = `
    inline-flex items-center justify-center rounded-[8px]
    transition-all duration-150 cursor-pointer
    disabled:opacity-40 disabled:cursor-not-allowed
  `
  const variantClass = variant === 'danger'
    ? 'text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/8'
    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'

  const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'

  return (
    <button className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props} />
  )
}
```

---

## 3. IngestPanel — `src/components/IngestPanel.tsx`

### Visual Spec
```
Container: padding 16px, border-bottom 1px solid border-subtle
Label: PLAYLIST URL — uppercase, mono, 10px, text-muted, tracking-widest

Textarea:
  - Height: 88px (3 rows)
  - Background: var(--bg-elevated) #191926
  - Border: 1px solid var(--border-default)
  - Radius: 12px
  - Font: Outfit 13px
  - Padding: 12px
  - Placeholder: text-muted, italic
  - Focus: border-color accent-500, box-shadow 0 0 0 3px rgba(99,102,241,0.15)
  - Transition: all 200ms

Submit Button:
  - Full width
  - variant="primary"
  - Loading state shows spinner + "Indexing…"
  - Non-loading: "Index Playlist" with Plus icon

Status messages:
  - Success: green pill with CheckCircle2 icon, text-xs
  - Error: red pill with AlertCircle icon, text-xs
  - Loading: animated progress bar below button (indeterminate)
```

```tsx
import { useState } from 'react'
import { Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/Button'
import { ingestPlaylist } from '../api/client'

interface Props {
  onIngested: (playlistId: string, title: string) => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function IngestPanel({ onIngested }: Props) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    if (!url.trim() || status === 'loading') return
    setStatus('loading')
    setMessage('')
    try {
      const result = await ingestPlaylist(url.trim())
      setStatus('success')
      setMessage(
        `${result.videos_indexed} videos indexed` +
        (result.videos_skipped > 0 ? `, ${result.videos_skipped} skipped` : '')
      )
      onIngested(result.playlist_id, result.playlist_title)
    } catch (err: any) {
      setStatus('error')
      setMessage(err?.response?.data?.detail || 'Ingestion failed. Check the URL.')
    }
  }

  return (
    <div className="p-4 border-b border-white/[0.04] space-y-3">
      {/* Label */}
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-medium">
        Playlist URL
      </label>

      {/* Textarea */}
      <textarea
        rows={3}
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://youtube.com/playlist?list=PL..."
        className="
          w-full resize-none rounded-[12px] px-3 py-3
          bg-[#191926] border border-white/8
          font-body text-[13px] text-[var(--text-primary)]
          placeholder:text-[var(--text-muted)] placeholder:italic
          focus:outline-none focus:border-accent-500/60
          focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
          transition-all duration-200
          scrollbar-none
        "
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
      />

      {/* Submit Button */}
      <Button
        variant="primary"
        size="md"
        loading={status === 'loading'}
        icon={<Plus size={15} />}
        onClick={handleSubmit}
        disabled={!url.trim()}
        className="w-full"
      >
        {status === 'loading' ? 'Indexing…' : 'Index Playlist'}
      </Button>

      {/* Indeterminate progress bar during loading */}
      {status === 'loading' && (
        <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-accent-500 rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
          <style>{`
            @keyframes slide {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className={`
          flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] font-medium
          ${status === 'success'
            ? 'bg-emerald-500/8 text-emerald-400 border border-emerald-500/15'
            : 'bg-red-500/8 text-red-400 border border-red-500/15'
          }
        `}>
          {status === 'success'
            ? <CheckCircle2 size={13} />
            : <AlertCircle size={13} />
          }
          {message}
        </div>
      )}
    </div>
  )
}
```

---

## 4. VideoListItem — `src/components/VideoListItem.tsx`

```
Height: ~56px
Padding: 8px
Radius: 8px
Layout: horizontal flex

Left: thumbnail (52×30px, rounded-md, object-cover)
      — if no thumbnail: gradient placeholder with Film icon
Right: title (2 lines, text-xs, text-primary, font-500)
       chunk count (text-[10px], mono, text-muted)

States:
  - Default: transparent bg
  - Hover: bg rgba(255,255,255,0.03), border border-white/5

No-transcript videos: opacity-50, italic title suffix "(no transcript)"
```

```tsx
import { Film } from 'lucide-react'
import type { VideoSummary } from '../types'

export default function VideoListItem({ video }: { video: VideoSummary }) {
  return (
    <div className="
      flex items-center gap-2.5 px-3 py-2 rounded-[8px]
      hover:bg-white/[0.03] transition-colors duration-150 group cursor-default
    ">
      {/* Thumbnail */}
      <div className="w-[52px] h-[30px] rounded-[5px] overflow-hidden shrink-0 bg-[#1F1F30]">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={12} className="text-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={`
          text-[11px] font-medium leading-snug line-clamp-2
          ${video.transcript_available ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] italic'}
        `}>
          {video.title}
          {!video.transcript_available && ' · no transcript'}
        </p>
        {video.transcript_available && (
          <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
            {video.chunk_count} chunks
          </p>
        )}
      </div>
    </div>
  )
}
```

---

## 5. ChatWindow — `src/components/ChatWindow.tsx`

```
Flex column, fills remaining height
Scrollable message area + fixed InputBar at bottom
```

```tsx
import { useState, useRef, useEffect } from 'react'
import { askQuestion } from '../api/client'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import TypingIndicator from './TypingIndicator'
import type { Message } from '../types'

export default function ChatWindow({ playlistId }: { playlistId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const result = await askQuestion(text, playlistId)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Something went wrong retrieving an answer. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 pt-8 pb-4">
          {messages.length === 0 ? (
            <ChatEmptyHint />
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble key={msg.id} message={msg} index={i} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={loading} />
    </div>
  )
}

/* Shown when chat is empty */
function ChatEmptyHint() {
  const hints = [
    'What are the main topics covered in this playlist?',
    'What does the creator say about getting started?',
    'Summarize the key takeaways from these videos.',
  ]
  return (
    <div className="pt-12 space-y-6 fade-in-up">
      <p className="text-center text-[var(--text-muted)] text-sm">
        Ask anything about the indexed videos
      </p>
      <div className="flex flex-col gap-2 max-w-md mx-auto">
        {hints.map(hint => (
          <div key={hint}
            className="
              px-4 py-2.5 rounded-[10px] border border-white/6 bg-white/[0.02]
              text-sm text-[var(--text-muted)] cursor-default
              hover:border-white/10 hover:text-[var(--text-secondary)] hover:bg-white/[0.04]
              transition-all duration-150
            "
          >
            "{hint}"
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 6. MessageBubble — `src/components/MessageBubble.tsx`

### Visual Spec
```
User message:
  - Align: right (flex items-end)
  - Bubble bg: linear-gradient(135deg, #6366F1, #4F46E5)
  - Text: white, text-sm, leading-relaxed
  - Radius: 18px 18px 4px 18px (sharp bottom-right corner)
  - Shadow: 0 4px 16px rgba(99,102,241,0.3)
  - Max-width: 80%
  - Padding: 12px 16px
  - Entrance: slide in from right, fade up

Assistant message:
  - Align: left
  - Bubble bg: var(--bg-elevated) #191926
  - Border: 1px solid var(--border-default)
  - Text: var(--text-primary), text-sm, leading-relaxed
  - Radius: 4px 18px 18px 18px (sharp top-left corner)
  - Shadow: var(--shadow-card)
  - Max-width: 100% (full column width to accommodate sources)
  - Padding: 14px 16px

Avatar dot (assistant only):
  - 8px circle, bg accent-500, left of message
  - With Sparkles icon 10px inside

Sources appear BELOW the message bubble, not inside it
Staggered animation: each message animates in with a small delay
```

```tsx
import { Sparkles } from 'lucide-react'
import SourceList from './SourceList'
import type { Message } from '../types'

interface Props {
  message: Message
  index: number
}

export default function MessageBubble({ message, index }: Props) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex flex-col gap-3 fade-in-up`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>

        {/* Assistant avatar */}
        {!isUser && (
          <div className="
            w-7 h-7 rounded-full shrink-0 mb-0.5
            bg-gradient-to-br from-accent-500/20 to-cyan-500/20
            border border-white/8 flex items-center justify-center
          ">
            <Sparkles size={12} className="text-accent-400" />
          </div>
        )}

        {/* Bubble */}
        <div className={`
          max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap
          ${isUser ? `
            bg-gradient-to-br from-accent-500 to-accent-600
            text-white rounded-[18px_18px_4px_18px]
            shadow-[0_4px_16px_rgba(99,102,241,0.3)]
            px-4 py-3
          ` : `
            bg-[#191926] text-[var(--text-primary)]
            border border-white/8
            rounded-[4px_18px_18px_18px]
            shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(0,0,0,0.4)]
            px-4 py-3.5
          `}
        `}>
          {message.content}
        </div>
      </div>

      {/* Sources below assistant message */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="ml-10">
          <p className="
            text-[10px] font-mono uppercase tracking-[0.15em]
            text-[var(--text-muted)] mb-2 pl-0.5
          ">
            Referenced in
          </p>
          <SourceList sources={message.sources} />
        </div>
      )}
    </div>
  )
}
```

---

## 7. InputBar — `src/components/InputBar.tsx`

### Visual Spec
```
Container:
  - Height: auto, min 80px
  - Padding: 12px 24px 16px
  - Border-top: 1px solid var(--border-subtle)
  - Background: rgba(13,13,20,0.8) with backdrop-blur(16px)
  - Sticky at bottom

Input wrapper:
  - Background: var(--bg-elevated) #191926
  - Border: 1px solid var(--border-default)
  - Radius: 16px
  - Padding: 14px 16px
  - Focus-within: border accent-500/40, shadow 0 0 0 3px rgba(99,102,241,0.1)
  - Transition: all 200ms

Textarea:
  - Min height: 22px (1 line)
  - Max height: 120px (auto-resize)
  - Font: Outfit 14px
  - No resize handle
  - Grows as user types

Right side:
  - Send button: 36px circle
  - Background when has text: accent gradient
  - Background when empty: white/6
  - Icon: Send size 15, rotated -45deg for visual pop
  - Hover: scale(1.05)
  - Active: scale(0.95)

Hint text below input:
  - "⌘↵ to send" — font-mono, 10px, text-muted
```

```tsx
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [text])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div className="
      shrink-0 px-6 pt-3 pb-4
      bg-[var(--bg-base)]/80 backdrop-blur-2xl
      border-t border-white/[0.04]
    ">
      {/* Input wrapper */}
      <div className={`
        flex items-end gap-3 rounded-[16px] px-4 py-3.5
        bg-[#191926] border transition-all duration-200
        ${hasText && !disabled
          ? 'border-accent-500/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'
          : 'border-white/8'
        }
      `}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Ask anything about the indexed videos…"
          className="
            flex-1 min-h-[22px] max-h-[120px] resize-none bg-transparent
            font-body text-sm text-[var(--text-primary)]
            placeholder:text-[var(--text-muted)]
            focus:outline-none disabled:opacity-50
            leading-[1.55]
          "
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!hasText || disabled}
          className={`
            w-9 h-9 rounded-full shrink-0 flex items-center justify-center
            transition-all duration-200
            ${hasText && !disabled
              ? 'bg-gradient-to-br from-accent-500 to-accent-600 shadow-[0_2px_12px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95'
              : 'bg-white/6 cursor-not-allowed opacity-40'
            }
          `}
        >
          <Send size={15} className="text-white -translate-x-px" />
        </button>
      </div>

      {/* Bottom hint */}
      <p className="text-center font-mono text-[10px] text-[var(--text-muted)] mt-2">
        ↵ send &nbsp;·&nbsp; ⇧↵ new line
      </p>
    </div>
  )
}
```

---

## 8. TypingIndicator — `src/components/TypingIndicator.tsx`

Three animated dots inside assistant-style bubble.

```
Bubble: same style as assistant message (bg-elevated, border, rounded)
Width: auto (fits 3 dots + padding)
Dots: 6px circles, accent-400 color
Animation: staggered bounce, each dot 0.15s apart
```

```tsx
export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 fade-in-up">
      {/* Avatar */}
      <div className="
        w-7 h-7 rounded-full shrink-0
        bg-gradient-to-br from-accent-500/20 to-cyan-500/20
        border border-white/8 flex items-center justify-center
      ">
        <span className="text-[10px]">✦</span>
      </div>

      {/* Dots bubble */}
      <div className="
        px-4 py-3.5 rounded-[4px_18px_18px_18px]
        bg-[#191926] border border-white/8
        shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(0,0,0,0.4)]
      ">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent-400 opacity-60"
              style={{
                animation: 'typingBounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30%            { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
```

---

## 9. SourceList — `src/components/SourceList.tsx`

```
Vertical stack
Gap: 8px
Max shown: 5 sources
"Show more" if > 5 (collapses extras)
```

```tsx
import { useState } from 'react'
import SourceCard from './SourceCard'
import type { SourceReference } from '../types'

const INITIAL_SHOW = 3

export default function SourceList({ sources }: { sources: SourceReference[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? sources : sources.slice(0, INITIAL_SHOW)
  const hidden = sources.length - INITIAL_SHOW

  return (
    <div className="space-y-2">
      {visible.map((source, i) => (
        <div
          key={`${source.video_id}-${source.start_seconds}`}
          className="fade-in-up"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <SourceCard source={source} />
        </div>
      ))}

      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="
            w-full py-2 text-[11px] font-medium text-[var(--text-muted)]
            border border-white/5 rounded-[8px]
            hover:border-white/10 hover:text-[var(--text-secondary)] hover:bg-white/[0.02]
            transition-all duration-150
          "
        >
          +{hidden} more reference{hidden > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
```

---

## 10. SourceCard — `src/components/SourceCard.tsx`

### Visual Spec — Most Visually Critical Component
```
Container:
  - Background: var(--bg-elevated) #191926
  - Border: 1px solid var(--border-default)
  - Radius: 14px
  - Padding: 10px
  - Cursor: pointer (opens YouTube in new tab)
  - Hover:
    · border-color: rgba(255,255,255,0.14)
    · background: rgba(255,255,255,0.015) brighter
    · thumbnail scale(1.03)
    · play overlay fades in
    · translate-y: -1px (subtle lift)
  - Transition: all 200ms cubic-bezier(0.22,1,0.36,1)
  - Active: scale(0.995)

Left — Thumbnail (120×68px):
  - Radius: 8px
  - Object-cover
  - Overflow: hidden
  - Relative container for overlays

  Timestamp badge (ALWAYS visible):
    - Position: absolute bottom-1.5 right-1.5
    - Background: rgba(0,0,0,0.85)
    - Font: JetBrains Mono, 10px, font-500
    - Text: white
    - Padding: 2px 6px
    - Radius: 4px
    - Backdrop-filter: blur(4px)

  Play overlay (hover only):
    - Full cover of thumbnail
    - Background: rgba(0,0,0,0.4)
    - Fade in on parent hover
    - Center: play circle icon, white, 24px

Right — Info:
  - title: Outfit 12px, font-600, text-primary, 2-line clamp
  - snippet: Outfit 11px, text-muted, 2-line clamp, mt-1.5
  - footer row: clock icon 10px + timestamp label + external link icon
    - Font: JetBrains Mono 10px, text-accent-300
    - mt-2

Gradient border on hover (optional enhancement):
  - Use pseudo-element or outline trick to show a subtle gradient border
```

```tsx
import { Clock, PlayCircle, ExternalLink, Film } from 'lucide-react'
import type { SourceReference } from '../types'

export default function SourceCard({ source }: { source: SourceReference }) {
  return (
    <a
      href={source.youtube_url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group flex gap-3 p-2.5 rounded-[14px]
        bg-[#191926] border border-white/8
        hover:border-white/14 hover:bg-white/[0.025]
        hover:-translate-y-px active:scale-[0.995]
        transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]
        shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_4px_12px_rgba(0,0,0,0.3)]
        cursor-pointer no-underline block
      "
    >
      {/* Thumbnail */}
      <div className="w-[120px] h-[68px] rounded-[8px] overflow-hidden shrink-0 relative bg-[#1F1F30]">
        {source.thumbnail_url ? (
          <img
            src={source.thumbnail_url}
            alt={source.video_title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={20} className="text-[var(--text-muted)]" />
          </div>
        )}

        {/* Play overlay — appears on hover */}
        <div className="
          absolute inset-0 bg-black/40 rounded-[8px]
          flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
        ">
          <PlayCircle size={24} className="text-white drop-shadow-lg" />
        </div>

        {/* Timestamp badge — always visible */}
        <div className="
          absolute bottom-1.5 right-1.5
          bg-black/85 backdrop-blur-sm
          font-mono text-[10px] font-medium text-white
          px-1.5 py-0.5 rounded-[4px]
        ">
          {source.timestamp_label}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        {/* Title */}
        <p className="
          text-[12px] font-semibold leading-snug line-clamp-2
          text-[var(--text-primary)]
          group-hover:text-white transition-colors duration-150
        ">
          {source.video_title}
        </p>

        {/* Snippet */}
        <p className="text-[11px] text-[var(--text-muted)] leading-snug line-clamp-2 mt-1">
          {source.snippet}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-accent-300">
            <Clock size={10} />
            <span className="font-mono text-[10px] font-medium">
              Jump to {source.timestamp_label}
            </span>
          </div>
          <ExternalLink size={10} className="text-[var(--text-muted)] group-hover:text-accent-400 transition-colors" />
        </div>
      </div>
    </a>
  )
}
```

---

## 11. SkeletonLoader — `src/components/ui/Skeleton.tsx`

Used when fetching indexed videos list.

```tsx
export function SkeletonVideoItem() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <div className="w-[52px] h-[30px] rounded-[5px] skeleton shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-full skeleton rounded-full" />
        <div className="h-2.5 w-2/3 skeleton rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonSourceCard() {
  return (
    <div className="flex gap-3 p-2.5 rounded-[14px] bg-[#191926] border border-white/8">
      <div className="w-[120px] h-[68px] skeleton rounded-[8px] shrink-0" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3 w-full skeleton rounded-full" />
        <div className="h-3 w-3/4 skeleton rounded-full" />
        <div className="h-2.5 w-1/2 skeleton rounded-full mt-auto" />
      </div>
    </div>
  )
}
```

---

## 12. IndexedVideos Sidebar Panel — `src/components/IndexedVideos.tsx`

```tsx
import { useEffect, useState } from 'react'
import { getSources } from '../api/client'
import VideoListItem from './VideoListItem'
import { SkeletonVideoItem } from './ui/Skeleton'
import type { VideoSummary } from '../types'

export default function IndexedVideos({ playlistId }: { playlistId: string }) {
  const [videos, setVideos] = useState<VideoSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSources(playlistId)
      .then(d => setVideos(d.videos || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [playlistId])

  return (
    <div className="flex-1 overflow-y-auto pb-2">
      {loading ? (
        <div className="space-y-0.5 px-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonVideoItem key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <p className="px-5 text-[11px] text-[var(--text-muted)] italic">
          No videos indexed yet.
        </p>
      ) : (
        <div className="px-2 space-y-0.5">
          {videos.map((v, i) => (
            <div key={v.video_id} className="fade-in-up" style={{ animationDelay: `${i * 0.03}s` }}>
              <VideoListItem video={v} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

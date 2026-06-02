# Animations & Micro-Interactions Specification

Every animation in TubeRAG is intentional — it communicates state, guides attention, and makes the interface feel alive without being distracting. This document is the definitive reference for all motion.

---

## Animation Principles

| Principle | Rule |
|---|---|
| **Purpose-driven** | Every animation communicates something — state change, arrival, feedback |
| **Fast entrances** | Elements appear in 350–500ms. Never longer. |
| **Easing** | Always use `cubic-bezier(0.22, 1, 0.36, 1)` for entrances (fast start, soft overshoot). `ease` for hover. `ease-in` for exits. |
| **Subtlety** | Translate distances max 16px. Scale range max 2%. Never full-screen wipes. |
| **Respect `prefers-reduced-motion`** | All decorative animations must be disabled when user prefers reduced motion. |

```css
/* Wrap all non-essential animations */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 1. Page / Shell Entrance

When the app first loads, the shell animates in as a single orchestrated sequence.

```css
/* Sidebar slides in from left */
@keyframes sidebarEnter {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* Main content fades in with delay */
@keyframes mainEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```tsx
// In App.tsx — apply on mount
<aside
  style={{ animation: 'sidebarEnter 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
>
<main
  style={{ animation: 'mainEnter 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}
>
```

---

## 2. Message Entrance Animation

Each message that appears in the chat must animate in. The specific style differs by role.

### User Message
```css
@keyframes userMessageIn {
  from {
    opacity: 0;
    transform: translateX(20px) translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0) scale(1);
  }
}
```

### Assistant Message
```css
@keyframes assistantMessageIn {
  from {
    opacity: 0;
    transform: translateX(-12px) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}
```

```tsx
// Apply in MessageBubble.tsx on the outer div
<div
  style={{
    animation: isUser
      ? 'userMessageIn 0.4s cubic-bezier(0.22,1,0.36,1) both'
      : 'assistantMessageIn 0.4s cubic-bezier(0.22,1,0.36,1) both'
  }}
>
```

---

## 3. Source Card Stagger

When source cards appear below an assistant message, they stagger in one after another.

```tsx
// In SourceList.tsx — already included
{visible.map((source, i) => (
  <div
    key={...}
    className="fade-in-up"
    style={{ animationDelay: `${i * 0.06 + 0.1}s` }}  // +0.1s after message appears
  >
    <SourceCard source={source} />
  </div>
))}
```

---

## 4. Typing Indicator (Three Dots)

The three dots inside the TypingIndicator bubble use a sequential bounce:

```css
@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0px);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

/* Applied with staggered delay per dot */
dot-0: animation-delay: 0s
dot-1: animation-delay: 0.18s
dot-2: animation-delay: 0.36s
```

Bubble itself animates in with the same assistant entrance as a message.

---

## 5. Ingest Progress Bar

During ingestion (status === 'loading'), an indeterminate progress bar slides under the submit button.

```css
@keyframes progressSlide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
```

```tsx
{status === 'loading' && (
  <div className="h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
    <div
      className="h-full w-1/3 rounded-full"
      style={{
        background: 'linear-gradient(90deg, transparent, #6366F1, transparent)',
        animation: 'progressSlide 1.4s ease-in-out infinite',
      }}
    />
  </div>
)}
```

---

## 6. Send Button State Transition

The send button transforms between two visual states as the user types.

```
Empty input:
  - bg: rgba(255,255,255,0.06)
  - opacity: 0.4
  - cursor: not-allowed

Has text:
  - bg: gradient-brand
  - opacity: 1
  - shadow: 0 2px 12px rgba(99,102,241,0.4)
  - cursor: pointer

On hover (has text):
  - scale: 1.05
  - shadow: 0 4px 20px rgba(99,102,241,0.6)

On click:
  - scale: 0.95 (duration: 100ms)
  - return to 1.0 (duration: 100ms)
```

All transitions use `transition: all 200ms ease`.

---

## 7. Sidebar Video Item Hover

```
Default:  background transparent
Hover:    background rgba(255,255,255,0.03), transition 150ms ease
          thumbnail opacity: 80% → 100%
Active:   scale(0.99)
```

---

## 8. SourceCard Hover Sequence

This is the most detailed hover in the UI — it should feel premium.

```
T+0ms:   border-color transitions to rgba(255,255,255,0.14)
T+0ms:   background transitions to rgba(255,255,255,0.025)
T+0ms:   translate-y: 0 → -1px (card lifts)
T+0ms:   shadow deepens slightly

T+0ms:   thumbnail scale begins: 1.0 → 1.04 (200ms, ease)
T+100ms: play overlay fades in (opacity: 0 → 1)
T+0ms:   ExternalLink icon color transitions to accent-400

On mouseout: all reverse simultaneously in 200ms
```

---

## 9. Success State Animation (after ingest)

When ingestion completes successfully:

```css
@keyframes successPop {
  0%   { transform: scale(0.8);  opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1.0);  opacity: 1; }
}
```

```tsx
{status === 'success' && (
  <div
    className="flex items-center gap-2 ..."
    style={{ animation: 'successPop 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
  >
    <CheckCircle2 ... />
    {message}
  </div>
)}
```

---

## 10. Skeleton Shimmer

Already defined in `globals.css`. Runs during:
- Loading indexed videos list (sidebar)
- Any async data fetch

```css
@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #191926 25%,
    rgba(255,255,255,0.04) 50%,
    #191926 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.8s ease infinite;
}
```

---

## 11. Input Focus Glow

When the InputBar's textarea is focused (or has text):

```
Transition: border-color, box-shadow — 200ms ease

Focused or has-text state:
  border-color: rgba(99,102,241,0.4)
  box-shadow: 0 0 0 3px rgba(99,102,241,0.08)
```

---

## 12. Empty State Decorative Animation

The large icon container on the empty state subtly floats:

```css
@keyframes gentleFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
```

```tsx
// Applied to the icon container div
<div
  className="relative ..."
  style={{ animation: 'gentleFloat 4s ease-in-out infinite' }}
>
```

Also, the outer glow ring pulses:
```css
@keyframes glowExpand {
  0%, 100% { opacity: 0.3; transform: scale(1.5); }
  50%       { opacity: 0.5; transform: scale(1.7); }
}
```

---

## 13. Hint Item Hover (Empty Chat State)

```
Default: border white/6, bg white/2, text-muted
Hover:   border white/10, bg white/4, text-secondary
         subtle translate-x: 2px on hover (nudge right)
Transition: 150ms ease
```

---

## 14. Tooltip (future enhancement)

When adding tooltips to icon buttons:
```
Appear after 600ms hover delay (use CSS delay on opacity transition)
Direction: prefer top-center
Fade in: 150ms
Background: var(--bg-overlay)
Border: var(--border-strong)
Font: Outfit 11px
Padding: 4px 8px
Radius: 6px
Shadow: var(--shadow-md)
```

---

## Complete CSS Keyframes Reference

Add all of these to `globals.css`:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes userMessageIn {
  from { opacity: 0; transform: translateX(20px) translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0) translateY(0) scale(1); }
}

@keyframes assistantMessageIn {
  from { opacity: 0; transform: translateX(-12px) translateY(8px); }
  to   { opacity: 1; transform: translateX(0) translateY(0); }
}

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-5px); opacity: 1; }
}

@keyframes progressSlide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

@keyframes successPop {
  0%   { transform: scale(0.8); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1.0); opacity: 1; }
}

@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@keyframes gentleFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}

@keyframes glowExpand {
  0%, 100% { opacity: 0.3; transform: scale(1.5); }
  50%       { opacity: 0.5; transform: scale(1.7); }
}

@keyframes sidebarEnter {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

@keyframes mainEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## Timing Quick Reference

| Interaction | Duration | Easing |
|---|---|---|
| Shell entrance | 500ms | `cubic-bezier(0.22,1,0.36,1)` |
| Message entrance | 400ms | `cubic-bezier(0.22,1,0.36,1)` |
| Stagger between messages | 40ms delay | — |
| Stagger between source cards | 60ms delay | — |
| Button hover | 150ms | `ease` |
| Button active (press) | 100ms | `ease` |
| Card hover (lift, border) | 200ms | `ease` |
| Thumbnail zoom on hover | 300ms | `ease` |
| Play overlay fade | 200ms | `ease` |
| Input focus glow | 200ms | `ease` |
| Success pop | 400ms | `cubic-bezier(0.22,1,0.36,1)` |
| Typing dots bounce | 1200ms | `ease-in-out` infinite |
| Progress bar slide | 1400ms | `ease-in-out` infinite |
| Skeleton shimmer | 1800ms | `ease` infinite |
| Float (empty state icon) | 4000ms | `ease-in-out` infinite |

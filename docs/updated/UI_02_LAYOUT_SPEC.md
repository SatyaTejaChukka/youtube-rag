# UI Layout Specification

## Overall Shell

The app is a single-page, full-viewport layout. No page scrolling — all scrolling is scoped to individual panels.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (280px fixed)          │  MAIN AREA (flex-1)                       │
│                                 │                                           │
│  ┌─────────────────────────┐   │  ┌────────────────────────────────────┐   │
│  │  LOGO HEADER (64px)     │   │  │  TOP BAR (56px)                    │   │
│  └─────────────────────────┘   │  └────────────────────────────────────┘   │
│  ┌─────────────────────────┐   │  ┌────────────────────────────────────┐   │
│  │  INGEST SECTION         │   │  │                                    │   │
│  │  (URL input + button    │   │  │  CHAT AREA (flex-1, scrollable)    │   │
│  │   + status)             │   │  │                                    │   │
│  └─────────────────────────┘   │  │  Messages centered, max-w 720px    │   │
│  ┌─────────────────────────┐   │  │                                    │   │
│  │  DIVIDER + label        │   │  └────────────────────────────────────┘   │
│  └─────────────────────────┘   │  ┌────────────────────────────────────┐   │
│  ┌─────────────────────────┐   │  │  INPUT BAR (80px)                  │   │
│  │  INDEXED VIDEOS LIST    │   │  └────────────────────────────────────┘   │
│  │  (flex-1, scrollable)   │   │                                           │
│  └─────────────────────────┘   │                                           │
│  ┌─────────────────────────┐   │                                           │
│  │  FOOTER (40px)          │   │                                           │
│  └─────────────────────────┘   │                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## App Shell — `App.tsx`

```tsx
// Full layout structure
<div className="flex h-screen w-screen overflow-hidden bg-base">

  {/* Ambient background glow — positioned absolute behind everything */}
  <div className="pointer-events-none fixed inset-0 z-0">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]
                    bg-gradient-to-b from-accent-500/8 to-transparent blur-3xl" />
    <div className="absolute bottom-0 right-0 w-[600px] h-[400px]
                    bg-gradient-to-tl from-cyan-500/5 to-transparent blur-3xl" />
  </div>

  {/* Sidebar */}
  <Sidebar
    playlistId={playlistId}
    playlistTitle={playlistTitle}
    onIngested={(id, title) => { setPlaylistId(id); setPlaylistTitle(title); }}
  />

  {/* Main panel — vertical flex column */}
  <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
    {playlistId ? (
      <>
        <TopBar playlistTitle={playlistTitle} />
        <ChatArea playlistId={playlistId} />
      </>
    ) : (
      <EmptyState />
    )}
  </main>

</div>
```

---

## Sidebar — Detailed Spec

```
Width: 280px fixed
Background: var(--bg-surface) #12121C
Right border: 1px solid var(--border-subtle)
Flex direction: column
No horizontal scroll
Z-index: 20 (above main content)
```

### Sidebar Sections (top to bottom):

#### 1. Logo Header — `height: 64px`
```
Padding: 20px 20px
Content: [YouTube icon, gradient] + "TubeRAG" in Syne font + version badge
Border-bottom: 1px solid var(--border-subtle)
```

```tsx
// Logo header visual structure
<header className="flex items-center gap-3 px-5 h-16 border-b border-white/4 shrink-0">
  {/* Icon container — gradient background, rounded */}
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-cyan-500
                  flex items-center justify-center shadow-accent shrink-0">
    <Youtube size={16} className="text-white" />
  </div>
  
  {/* Brand name */}
  <span className="font-display text-lg font-700 tracking-tight text-primary">
    TubeRAG
  </span>
  
  {/* Version pill */}
  <span className="ml-auto font-mono text-[10px] text-muted px-2 py-0.5
                   bg-white/4 rounded-full border border-white/6">
    v1.0
  </span>
</header>
```

#### 2. Ingest Section — Variable height, min 180px
```
Padding: 16px
Border-bottom: 1px solid var(--border-subtle)
```
Full spec in `UI_03_COMPONENTS_SPEC.md → IngestPanel`

#### 3. Section Divider + Label
```tsx
<div className="px-5 pt-4 pb-2 flex items-center gap-2 shrink-0">
  <BookOpen size={12} className="text-muted" />
  <span className="font-mono text-[10px] uppercase tracking-widest text-muted font-500">
    Indexed Videos
  </span>
  {videoCount > 0 && (
    <span className="ml-auto font-mono text-[10px] text-accent-400
                     bg-accent-500/10 px-1.5 py-0.5 rounded">
      {videoCount}
    </span>
  )}
</div>
```

#### 4. Indexed Videos List — `flex-1, overflow-y-auto`
```
Padding: 0 8px 8px 8px
Gap between items: 2px
```
Full spec in `UI_03_COMPONENTS_SPEC.md → VideoListItem`

#### 5. Sidebar Footer — `height: 40px`
```
Padding: 0 16px
Content: subtle powered-by text
Border-top: 1px solid var(--border-subtle)
```
```tsx
<footer className="h-10 flex items-center px-4 border-t border-white/4 shrink-0">
  <span className="text-[11px] text-muted flex items-center gap-1.5">
    <Sparkles size={10} className="text-accent-400" />
    Powered by Claude
  </span>
</footer>
```

---

## Top Bar — `height: 56px`

```
Background: rgba(13, 13, 20, 0.8) with backdrop-filter blur(12px)
Border-bottom: 1px solid var(--border-subtle)
Padding: 0 24px
Position: sticky top-0
Z-index: 30
```

```tsx
<header className="h-14 flex items-center justify-between px-6 shrink-0
                   bg-base/80 backdrop-blur-xl border-b border-white/4 z-30">
  
  {/* Left: current context */}
  <div className="flex items-center gap-3">
    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
    <span className="text-sm text-secondary">Asking about</span>
    <span className="text-sm font-600 text-primary truncate max-w-xs">
      {playlistTitle}
    </span>
  </div>

  {/* Right: actions */}
  <div className="flex items-center gap-2">
    <button className="icon-button">
      <Search size={16} />
    </button>
    <button className="icon-button text-error/70 hover:text-error hover:bg-error/8">
      <Trash2 size={16} />
    </button>
  </div>
</header>
```

---

## Chat Area Layout

```
flex-1, overflow-hidden
Contains: scrollable message list + fixed input bar
Background: transparent (shows through to void bg)
```

```tsx
<div className="flex flex-1 flex-col overflow-hidden">
  
  {/* Scrollable messages */}
  <div className="flex-1 overflow-y-auto">
    <div className="mx-auto max-w-[720px] px-6 py-8 space-y-8">
      {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  </div>

  {/* Fixed input bar */}
  <InputBar onSend={handleSend} disabled={isLoading} />

</div>
```

---

## Empty State — When no playlist is loaded

```
Full main area
Centered content, vertical flex
Animated entrance
```

```tsx
<div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
  
  {/* Large decorative icon */}
  <div className="relative mb-8">
    {/* Outer glow ring */}
    <div className="absolute inset-0 rounded-3xl bg-accent-500/20 blur-2xl scale-150" />
    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-500/20
                    to-cyan-500/20 border border-white/8 flex items-center justify-center
                    shadow-glass">
      <Film size={36} className="text-accent-300" />
    </div>
  </div>

  {/* Heading */}
  <h2 className="font-display text-2xl font-700 text-primary mb-3 tracking-tight">
    Your channel, answering back
  </h2>

  {/* Subtext */}
  <p className="text-secondary text-sm leading-relaxed max-w-sm mb-8">
    Paste a YouTube playlist URL in the sidebar to index the videos.
    Then ask any question — TubeRAG retrieves exactly where the answer lives.
  </p>

  {/* Feature pills */}
  <div className="flex flex-wrap gap-2 justify-center">
    {['Timestamped references', 'Grounded answers', 'Any public playlist'].map(feat => (
      <span key={feat}
        className="text-xs text-accent-300 bg-accent-500/8 border border-accent-500/20
                   px-3 py-1.5 rounded-full font-500">
        {feat}
      </span>
    ))}
  </div>

</div>
```

---

## Responsive Breakpoints

**Primary target:** Desktop (1280px+). Secondary: Laptop (1024px).

| Breakpoint | Sidebar | Chat max-width | Notes |
|---|---|---|---|
| `≥ 1280px` | 280px fixed | 720px | Full layout |
| `1024–1279px` | 240px fixed | 640px | Slightly narrower |
| `768–1023px` | Overlay (drawer) | 100% – 48px | Sidebar becomes a slide-in drawer |
| `< 768px` | Bottom sheet | Full width | Mobile: sidebar as bottom sheet |

For MVP, implement desktop only (≥ 1024px). Add responsive later.

---

## Z-Index Stack

```
z-0:     Background effects (glows, noise)
z-10:    Main content
z-20:    Sidebar
z-30:    Top bar (sticky, needs to be above scrolled chat content)
z-40:    Tooltips, dropdowns
z-50:    Modals, overlays
z-9999:  Noise texture (via body::before)
```

---

## Spacing Rules (follow these strictly)

```
Sidebar internal padding:     20px horizontal
Message list padding:         24px horizontal, 32px top, large bottom
Message max-width:            720px, centered
Input bar padding:            16px horizontal, 12px vertical
Source cards gap:             8px
Within source card:           12px padding
Video list item:              4px vertical padding, 8px horizontal padding
Section headers:              20px top, 8px bottom
```

# UI Agent Instructions & Visual QA Checklist

This is the master guide for building the frontend. Read this first, then reference the other UI documents as directed.

---

## Document Reading Order

| File | Read When |
|---|---|
| `UI_01_DESIGN_SYSTEM.md` | First — before writing a single line of code. Sets all tokens, fonts, colors. |
| `UI_02_LAYOUT_SPEC.md` | Second — understand the overall shell structure. |
| `UI_03_COMPONENTS_SPEC.md` | While building each component — has full code for each. |
| `UI_04_ANIMATIONS_SPEC.md` | After components exist — layer in animations. |
| `UI_05_COMPLETE_CODE.md` | For Sidebar, TopBar, EmptyState, App, main, config files. |

---

## Non-Negotiable Rules

1. **Fonts are Syne + Outfit + JetBrains Mono. No exceptions.**
   - Never fall back to Inter, Roboto, or system-ui as a primary font.
   - `font-display: 'Syne'` on all headings, logo, large text.
   - `font-body: 'Outfit'` on all paragraphs, labels, buttons, inputs.
   - `font-mono: 'JetBrains Mono'` on timestamps, version badges, counters, hint text.

2. **Color palette is obsidian dark. No light mode.**
   - Background starts at `#0D0D14` — not pure black, not gray-900.
   - Never use Tailwind's default `gray-*` colors — they have the wrong hue.
   - Always reference CSS variables: `var(--text-primary)`, `var(--bg-elevated)`, etc.

3. **Every interactive element must have a visible hover state.**
   - Minimum: background lightens slightly OR border brightens.
   - Preferred: combination of background + border + slight transform.

4. **Messages must animate in.** See `UI_04_ANIMATIONS_SPEC.md §2`.
   - User messages: slide in from right.
   - Assistant messages: slide in from left.
   - Source cards: stagger in with 60ms delay between each.

5. **Source cards open YouTube in a new tab.** `target="_blank" rel="noopener noreferrer"` always present.

6. **Timestamp badge is always visible on thumbnails, even without hover.** It is not a tooltip.

7. **Loading states always show.** Never leave the UI in a frozen state. During ingestion: progress bar. During question answering: typing indicator.

8. **The noise texture and ambient glows are mandatory.** They make the dark background feel premium instead of flat. Copy the body::before and body::after styles exactly from `UI_01_DESIGN_SYSTEM.md`.

9. **Scrollbars must be styled.** The default browser scrollbar breaks the aesthetic. Use the custom scrollbar styles from `globals.css`.

10. **Animations respect `prefers-reduced-motion`.** Always wrap decorative animations in the media query.

---

## Component Build Order

Build in this exact order — each depends on the previous:

```
1. src/styles/globals.css         ← Font imports, CSS variables, base resets, keyframes
2. tailwind.config.ts             ← Extended tokens
3. src/types/index.ts             ← TypeScript interfaces
4. src/api/client.ts              ← API functions
5. src/components/ui/Button.tsx   ← Button primitives
6. src/components/ui/IconButton.tsx
7. src/components/ui/Skeleton.tsx
8. src/components/SourceCard.tsx  ← Most visually detailed, build carefully
9. src/components/SourceList.tsx
10. src/components/TypingIndicator.tsx
11. src/components/MessageBubble.tsx
12. src/components/InputBar.tsx
13. src/components/ChatWindow.tsx
14. src/components/VideoListItem.tsx
15. src/components/IndexedVideos.tsx
16. src/components/IngestPanel.tsx
17. src/components/TopBar.tsx
18. src/components/EmptyState.tsx
19. src/components/Sidebar.tsx
20. src/App.tsx
21. src/main.tsx
22. index.html
```

---

## Critical Implementation Details

### Globals CSS
The `globals.css` file is the foundation of the entire design. It must:
- Import the three Google Fonts at the top (Syne, Outfit, JetBrains Mono)
- Define all `:root {}` CSS variables (every color, spacing token, font name)
- Apply the noise texture via `body::before`
- Apply the ambient glow via `body::after`
- Define the custom scrollbar styles
- Define all animation keyframes (the complete list from `UI_04`)
- Define utility classes: `.skeleton`, `.fade-in-up`, `.delay-1` through `.delay-5`, `.gradient-text`, `.glass`

### Tailwind Usage
- Use Tailwind only for layout utilities: `flex`, `flex-col`, `overflow-hidden`, `items-center`, etc.
- For colors, shadows, and custom tokens, use `style={{}}` props with CSS variables.
- Never use Tailwind color classes like `bg-gray-900` — use `style={{ background: 'var(--bg-surface)' }}`.
- Exception: `text-white` is fine, as are transition utilities and opacity helpers.

### Why inline styles + CSS variables?
- Tailwind's default palette doesn't match our exact design tokens.
- CSS variables give dynamic, semantic meaning to every value.
- This keeps components readable and easy to theme later.

### Input Textarea Auto-Resize
The InputBar's textarea must grow as the user types, up to 120px. The `useEffect` that sets `ta.style.height = 'auto'` before setting the scroll height is essential — without `auto` first, the height only ever grows, never shrinks.

### Scroll to Bottom
In ChatWindow, `bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` must fire on both `messages` change AND `loading` change — the latter ensures the typing indicator stays visible as it appears.

### Axios Timeout
Set `timeout: 300_000` (5 minutes) on the Axios client. Ingestion of large playlists can take several minutes and must not time out in the browser.

---

## Visual QA Checklist

Use this checklist after building to verify the UI looks correct.

### Typography
- [ ] Logo "TubeRAG" is in Syne font, bold, white
- [ ] Section labels ("PLAYLIST URL", "INDEXED VIDEOS") are in JetBrains Mono, uppercase, spaced
- [ ] All body text (descriptions, messages, labels) is in Outfit
- [ ] Timestamps (12:43, chunk counts, version badge) are in JetBrains Mono
- [ ] Message bubble text is 14px with line-height 1.55

### Color
- [ ] Background is a dark near-black (#0D0D14), NOT pure black (#000000)
- [ ] Sidebar is slightly lighter than main background (#12121C)
- [ ] Cards (source cards, message bubbles) are #191926
- [ ] All borders are near-invisible (4–8% white opacity)
- [ ] Accent color is violet-indigo (#6366F1), not blue
- [ ] Secondary accent (timestamps, jump-to text) is indigo-300 (#A5B4FC)
- [ ] Error messages are red-400, success are emerald-400

### Ambient Effects
- [ ] Noise texture is visible but very subtle (opacity ~1.8%)
- [ ] Top-center violet glow is present but not overwhelming
- [ ] Bottom-right cyan glow is present but subtle
- [ ] Subtle grid pattern is visible on close inspection

### Layout
- [ ] Sidebar is exactly 280px wide
- [ ] Sidebar does not scroll horizontally
- [ ] Main content fills remaining viewport
- [ ] Chat messages are centered, max 720px wide
- [ ] Input bar sticks to the bottom of the chat area
- [ ] Message list is independently scrollable

### Components
- [ ] Logo icon has gradient (violet → cyan) background with glow
- [ ] Ingest textarea has no resize handle (resize: none)
- [ ] Submit button shows spinner during loading, not text
- [ ] Progress bar slides under the submit button during ingestion
- [ ] Indexed video thumbnails are 52×30px, rounded
- [ ] User message bubbles are gradient violet, right-aligned, sharp bottom-right corner
- [ ] Assistant message bubbles are dark surface, left-aligned, sharp top-left corner
- [ ] Assistant avatar (Sparkles icon) appears to the left of each assistant message
- [ ] Typing indicator shows 3 bouncing dots in an assistant-style bubble
- [ ] Source cards have 120×68px thumbnail on the left
- [ ] Timestamp badge is always visible on source card thumbnail
- [ ] Play overlay appears on source card thumbnail hover
- [ ] "Jump to 12:43 →" is in JetBrains Mono, accent-300 color
- [ ] External link icon appears in the source card footer
- [ ] Source cards lift 1px on hover (translate-y: -1px)

### Animations
- [ ] Messages slide in (user from right, assistant from left)
- [ ] Source cards stagger in with 60ms delay between each
- [ ] Typing indicator dots bounce with staggered timing
- [ ] Progress bar animates across the width during ingestion
- [ ] Success message pops in with slight overshoot scale
- [ ] Empty state icon floats gently up and down
- [ ] Skeleton shimmer runs in the video list while loading
- [ ] Input focus state shows glow ring (0 0 0 3px rgba(99,102,241,0.08))

### Interactions
- [ ] Send button is disabled (opacity 40%) when textarea is empty
- [ ] Send button activates and shows gradient when textarea has text
- [ ] Pressing Enter sends the message (without Shift)
- [ ] Pressing Shift+Enter adds a newline
- [ ] Pressing Cmd+Enter in the ingest textarea submits the URL
- [ ] Clicking the red trash icon in the TopBar clears the playlist state
- [ ] Clicking a source card opens YouTube in a new tab at the correct timestamp
- [ ] "Show more references" button reveals hidden source cards when clicked

### Edge Cases
- [ ] Videos without thumbnails show a Film icon placeholder (not broken image)
- [ ] Long playlist titles truncate with ellipsis in the TopBar
- [ ] Long video titles in the sidebar list are 2-line clamped
- [ ] If the answer returns 0 sources, "Referenced in" section is hidden
- [ ] Empty chat state shows hint questions when no messages exist
- [ ] Custom scrollbar style is applied to all scrollable areas

---

## Common Implementation Mistakes

| Mistake | Correct Approach |
|---|---|
| Using Tailwind `gray-*` colors | Use CSS variables via `style={{}}` |
| Not setting `fontFamily` in `style={{}}` | Tailwind doesn't know Syne/Outfit/JetBrains — always set explicitly or use `.font-display` etc |
| Forgetting `shrink-0` on fixed-size elements | Sidebar header, input bar, top bar must all have `shrink-0` |
| Textarea that only grows, never shrinks | Set `ta.style.height = 'auto'` BEFORE setting scrollHeight |
| Source card thumbnail without `object-cover` | Without it, thumbnails will be stretched or distorted |
| Hardcoding pixel values instead of using tokens | Always check `UI_01_DESIGN_SYSTEM.md` for the right variable |
| Forgetting `overflow-hidden` on thumbnail wrapper | Without it, scale transform bleeds outside the rounded corners |
| Not adding `will-change: transform` on animated cards | Causes GPU repaints on hover — add on SourceCard hover elements |
| Missing `rel="noopener noreferrer"` on YouTube links | Security requirement for `target="_blank"` |
| Forgetting animation-fill-mode `both` on entrance animations | Without `both`, elements flash before animating in |

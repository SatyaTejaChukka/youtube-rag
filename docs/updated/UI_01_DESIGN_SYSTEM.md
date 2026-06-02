# UI Design System — TubeRAG

## Aesthetic Direction

**Theme:** Obsidian Intelligence — premium dark SaaS with cinematic depth.

Inspired by products like Linear, Raycast, and Vercel's dashboard. The UI feels like a sophisticated tool built for people who care about craft. Deep near-black surfaces layered with frosted glass panels, ink-stained borders that glow on interaction, and typography that is confident and editorial. Every element earns its place.

**Keywords:** Precise. Confident. Alive. Cinematic. Tactile.

**Not:** Corporate. Clipart-colorful. Bootstrap-generic. Purple-gradient-on-white.

---

## Font Stack

Import via Google Fonts in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Role | Font | Weights | Use case |
|---|---|---|---|
| Display | **Syne** | 700, 800 | Logo, hero headings, section titles |
| Body | **Outfit** | 300, 400, 500, 600 | Paragraphs, labels, UI text, buttons |
| Mono | **JetBrains Mono** | 400, 500 | Timestamps, code, IDs, counters |

**Why this pairing:** Syne is geometric and strong — it owns the space it takes up. Outfit is warm and legible at small sizes. JetBrains Mono adds a technical precision vibe for timestamps without feeling like an afterthought.

### Typography Scale (CSS Variables)
```css
--font-display: 'Syne', sans-serif;
--font-body: 'Outfit', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-xs:   0.6875rem;  /* 11px */
--text-sm:   0.8125rem;  /* 13px */
--text-base: 0.9375rem;  /* 15px */
--text-md:   1.0625rem;  /* 17px */
--text-lg:   1.25rem;    /* 20px */
--text-xl:   1.5rem;     /* 24px */
--text-2xl:  2rem;       /* 32px */
--text-3xl:  2.75rem;    /* 44px */

--leading-tight:  1.2;
--leading-snug:   1.4;
--leading-normal: 1.6;
--leading-relaxed: 1.75;

--tracking-tight:  -0.03em;
--tracking-normal:  0em;
--tracking-wide:    0.04em;
--tracking-wider:   0.1em;
--tracking-widest:  0.2em;
```

---

## Color Palette

```css
:root {
  /* === BACKGROUNDS === */
  --bg-void:        #06060A;   /* Deepest background, page canvas */
  --bg-base:        #0D0D14;   /* Main app background */
  --bg-surface:     #12121C;   /* Sidebar, panels */
  --bg-elevated:    #191926;   /* Cards, modals */
  --bg-overlay:     #1F1F30;   /* Hover states, tooltips */

  /* === BORDERS === */
  --border-subtle:  rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong:  rgba(255, 255, 255, 0.14);
  --border-focus:   rgba(139, 92, 246, 0.6);   /* Violet focus ring */

  /* === TEXT === */
  --text-primary:   #F0F0FA;   /* Near-white, primary content */
  --text-secondary: #A0A0B8;   /* Descriptions, secondary labels */
  --text-muted:     #56566E;   /* Placeholders, disabled */
  --text-inverse:   #06060A;   /* On bright backgrounds */

  /* === ACCENT — Violet-Indigo system === */
  --accent-50:  #EEF2FF;
  --accent-100: #E0E7FF;
  --accent-200: #C7D2FE;
  --accent-300: #A5B4FC;
  --accent-400: #818CF8;
  --accent-500: #6366F1;  /* Primary accent */
  --accent-600: #4F46E5;
  --accent-700: #4338CA;
  --accent-glow: rgba(99, 102, 241, 0.35);
  --accent-glow-sm: rgba(99, 102, 241, 0.15);

  /* === SECONDARY ACCENT — Cyan === */
  --cyan-400:   #22D3EE;
  --cyan-500:   #06B6D4;
  --cyan-glow:  rgba(6, 182, 212, 0.25);

  /* === SEMANTIC === */
  --success:    #10B981;
  --success-bg: rgba(16, 185, 129, 0.08);
  --warning:    #F59E0B;
  --warning-bg: rgba(245, 158, 11, 0.08);
  --error:      #EF4444;
  --error-bg:   rgba(239, 68, 68, 0.08);
  --info:       #3B82F6;
  --info-bg:    rgba(59, 130, 246, 0.08);

  /* === GRADIENTS === */
  --gradient-brand:    linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%);
  --gradient-surface:  linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%);
  --gradient-glow:     radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, transparent 60%);
  --gradient-text:     linear-gradient(135deg, #A5B4FC 0%, #6366F1 40%, #22D3EE 100%);

  /* === SHADOWS === */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5);
  --shadow-md:   0 4px 12px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.4);
  --shadow-lg:   0 12px 32px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5);
  --shadow-xl:   0 24px 64px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.6);
  --shadow-accent: 0 0 24px rgba(99,102,241,0.4), 0 0 8px rgba(99,102,241,0.2);
  --shadow-card: 0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.4);

  /* === GLASS EFFECTS === */
  --glass-bg:      rgba(25, 25, 38, 0.7);
  --glass-border:  rgba(255, 255, 255, 0.07);
  --glass-blur:    backdrop-filter: blur(20px) saturate(180%);
}
```

---

## Spacing & Sizing

```css
/* Spacing scale (multiples of 4px) */
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */

/* Border radius */
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   14px;
--radius-xl:   20px;
--radius-2xl:  28px;
--radius-full: 9999px;

/* Sidebar */
--sidebar-width: 280px;
--sidebar-collapsed: 60px;

/* Chat area */
--chat-max-width: 720px;
--input-bar-height: 80px;
```

---

## Global Base Styles — `src/styles/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

/* ─── Reset ────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* ─── Root Variables (from above) ─────────── */
/* (paste all :root CSS variables here) */

/* ─── Body ─────────────────────────────────── */
body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 400;
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background-color: var(--bg-base);
  overflow: hidden;
}

/* ─── Noise texture overlay ─────────────────── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
  opacity: 0.018;
  pointer-events: none;
  z-index: 9999;
}

/* ─── Ambient glow on bg ────────────────────── */
body::after {
  content: '';
  position: fixed;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ─── Scrollbar ─────────────────────────────── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}

/* ─── Selection ─────────────────────────────── */
::selection {
  background: rgba(99, 102, 241, 0.35);
  color: #fff;
}

/* ─── Focus ring ─────────────────────────────── */
:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* ─── Gradient text utility ─────────────────── */
.gradient-text {
  background: var(--gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ─── Glass utility ──────────────────────────── */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
}

/* ─── Shimmer skeleton utility ───────────────── */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 25%,
    rgba(255,255,255,0.04) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.8s ease infinite;
}

@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* ─── Fade-in-up entrance ───────────────────── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-in-up {
  animation: fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ─── Stagger delays ─────────────────────────── */
.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.10s; }
.delay-3 { animation-delay: 0.15s; }
.delay-4 { animation-delay: 0.20s; }
.delay-5 { animation-delay: 0.25s; }

/* ─── Glow pulse ─────────────────────────────── */
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 12px rgba(99,102,241,0.3); }
  50%       { box-shadow: 0 0 24px rgba(99,102,241,0.6), 0 0 48px rgba(99,102,241,0.2); }
}

/* ─── Spin ───────────────────────────────────── */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Typing cursor blink ────────────────────── */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

---

## Tailwind Config — `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void:    '#06060A',
        base:    '#0D0D14',
        surface: '#12121C',
        elevated:'#191926',
        overlay: '#1F1F30',
        accent: {
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
        },
      },
      animation: {
        'fade-in-up':   'fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'shimmer':      'shimmer 1.8s ease infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
        'blink':        'blink 1.2s step-end infinite',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
        'gradient-glow':  'radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, transparent 60%)',
      },
      boxShadow: {
        'accent': '0 0 24px rgba(99,102,241,0.4), 0 0 8px rgba(99,102,241,0.2)',
        'card':   '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.4)',
        'glass':  '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(99,102,241,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(99,102,241,0.6)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## Icon System

Use **Lucide React** throughout. Install:
```bash
npm install lucide-react
```

Icon usage conventions:
- All icons: `size={16}` for inline UI, `size={18}` for buttons, `size={20}` for sidebar items
- Never use emoji as icons except in the logo/brand mark
- Stroke width: default `1.5` (Lucide default) — do not change
- Color: inherit from text color via `currentColor`

Key icons used in this app:
```tsx
import {
  Youtube,        // logo area
  Search,         // search icon
  Send,           // send message
  Plus,           // new chat / add
  Trash2,         // delete
  Clock,          // timestamp
  PlayCircle,     // play video
  ChevronRight,   // expand
  ChevronDown,    // collapse
  Loader2,        // loading spinner (animate-spin)
  CheckCircle2,   // success state
  AlertCircle,    // error state
  Film,           // video placeholder
  MessageSquare,  // chat
  X,              // close / clear
  LayoutSidebar,  // toggle sidebar
  Sparkles,       // AI / intelligence indicator
  ExternalLink,   // open in new tab
  BookOpen,       // indexed content
} from 'lucide-react'
```

---

## Component Token Reference

```css
/* Button base */
--btn-height-sm:   32px;
--btn-height-md:   40px;
--btn-height-lg:   48px;
--btn-radius:      var(--radius-md);
--btn-font-size:   var(--text-sm);
--btn-font-weight: 600;

/* Input base */
--input-height:    44px;
--input-radius:    var(--radius-md);
--input-bg:        var(--bg-elevated);
--input-border:    var(--border-default);

/* Card base */
--card-radius:     var(--radius-xl);
--card-padding:    var(--space-4);
--card-bg:         var(--bg-elevated);
--card-border:     var(--border-default);

/* Sidebar */
--sidebar-item-height: 40px;
--sidebar-item-radius: var(--radius-md);

/* Source card */
--source-card-thumb-w: 120px;
--source-card-thumb-h: 68px;
--source-card-radius:  var(--radius-lg);
```

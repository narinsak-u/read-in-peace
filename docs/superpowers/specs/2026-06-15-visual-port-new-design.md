# Visual Port — Ex Libris Design into Read in Pace

## Overview

Port the visual design system from the `new_design/` project (TanStack Start / React / "Ex Libris") into the existing Nuxt 3 / Vue 3 frontend. Keep all current pages, features, and data flow exactly as-is — only the visual layer changes.

## Scope

| Element | Ported? | Source |
|---------|---------|--------|
| Color palette (light + dark) | Yes | `new_design/src/styles.css` |
| Border radius (`0.25rem`) | Yes | `new_design/src/styles.css` |
| Font stack (Lora, Inter, JetBrains Mono) | Yes | `new_design/src/styles.css` |
| Cover crop system | Yes | `new_design/src/styles.css` |
| Entrance animations (`animate-enter`, `slide-up`) | Yes | `new_design/src/styles.css` |
| `tw-animate-css` import | Yes | `new_design/src/styles.css` |
| `archivalGhost` / `archival` / `archivalOutline` / `archivalDock` button variants | Yes | `new_design/src/components/ui/button.tsx` |
| `prefers-reduced-motion` override | Yes | `new_design/src/styles.css` |
| Existing `glass` utility, `float` animation | Kept | Current `main.css` |
| Landing page video + overlay | Kept | Current `pages/index.vue` |
| All pages, stores, composables, server routes | Unchanged | — |
| All backend API, Stripe, Better Auth logic | Unchanged | — |

## Design Tokens

### Light Palette

```css
--radius: 0.25rem;
--background: oklch(0.975 0.008 88);
--foreground: oklch(0.21 0 0);
--card: oklch(0.995 0.004 88 / 70%);
--card-foreground: oklch(0.21 0 0);
--popover: oklch(0.99 0.006 88);
--popover-foreground: oklch(0.21 0 0);
--primary: oklch(0.39 0.145 25);
--primary-foreground: oklch(0.975 0.008 88);
--secondary: oklch(0.94 0.012 70);
--secondary-foreground: oklch(0.21 0 0);
--muted: oklch(0.93 0.008 88);
--muted-foreground: oklch(0.48 0.01 35);
--accent: oklch(0.93 0.02 28);
--accent-foreground: oklch(0.39 0.145 25);
--destructive: oklch(0.577 0.245 27.325);
--destructive-foreground: oklch(0.984 0.003 247.858);
--border: oklch(0.21 0 0 / 10%);
--input: oklch(0.21 0 0 / 8%);
--ring: oklch(0.39 0.145 25 / 40%);
```

### Dark Palette

```css
--background: oklch(0.129 0.042 264.695);
--foreground: oklch(0.984 0.003 247.858);
--card: oklch(0.208 0.042 265.755);
--card-foreground: oklch(0.984 0.003 247.858);
--popover: oklch(0.208 0.042 265.755);
--primary: oklch(0.929 0.013 255.508);
--primary-foreground: oklch(0.208 0.042 265.755);
--secondary: oklch(0.279 0.041 260.031);
--secondary-foreground: oklch(0.984 0.003 247.858);
--muted: oklch(0.279 0.041 260.031);
--muted-foreground: oklch(0.704 0.04 256.788);
--accent: oklch(0.279 0.041 260.031);
--accent-foreground: oklch(0.984 0.003 247.858);
--destructive: oklch(0.704 0.191 22.216);
--destructive-foreground: oklch(0.984 0.003 247.858);
--border: oklch(1 0 0 / 10%);
--input: oklch(1 0 0 / 15%);
--ring: oklch(0.551 0.027 264.364);
```

### Font Families

```css
--font-serif: "Lora", serif;
--font-sans: "Inter", sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

- Body text: `font-sans` (Inter)
- Headings (h1-h6): `font-serif` (Lora)
- Small metadata/badges: `font-mono` (JetBrains Mono)

### Radius

- All radii shift down: `--radius: 0.25rem` (was `0.75rem`)
- Derived: `radius-sm` = calc(0.25rem - 4px), `radius-md` = calc(0.25rem - 2px), etc.

### Shadows

Keep current shadow tokens — not replaced from new_design (which had no custom shadow tokens).

### Animations

Replace existing `fade-up` / `animate-fade-up` with:

```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-enter {
  animation: slide-up 600ms cubic-bezier(0.19, 1, 0.22, 1) both;
}
```

Keep existing `@keyframes float` / `animate-float` (used on landing page).

Keep existing `.glass` utility.

## Cover Crop System

### CSS

```css
.cover-crop { position: relative; overflow: hidden; }
.cover-crop img {
  position: absolute; width: 300%; max-width: none;
  height: 200%; object-fit: fill;
}
.cover-0 img { left: 0; top: 0; }
.cover-1 img { left: -100%; top: 0; }
.cover-2 img { left: -200%; top: 0; }
.cover-3 img { left: 0; top: -100%; }
.cover-4 img { left: -100%; top: -100%; }
.cover-5 img { left: -200%; top: -100%; }
```

### Data Model

Add `crop: number` (0-5) to the Book type in `data/books.ts` and the CartItem type in `stores/cart.ts`.

Assign `crop` values to each seed book (distribution across 0-5).

### Components

Wrap book cover images in `<div class="cover-crop cover-N">` in:
- `BookCard.vue`
- `BookDetails.vue` / `pages/book/[id].vue`
- `CheckoutDrawer.vue` (cart item covers)

## Button Variants

Create local `components/ui/button/` in the Vue frontend (using shadcn-vue `cva` pattern) with these additional variants:

| Variant | Style |
|---------|-------|
| `archival` | `rounded-sm bg-foreground text-background shadow-none hover:bg-primary` |
| `archivalOutline` | `rounded-sm border border-border bg-transparent text-foreground shadow-none hover:border-primary/40 hover:bg-card` |
| `archivalGhost` | `rounded-sm bg-transparent text-muted-foreground shadow-none hover:text-primary` |
| `archivalDock` | `h-auto flex-col gap-0.5 rounded-none bg-transparent p-0 text-background shadow-none hover:text-primary` |

Replace styled buttons in `CartIcon.vue`, `CheckoutDrawer.vue`, `BookActions.vue`, and `AdminFab.vue` with these variants.

## Typography Setup

Add to `nuxt.config.ts`:
```ts
app: {
  head: {
    link: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono&family=Lora:wght@400;500;600&display=swap', rel: 'stylesheet' },
    ],
  },
}
```

## Files to Modify

### CSS
- `assets/css/main.css` — Replace entire file with new_design's CSS, keeping `float` keyframe and `glass` utility

### Config
- `nuxt.config.ts` — Add Google Fonts preconnect + stylesheet links

### Data
- `data/books.ts` — Add `crop` field to Book interface and each seed book

### Stores
- `stores/cart.ts` — Add `crop` to CartItem interface

### Components
- `components/ui/button/` — Create with new variants (or init via `npx shadcn-vue add button` then edit)
- `components/BookCard.vue` — Add cover crop wrapper to image
- `components/BookDetails.vue` — Add cover crop wrapper to image
- `components/CheckoutDrawer.vue` — Add cover crop to cart item thumbnails; use `archivalGhost` buttons
- `components/CartIcon.vue` — Use `archivalGhost` variant; add `font-mono` to badge
- `components/BookActions.vue` — Use `archival` / `archivalOutline` variants
- `components/AdminFab.vue` — Use `archival` variant
- `components/BookFormModal.vue` — Use `archivalGhost` for secondary actions
- `components/AuthModal.vue` — Use new button variants
- `components/Navbar.vue` — Update button styling references
- `components/TrendingSection.vue` — Minor radius/spacing updates via CSS variables

### Pages (minimal changes — all CSS-driven)
- No page-level changes needed. CSS variables propagate automatically.

## Not In Scope

- No new pages, layouts, or features from new_design (bottom dock nav, Reader Feed, Book Club CTA, Active Loans dashboard)
- No TanStack Query, React Router, or React component migration
- No Supabase integration (current Better Auth stays)
- No backend changes
- No data flow or API changes

# Frontend Design Refresh — Read in Peace

## Overview

Refine the existing frontend to achieve a modern, minimal, professional look with a
warm & organic feel — inspired by Linear and Notion.

## Visual Direction

| Axis | Decision |
|------|----------|
| Style | Warm & Organic |
| Palette | Amber + Warm Neutral |
| Surface style | Clean elevated cards (subtle shadows, rounded corners, thin borders) |
| Approach | Refined polish — update design tokens, standardize components, polish each page |

## Design Tokens (CSS)

### Light Palette

- **Primary**: `oklch(0.7 0.14 75)` (warm amber)
- **Primary-foreground**: `oklch(0.99 0 0)` (white)
- **Primary-soft**: `oklch(0.92 0.04 75)` (soft amber)
- **Background**: `oklch(0.99 0.005 85)` (warm cream)
- **Foreground**: `oklch(0.18 0.01 70)` (deep warm charcoal)
- **Card**: `oklch(1 0.003 85)` (white with warm tint)
- **Card-foreground**: same as foreground
- **Muted**: `oklch(0.95 0.008 80)` (warm beige)
- **Muted-foreground**: `oklch(0.5 0.015 70)`
- **Accent**: `oklch(0.85 0.04 75)` (warm amber highlight)
- **Accent-foreground**: `oklch(0.35 0.08 75)`
- **Border**: `oklch(0.9 0.008 80)`
- **Input**: `oklch(0.92 0.008 80)`
- **Ring**: `oklch(0.7 0.14 75)` (amber glow)

### Dark Palette

- **Background**: `oklch(0.18 0.01 70)`
- **Foreground**: `oklch(0.96 0.005 85)`
- **Card**: `oklch(0.22 0.012 70)`
- **Muted**: `oklch(0.25 0.012 70)`
- **Muted-foreground**: `oklch(0.65 0.01 70)`
- **Primary**: `oklch(0.75 0.14 75)`
- **Primary-foreground**: `oklch(0.18 0.01 70)`
- **Border**: `oklch(1 0 0 / 10%)`
- **Input**: `oklch(1 0 0 / 15%)`
- **Ring**: `oklch(0.75 0.14 75)`

### Shadows

- `shadow-sm`: `0 1px 2px oklch(0.2 0.02 70 / 0.06)`
- `shadow-md`: `0 4px 12px oklch(0.2 0.02 70 / 0.08)`
- `shadow-lg`: `0 8px 24px oklch(0.2 0.02 70 / 0.10)`

### Radius

- Keep current base `--radius: 0.75rem`

### Animations

- Keep `fade-up` 0.5s ease-out
- Keep `float` 6s ease-in-out infinite
- Remove `gradient-shift` (no longer used)

## Component Changes

### Cards (BookCard, BookShelf cards, TrendingSection)
- Elevated warm white surface
- `shadow-sm`, rounded corners, `hover:shadow-md`
- Thin border on hover
- Consistent padding: `p-5`

### Buttons
- **Primary**: Amber fill, warm white text, `shadow-sm`, `hover:translate-y-[-1px]`
- **Ghost/outline**: Thin amber border, neutral text, amber bg on hover
- All transitions: `transition-all duration-200`

### Navbar
- Thin bottom border instead of glass
- Profile dropdown: elevated card with shadow
- Logo text: warm amber tint on hover

### Auth Modal
- Warm card surface (not glass)
- Amber accent on active tab, input focus

### Category Pills (Feed)
- `rounded-full`, warm beige inactive, amber active with shadow

### Pagination
- Minimal: arrows + page number, amber accent

### Tabs (Dashboard)
- Underline-style with amber active indicator

### Footer
- Minimal: amber divider line, muted warm text, centered

## Page-Specific Changes

### Landing Page (index.vue)
- Video BG with warm gradient overlay (`from-amber-900/30 via-transparent to-background`)
- Badge: warm amber pill (`bg-amber-50 dark:bg-amber-900/30`)
- Hero heading: warm text gradient on "Read at the pace"
- CTA: amber fill, warm white text, refined hover

### Feed (feed.vue)
- Category pills restyled (amber active)
- Book grid consistent card style
- Trending hero cards: elevated, amber accent on featured

### Book Detail (book/[id].vue)
- Cover with subtle shadow and warm border
- Clean typographic hierarchy
- Rating stars: amber fill
- Comments: card per comment, warm divider
- Share: elevated card popover

### Dashboard (dashboard.vue)
- Underline tabs with amber active
- Book cards consistent with feed
- Empty states with warm icon

## Files to Modify

- `assets/css/main.css` — palette, shadows, remove gradient-shift
- `pages/index.vue` — overlay, badge, CTA colors
- `pages/feed.vue` — category pills
- `pages/book/[id].vue` — cover, rating, comments styling
- `pages/dashboard.vue` — tabs
- `components/BookCard.vue` — elevated card style
- `components/BookShelf.vue` — category pills, pagination
- `components/TrendingSection.vue` — hero card polish
- `components/Navbar.vue` — border, dropdown
- `components/AuthModal.vue` — warm surface
- `components/BookActions.vue` — button styling
- `components/BookDetails.vue` — typography polish
- `components/BookRating.vue` — amber stars
- `components/BookComments.vue` — card per comment
- `components/BookShare.vue` — elevated popover
- `components/Footer.vue` — minimal refine
- `components/AdminFab.vue` — amber accent
- `components/BookFormModal.vue` — warm surface

## Not In Scope

- No new components or pages
- No shadcn-vue component installation
- No structural layout changes

# Social System — Reader Feed (Sub-project 3)

## Overview

Add a social Reader Feed matching the Ex Libris design. Users can create text posts with optional star ratings, like other posts, and reply to discussions. The feed powers both the dedicated Social page (`/social`) and a compact widget in the sidebar.

## Backend Schema

### New tables

```ts
export const posts = pgTable('posts', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  rating: integer('rating'),           // nullable, 1-5
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const postLikes = pgTable(
  'post_likes',
  {
    postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const postReplies = pgTable('post_replies', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});
```

### Seed data

Add 3-5 seed posts from existing seed users (Jonas, Priya, Hana) with text and ratings, referencing seed books.

## API Endpoints

All under `api/feed` prefix. Auth-guarded for write operations, public read for GET feed.

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/api/feed` | No (but injects `liked` if auth'd) | Get recent posts (limit 20, createdAt desc), includes user info, likeCount, replyCount |
| `POST` | `/api/feed` | Yes | Create post `{ text: string, rating?: number }` |
| `POST` | `/api/feed/:id/like` | Yes | Toggle like → `{ liked: boolean, likeCount: number }` |
| `GET` | `/api/feed/:id/like` | Yes | Check like status → `{ liked: boolean }` |
| `POST` | `/api/feed/:id/reply` | Yes | Reply to post `{ text: string }` |
| `GET` | `/api/feed/:id/replies` | No | Get replies for a post (includes user info) |

### GET /api/feed response

```json
[{
  "id": "...",
  "text": "Rossi-Vaughn's chapter on brutalist memorials is devastating...",
  "rating": null,
  "createdAt": "2026-06-15T10:00:00Z",
  "user": { "id": "...", "name": "Aris M.", "image": null },
  "likeCount": 12,
  "replyCount": 3,
  "liked": false
}]
```

### GET /api/feed/:id/replies response

```json
[{
  "id": "...",
  "text": "Yes! I noticed that too...",
  "createdAt": "...",
  "user": { "id": "...", "name": "Leo Wang", "image": null }
}]
```

## Frontend

### Social Page (`pages/social.vue`)

Full Reader Feed page using `app` layout.

**Layout:**
- Top: Post composer (textarea + optional star rating picker + Publish button)
- Feed: Vertical list of posts, newest first
- Each post card (`FeedPost.vue`):
  - Left accent bar (border-l)
  - Avatar circle (initials, bg-muted)
  - Name (text-[11px] font-bold uppercase) + time ago (font-mono text-[10px])
  - Post text (text-sm leading-snug text-foreground/80)
  - Star rating display (if post has rating): ★★★☆☆ format
  - Action buttons: Like (count) + Reply
  - Like toggles color to primary when active

**States:**
- Loading: skeleton or empty
- Empty: "No posts yet. Start the conversation!"
- Error: toast notification

### Compact Feed Widget (`CompactFeedPosts.vue`)

Reused in sidebar slots on both home and social pages.

- Shows last 3 posts from the feed store
- Same styling as FeedPost but compact (text truncated to 1-2 lines)
- Links to `/social` for full feed
- Used via named slot in AppSidebar

### Post Composer

- Textarea with placeholder "What are you reading?"
- Optional star rating selector (1-5 stars, clickable)
- Publish button (archival variant)
- Disabled while submitting
- After publish: clears form, refreshes feed, shows flash notice

### Pinia Store (`stores/social.ts`)

```ts
defineStore('social', () => {
  const posts = shallowRef<Post[]>([]);
  const liked = shallowRef<Record<string, boolean>>({});
  const loading = shallowRef(false);

  interface Post {
    id: string;
    text: string;
    rating: number | null;
    createdAt: string;
    user: { id: string; name: string; image: string | null };
    likeCount: number;
    replyCount: number;
    liked: boolean;
  }

  async function fetchFeed(): Promise<void>;
  async function createPost(text: string, rating?: number): Promise<void>;
  async function toggleLike(postId: string): Promise<void>;
  async function replyToPost(postId: string, text: string): Promise<void>;

  return { posts, liked, loading, fetchFeed, createPost, toggleLike, replyToPost };
});
```

### Sidebar Integration

Both `pages/home.vue` and `pages/social.vue` fill the `#reader-feed` named slot:

```vue
<template #sidebar>
  <AppSidebar>
    <template #yearly-progress>
      <YearlyProgressCard />
    </template>
    <template #reader-feed>
      <CompactFeedPosts :posts="socialStore.posts.slice(0, 3)" />
    </template>
  </AppSidebar>
</template>
```

## Files Summary

### Create (backend)
| File | Purpose |
|------|---------|
| `backend/src/social/social.module.ts` | Module |
| `backend/src/social/social.controller.ts` | Controller (all /api/feed routes) |
| `backend/src/social/social.service.ts` | Service (queries, mutations) |

### Modify (backend)
| File | Change |
|------|--------|
| `backend/src/db/schema.ts` | Add posts, postLikes, postReplies tables |
| `backend/src/db/seed.ts` | Add seed posts from comment users |
| `backend/src/app.module.ts` | Import SocialModule |

### Create (frontend)
| File | Purpose |
|------|---------|
| `frontend/pages/social.vue` | Replace placeholder with full feed |
| `frontend/components/FeedPost.vue` | Single post card component |
| `frontend/components/CompactFeedPosts.vue` | Compact posts for sidebar |
| `frontend/stores/social.ts` | Social Pinia store |

### Modify (frontend)
| File | Change |
|------|--------|
| `frontend/pages/home.vue` | Add sidebar reader-feed slot with CompactFeedPosts |

## Not In This Sub-Project
- Following/followers system
- Book-specific discussion threads (separate from social)
- Reply threading (single-level replies only)
- Post deletion/editing

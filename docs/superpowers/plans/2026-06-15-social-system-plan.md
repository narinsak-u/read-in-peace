# Social System — Implementation Plan (Sub-project 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a social Reader Feed with posts, likes, replies, and star ratings — full backend schema/API + frontend social page + sidebar widget.

**Architecture:** Backend adds 3 new tables (posts, postLikes, postReplies) and a SocialModule with REST endpoints under `/api/feed`. Frontend creates a social Pinia store, FeedPost/CompactFeedPosts components, replaces the social page placeholder, and updates the home page sidebar slot.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Nuxt 3, Vue 3 Composition API, Pinia

---

### Task 1: Add Social Schema + Seed Data

**Files:**
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/src/db/seed.ts`

- [ ] **Step 1: Add posts, postLikes, postReplies tables**

Read `backend/src/db/schema.ts`. Add after the existing `readingGoals` table:

```ts
export const posts = pgTable('posts', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  rating: integer('rating'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const postLikes = pgTable(
  'post_likes',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId] })],
);

export const postReplies = pgTable('post_replies', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

- [ ] **Step 2: Add seed posts**

Read `backend/src/db/seed.ts`. After the ratings seed section (before `await pool.end()`), add:

```ts
// --- Posts (social feed) ---

const postTexts = [
  "Rossi-Vaughn's chapter on brutalist memorials is devastating. Did anyone else catch the reference to Rossi's own cemetery design?",
  'Just finished Paper Shadows. A little quiet in the middle, but the ending is worth it.',
  "Looking for recommendations on mid-century urban design. Any classics I'm missing?",
  'Finally started The Quiet Hours — Elena Marsh has such a distinctive voice. Perfect rainy morning read.',
];

const postRatings = [4, 3, null, 5];

for (let i = 0; i < postTexts.length; i++) {
  const userId = commentUsers[i % commentUsers.length].id;
  await db.insert(schema.posts).values({
    userId,
    text: postTexts[i],
    rating: postRatings[i],
  });
}

console.log(`Created ${postTexts.length} social posts`);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/seed.ts
git commit -m "feat: add posts, postLikes, postReplies tables and seed data"
```

---

### Task 2: Create Social Backend Module

**Files:**
- Create: `backend/src/social/social.module.ts`
- Create: `backend/src/social/social.controller.ts`
- Create: `backend/src/social/social.service.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create social.service.ts**

```ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';

@Injectable()
export class SocialService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getFeed(userId?: string) {
    const feed = await this.db
      .select({
        id: schema.posts.id,
        text: schema.posts.text,
        rating: schema.posts.rating,
        createdAt: schema.posts.createdAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.postLikes} WHERE ${schema.postLikes.postId} = ${schema.posts.id})`,
        replyCount: sql<number>`(SELECT COUNT(*) FROM ${schema.postReplies} WHERE ${schema.postReplies.postId} = ${schema.posts.id})`,
      })
      .from(schema.posts)
      .innerJoin(schema.user, eq(schema.posts.userId, schema.user.id))
      .orderBy(desc(schema.posts.createdAt))
      .limit(20);

    // Inject liked status if user is authenticated
    if (userId) {
      const likedPosts = await this.db
        .select({ postId: schema.postLikes.postId })
        .from(schema.postLikes)
        .where(eq(schema.postLikes.userId, userId));
      const likedSet = new Set(likedPosts.map((l) => l.postId));
      return feed.map((p) => ({ ...p, liked: likedSet.has(p.id) }));
    }

    return feed.map((p) => ({ ...p, liked: false }));
  }

  async createPost(userId: string, text: string, rating?: number) {
    const [post] = await this.db
      .insert(schema.posts)
      .values({ userId, text, rating: rating ?? null })
      .returning();
    return post;
  }

  async toggleLike(postId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.postLikes)
      .where(
        and(
          eq(schema.postLikes.postId, postId),
          eq(schema.postLikes.userId, userId),
        ),
      );

    if (existing) {
      await this.db
        .delete(schema.postLikes)
        .where(
          and(
            eq(schema.postLikes.postId, postId),
            eq(schema.postLikes.userId, userId),
          ),
        );
    } else {
      await this.db
        .insert(schema.postLikes)
        .values({ postId, userId });
    }

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.postLikes)
      .where(eq(schema.postLikes.postId, postId));

    return { liked: !existing, likeCount: result.count };
  }

  async getLikeStatus(postId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(schema.postLikes)
      .where(
        and(
          eq(schema.postLikes.postId, postId),
          eq(schema.postLikes.userId, userId),
        ),
      );
    return { liked: !!existing };
  }

  async getReplies(postId: string) {
    return this.db
      .select({
        id: schema.postReplies.id,
        text: schema.postReplies.text,
        createdAt: schema.postReplies.createdAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.postReplies)
      .innerJoin(schema.user, eq(schema.postReplies.userId, schema.user.id))
      .where(eq(schema.postReplies.postId, postId))
      .orderBy(schema.postReplies.createdAt);
  }

  async createReply(postId: string, userId: string, text: string) {
    const [post] = await this.db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    if (!post) throw new NotFoundException('Post not found');

    const [reply] = await this.db
      .insert(schema.postReplies)
      .values({ postId, userId, text })
      .returning();
    return reply;
  }
}
```

- [ ] **Step 2: Create social.controller.ts**

```ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Request } from 'express';

@Controller('api/feed')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  async getFeed(@Req() req: Request) {
    // Try to get user from request (may not be authenticated)
    const userId = (req as any)?.user?.id;
    return this.socialService.getFeed(userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  createPost(
    @Body('text') text: string,
    @Body('rating') rating?: number,
    @CurrentUser() user: { id: string },
  ) {
    return this.socialService.createPost(user.id, text, rating);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.socialService.toggleLike(id, user.id);
  }

  @Get(':id/like')
  @UseGuards(AuthGuard)
  getLikeStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.socialService.getLikeStatus(id, user.id);
  }

  @Get(':id/replies')
  getReplies(@Param('id') id: string) {
    return this.socialService.getReplies(id);
  }

  @Post(':id/reply')
  @UseGuards(AuthGuard)
  createReply(
    @Param('id') id: string,
    @Body('text') text: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.socialService.createReply(id, user.id, text);
  }
}
```

- [ ] **Step 3: Create social.module.ts**

```ts
import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [DbModule],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
```

- [ ] **Step 4: Register in app.module.ts**

Read `backend/src/app.module.ts`. Add:

```ts
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    AuthModule, DbModule, BooksModule, TransactionsModule,
    ReadingGoalsModule, SocialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Build + run migration**

```bash
cd backend && npm run build
cd backend && npx drizzle-kit generate && npx drizzle-kit push
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/social/ backend/src/app.module.ts backend/drizzle/
git commit -m "feat: create Social module with posts, likes, replies API"
```

---

### Task 3: Create Frontend Social Store

**Files:**
- Create: `frontend/stores/social.ts`

- [ ] **Step 1: Create social store**

```ts
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import { toast } from 'vue-sonner';

export interface Post {
  id: string;
  text: string;
  rating: number | null;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
  likeCount: number;
  replyCount: number;
  liked: boolean;
}

export interface Reply {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
}

export const useSocialStore = defineStore('social', () => {
  const posts = shallowRef<Post[]>([]);
  const loading = shallowRef(false);

  async function fetchFeed(): Promise<void> {
    loading.value = true;
    try {
      const res = await $fetch<Post[]>('/api/feed');
      posts.value = res;
    } catch {
      // not signed in or network error — leave empty
    } finally {
      loading.value = false;
    }
  }

  async function createPost(text: string, rating?: number): Promise<void> {
    try {
      await $fetch('/api/feed', {
        method: 'POST',
        body: { text, rating },
      });
      toast.success('Your review was published to the reader feed.');
      await fetchFeed();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to post');
      else toast.error('Failed to publish post');
      throw e;
    }
  }

  async function toggleLike(postId: string): Promise<void> {
    try {
      const res = await $fetch<{ liked: boolean; likeCount: number }>(
        `/api/feed/${postId}/like`,
        { method: 'POST' },
      );
      posts.value = posts.value.map((p) =>
        p.id === postId ? { ...p, liked: res.liked, likeCount: res.likeCount } : p,
      );
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to like posts');
      throw e;
    }
  }

  async function replyToPost(postId: string, text: string): Promise<void> {
    try {
      await $fetch(`/api/feed/${postId}/reply`, {
        method: 'POST',
        body: { text },
      });
      toast.success('Reply published.');
      await fetchFeed();
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error('Please sign in to reply');
      else toast.error('Failed to publish reply');
      throw e;
    }
  }

  return {
    posts: readonly(posts),
    loading: readonly(loading),
    fetchFeed,
    createPost,
    toggleLike,
    replyToPost,
  };
});
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/stores/social.ts
git commit -m "feat: create social Pinia store for posts, likes, replies"
```

---

### Task 4: Create FeedPost Component

**Files:**
- Create: `frontend/components/FeedPost.vue`

- [ ] **Step 1: Create FeedPost.vue**

```vue
<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next';
import type { Post } from '~/stores/social';
import { useSocialStore } from '~/stores/social';

const props = defineProps<{ post: Post }>();
const socialStore = useSocialStore();

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
</script>

<template>
  <article class="border-l border-foreground/5 pl-4">
    <div class="mb-1 flex items-center gap-2">
      <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
        {{ initials(post.user.name) }}
      </span>
      <span class="text-[11px] font-bold uppercase">{{ post.user.name }}</span>
      <span class="font-mono text-[10px] text-muted-foreground">{{ timeAgo(post.createdAt) }}</span>
    </div>
    <p class="text-sm leading-snug text-foreground/80">{{ post.text }}</p>
    <p v-if="post.rating" class="mt-1.5 text-xs text-primary">
      {{ '★★★★★'.slice(0, post.rating) }}<span class="text-foreground/10">{{ '★★★★★'.slice(post.rating) }}</span>
    </p>
    <div class="mt-2 flex items-center gap-3">
      <Button
        variant="archivalGhost"
        size="sm"
        @click="socialStore.toggleLike(props.post.id)"
        :class="post.liked ? 'text-primary' : ''"
      >
        {{ post.liked ? 'Liked' : 'Like' }} ({{ post.likeCount }})
      </Button>
    </div>
  </article>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/FeedPost.vue
git commit -m "feat: create FeedPost component with like and time-ago"
```

---

### Task 5: Create CompactFeedPosts Component

**Files:**
- Create: `frontend/components/CompactFeedPosts.vue`

- [ ] **Step 1: Create CompactFeedPosts.vue**

```vue
<script setup lang="ts">
import type { Post } from '~/stores/social';

defineProps<{ posts: Post[] }>();

function initials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
</script>

<template>
  <div v-if="posts.length === 0">
    <p class="text-sm italic text-muted-foreground">No recent activity.</p>
  </div>
  <div v-else class="space-y-6">
    <article
      v-for="post in posts"
      :key="post.id"
      class="border-l border-foreground/5 pl-4"
    >
      <div class="mb-1 flex items-center gap-2">
        <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
          {{ initials(post.user.name) }}
        </span>
        <span class="text-[11px] font-bold uppercase">{{ post.user.name }}</span>
        <span class="font-mono text-[10px] text-muted-foreground">{{ timeAgo(post.createdAt) }}</span>
      </div>
      <p class="line-clamp-2 text-sm leading-snug text-foreground/80">{{ post.text }}</p>
      <p v-if="post.rating" class="mt-1 text-xs text-primary">
        {{ '★★★★★'.slice(0, post.rating) }}<span class="text-foreground/10">{{ '★★★★★'.slice(post.rating) }}</span>
      </p>
    </article>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/CompactFeedPosts.vue
git commit -m "feat: create CompactFeedPosts component for sidebar widget"
```

---

### Task 6: Replace Social Page + Update Home Sidebar

**Files:**
- Modify: `frontend/pages/social.vue`
- Modify: `frontend/pages/home.vue`

- [ ] **Step 1: Replace social.vue**

Read the current file, replace with:

```vue
<script setup lang="ts">
import { useSocialStore } from '~/stores/social';

const socialStore = useSocialStore();
const text = shallowRef('');
const rating = shallowRef(0);
const submitting = shallowRef(false);

definePageMeta({
  layout: 'app',
  title: 'Social — Read in Peace',
  description: 'Reader feed and community discussions.',
});

async function handlePublish() {
  if (!text.value.trim()) return;
  submitting.value = true;
  try {
    await socialStore.createPost(text.value, rating.value || undefined);
    text.value = '';
    rating.value = 0;
  } catch {
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  socialStore.fetchFeed();
});
</script>

<template>
  <div class="space-y-8">
    <!-- Post Composer -->
    <section class="animate-enter rounded-sm border border-border bg-card p-5">
      <h2 class="mb-3 font-serif text-lg">What are you reading?</h2>
      <textarea
        v-model="text"
        rows="3"
        placeholder="Share your thoughts..."
        class="mb-3 w-full resize-none rounded-sm border border-border bg-input p-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring"
      />
      <div class="flex items-center justify-between">
        <div class="flex gap-1" aria-label="Rating">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            :aria-label="`Rate ${n} stars`"
            @click="rating = rating === n ? 0 : n"
            class="cursor-pointer text-lg"
            :class="n <= rating ? 'text-primary' : 'text-border'"
          >
            {{ n <= rating ? '★' : '☆' }}
          </button>
        </div>
        <Button
          variant="archival"
          :disabled="!text.trim() || submitting"
          @click="handlePublish"
        >
          {{ submitting ? 'Publishing' : 'Publish' }}
        </Button>
      </div>
    </section>

    <!-- Feed -->
    <section class="animate-enter [animation-delay:100ms]">
      <div class="mb-6 flex items-baseline justify-between border-b border-border pb-2">
        <h1 class="font-serif text-2xl">Reader Feed</h1>
        <span class="size-2 rounded-full bg-primary" />
      </div>

      <template v-if="socialStore.loading">
        <p class="text-muted-foreground italic">Loading feed...</p>
      </template>
      <template v-else-if="socialStore.posts.length === 0">
        <p class="text-muted-foreground italic">No posts yet. Start the conversation!</p>
      </template>
      <div v-else class="space-y-6">
        <FeedPost v-for="post in socialStore.posts" :key="post.id" :post="post" />
      </div>
    </section>
  </div>

  <!-- Sidebar slots -->
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
</template>
```

- [ ] **Step 2: Update home.vue sidebar reader-feed slot**

Read `frontend/pages/home.vue`. In the `<template #sidebar>` section, add the reader-feed slot alongside yearly-progress. The current home.vue has:

```vue
<template #sidebar>
  <AppSidebar>
    <template #yearly-progress>
      <YearlyProgressCard />
    </template>
  </AppSidebar>
</template>
```

Update it to also fill the reader-feed slot:

```vue
<template #sidebar>
  <AppSidebar>
    <template #yearly-progress>
      <YearlyProgressCard />
    </template>
    <template #reader-feed>
      <CompactFeedPosts :posts="socialPosts.slice(0, 3)" />
    </template>
  </AppSidebar>
</template>
```

Also add to the script section of home.vue:

```ts
import { useSocialStore } from '~/stores/social';

const socialStore = useSocialStore();
const socialPosts = computed(() => socialStore.posts);
```

And in `onMounted`:

```ts
onMounted(async () => {
  await Promise.all([dashboard.fetchBorrows(), booksStore.fetchNewArrivals()]);
  socialStore.fetchFeed(); // fetch social feed for sidebar
});
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds, no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/pages/social.vue frontend/pages/home.vue
git commit -m "feat: replace social page with full feed; add sidebar feed to home"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run backend tests**

```bash
cd backend && npm test
```

Expected: All tests pass. New services may need test additions.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npm run build
```

Expected: Client + Server build succeeds.

- [ ] **Step 3: Visual checklist**

- `/social` — Feed shows seed posts with names, time, text, star ratings
- Like button toggles count and color
- Post composer publishes new posts
- Home page sidebar shows compact feed (3 posts)
- Both pages have yearly progress widget still working

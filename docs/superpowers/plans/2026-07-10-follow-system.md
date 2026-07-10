# Follow/Unfollow System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add follow/unfollow functionality — backend API + frontend UI — with self-follow prevention and error handling.

**Architecture:** Add a `follows` table to the DB schema, extend the existing `profiles/` backend module with follow toggle + follow-status-aware profile response, and wire the Follow button in `ProfileInfo.vue` to a `useFollow` composable with optimistic updates.

**Tech Stack:** NestJS, Drizzle ORM + PostgreSQL, Better Auth (sessions), Nuxt 3 + Vue 3 Composition API, Tailwind CSS v4.

---

## File Structure

### Backend — Modified (5 files)
```
backend/src/core/database/schema.ts                          — add follows table
backend/src/profiles/domain/profile.ts                       — add follow types + methods to ProfileRepository
backend/src/profiles/infrastructure/drizzle-profile.repository.ts  — implement follow methods
backend/src/profiles/application/profile.service.ts          — add toggle + follow-status in getProfile
backend/src/profiles/presentation/profile.controller.ts      — add follow endpoint + auth
backend/src/profiles/profiles.module.ts                      — import IamModule for AuthGuard
```

### Frontend — Modified (3 files)
```
frontend/types/profile.ts                                   — add FollowInfo type
frontend/components/profile/ProfileInfo.vue                 — wire follow button to composable
frontend/pages/profile/[id].vue                              — pass follow state, handle toggle
```

### Frontend — Created (1 file)
```
frontend/composables/useFollow.ts                            — follow/unfollow composable
```

---

### Task 1: Add follows table to database schema

**Files:**
- Modify: `backend/src/core/database/schema.ts`

- [ ] **Step 1: Add follows table after the `stripeEvents` table (last table, around line 312)**

```typescript
// ——— Social graph ———
export const follows = pgTable(
  'follows',
  {
    followerId: text('follower_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);
```

Note: `primaryKey` is already imported from `drizzle-orm/pg-core` at line 15.

- [ ] **Step 2: Generate migration**

```bash
cd backend
docker compose up -d
npm run db:migrate
```

---

### Task 2: Update profile domain — add follow types and methods

**Files:**
- Modify: `backend/src/profiles/domain/profile.ts`

- [ ] **Step 1: Add `FollowInfo` type and extend `ProfileRepository` and `ProfileResponse`**

```typescript
export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface ProfileUser {
  id: string;
  name: string;
  image: string | null;
  createdAt: Date;
}

export interface FollowInfo {
  following: boolean;
  followerCount: number;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  purchaseCount: number;
}

export interface ProfileResponse {
  user: ProfileUser;
  categoryStats: CategoryStat[];
  follow: FollowInfo | null;
}

export interface ProfileRepository {
  findById(id: string): Promise<ProfileUser | null>;
  getCategoryStats(userId: string): Promise<CategoryStat[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  countFollowers(userId: string): Promise<number>;
  toggleFollow(followerId: string, followingId: string): Promise<{ following: boolean; followerCount: number }>;
}
```

---

### Task 3: Implement follow methods in Drizzle repository

**Files:**
- Modify: `backend/src/profiles/infrastructure/drizzle-profile.repository.ts`

- [ ] **Step 1: Add `isFollowing`, `countFollowers`, `toggleFollow` methods**

Replace the import line and the class to include:
```typescript
import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import type { ProfileRepository, CategoryStat } from '../domain/profile';

@Injectable()
export class DrizzleProfileRepository implements ProfileRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string) {
    const [row] = await this.db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, id));
    return row ?? null;
  }

  async getCategoryStats(userId: string): Promise<CategoryStat[]> {
    const borrowRows = await this.db
      .select({
        category: schema.books.category,
        borrowCount: count(),
      })
      .from(schema.borrows)
      .innerJoin(schema.books, eq(schema.borrows.bookId, schema.books.id))
      .where(eq(schema.borrows.userId, userId))
      .groupBy(schema.books.category)
      .orderBy(schema.books.category);

    const purchaseRows = await this.db
      .select({
        category: schema.books.category,
        purchaseCount: count(),
      })
      .from(schema.purchases)
      .innerJoin(schema.books, eq(schema.purchases.bookId, schema.books.id))
      .where(eq(schema.purchases.userId, userId))
      .groupBy(schema.books.category)
      .orderBy(schema.books.category);

    const borrowMap = new Map(borrowRows.map((r) => [r.category, Number(r.borrowCount)]));
    const purchaseMap = new Map(purchaseRows.map((r) => [r.category, Number(r.purchaseCount)]));

    const allCategories = [...new Set([...borrowMap.keys(), ...purchaseMap.keys()])].sort();

    return allCategories.map((category) => ({
      category,
      borrowCount: borrowMap.get(category) ?? 0,
      purchaseCount: purchaseMap.get(category) ?? 0,
    }));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [row] = await this.db
      .select()
      .from(schema.follows)
      .where(and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)));
    return !!row;
  }

  async countFollowers(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId));
    return Number(result?.value ?? 0);
  }

  async toggleFollow(followerId: string, followingId: string): Promise<{ following: boolean; followerCount: number }> {
    const existing = await this.isFollowing(followerId, followingId);

    if (existing) {
      await this.db
        .delete(schema.follows)
        .where(and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)));
    } else {
      await this.db.insert(schema.follows).values({ followerId, followingId });
    }

    const followerCount = await this.countFollowers(followingId);
    return { following: !existing, followerCount };
  }
}
```

---

### Task 4: Update profile service — add toggle with self-follow check

**Files:**
- Modify: `backend/src/profiles/application/profile.service.ts`

- [ ] **Step 1: Add `toggleFollow` and update `getProfile` to accept optional `currentUserId`**

```typescript
import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { ProfileResponse } from '../domain/profile';
import { PROFILE_REPOSITORY } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
  ) {}

  async getProfile(profileId: string, currentUserId?: string): Promise<ProfileResponse> {
    const user = await this.profiles.findById(profileId);
    if (!user) throw new NotFoundException('User not found');

    const [categoryStats, follow] = await Promise.all([
      this.profiles.getCategoryStats(profileId),
      currentUserId
        ? this.profiles.isFollowing(currentUserId, profileId).then(async (following) => {
            const followerCount = await this.profiles.countFollowers(profileId);
            return { following, followerCount };
          })
        : null,
    ]);

    return { user, categoryStats, follow };
  }

  async toggleFollow(followerId: string, followingId: string): Promise<{ following: boolean; followerCount: number }> {
    if (followerId === followingId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    const target = await this.profiles.findById(followingId);
    if (!target) throw new NotFoundException('User not found');

    return this.profiles.toggleFollow(followerId, followingId);
  }
}
```

---

### Task 5: Update controller — add follow endpoint with auth

**Files:**
- Modify: `backend/src/profiles/presentation/profile.controller.ts`

- [ ] **Step 1: Add auth guards and follow endpoint**

```typescript
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../iam/auth/auth.guard';
import { OptionalAuthGuard } from '../../iam/auth/auth.guard';
import { CurrentUser } from '../../iam/auth/current-user.decorator';
import { ProfileService } from '../application/profile.service';
import type { AuthUser } from '../../iam/auth/auth.port';

@Controller('api/profiles')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getProfile(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.profiles.getProfile(id, user?.id);
  }

  @Post(':id/follow')
  @UseGuards(AuthGuard)
  async toggleFollow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.profiles.toggleFollow(user.id, id);
  }
}
```

---

### Task 6: Update profiles module — import IamModule for AuthGuard

**Files:**
- Modify: `backend/src/profiles/profiles.module.ts`

- [ ] **Step 1: Add IamModule import**

```typescript
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DrizzleProfileRepository } from './infrastructure/drizzle-profile.repository';
import { PROFILE_REPOSITORY } from './domain/profile';
import { ProfileService } from './application/profile.service';
import { ProfileController } from './presentation/profile.controller';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule],
  controllers: [ProfileController],
  providers: [
    DrizzleProfileRepository,
    ProfileService,
    alias(PROFILE_REPOSITORY, DrizzleProfileRepository),
  ],
})
export class ProfilesModule {}
```

---

### Task 7: Run backend lint and build

- [ ] **Step 1: Run lint**

```bash
cd backend && npm run lint
```

Expected: 0 errors (pre-existing warnings only)

- [ ] **Step 2: Run build**

```bash
cd backend && npm run build
```

Expected: Compilation successful

- [ ] **Step 3: Commit**

```bash
git add backend/ && git commit -m "feat: add follow/unfollow with self-follow prevention"
```

---

### Task 8: Update frontend profile types

**Files:**
- Modify: `frontend/types/profile.ts`

- [ ] **Step 1: Add `FollowInfo` and update `ProfileResponse`**

```typescript
export interface ProfileUser {
  id: string;
  name: string;
  image: string | null;
  createdAt: string;
}

export interface CategoryStat {
  category: string;
  borrowCount: number;
  purchaseCount: number;
}

export interface FollowInfo {
  following: boolean;
  followerCount: number;
}

export interface ProfileResponse {
  user: ProfileUser;
  categoryStats: CategoryStat[];
  follow: FollowInfo | null;
}
```

---

### Task 9: Create useFollow composable

**Files:**
- Create: `frontend/composables/useFollow.ts`

- [ ] **Step 1: Write composable with optimistic toggle**

```typescript
import { shallowRef, readonly } from 'vue'
import { useAuthStore } from '~/stores/auth'

export function useFollow() {
  const auth = useAuthStore()
  const submitting = shallowRef(false)
  const error = shallowRef<string | null>(null)

  async function toggle(
    targetUserId: string,
    onUpdate: (result: { following: boolean; followerCount: number }) => void,
  ) {
    if (!auth.signedIn) {
      auth.openAuthModal()
      return
    }
    if (auth.user?.id === targetUserId) {
      error.value = 'You cannot follow yourself'
      return
    }

    submitting.value = true
    error.value = null

    try {
      const result = await $fetch<{ following: boolean; followerCount: number }>(
        `/api/profiles/${targetUserId}/follow`,
        { method: 'POST' },
      )
      onUpdate(result)
    } catch (err: any) {
      error.value = err?.message ?? err?.data?.message ?? 'Failed to toggle follow'
    } finally {
      submitting.value = false
    }
  }

  return {
    submitting: readonly(submitting),
    error: readonly(error),
    toggle,
  }
}
```

---

### Task 10: Wire the follow button in ProfileInfo.vue

**Files:**
- Modify: `frontend/components/profile/ProfileInfo.vue`

- [ ] **Step 1: Update props to accept follow info, replace `comingSoon` with `toggle` emit**

```vue
<script setup lang="ts">
import { Calendar, MessageCircle, UserCheck, UserPlus } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import type { ProfileUser, FollowInfo } from "~/types/profile";
import { useAuthStore } from "~/stores/auth";

defineProps<{
  user: ProfileUser;
  following: boolean | null;
  followerCount: number;
}>();

const emit = defineEmits<{
  follow: [];
}>();

const { flash } = useFlash();
const auth = useAuthStore();

const bio = ref(
  "Avid reader and collector of rare editions. I spend most weekends curled up with a good mystery or a thick work of historical fiction.",
);

const plan = ref("Curator");

const lastActiveLabel = ref("2hr ago");

const isOwnProfile = computed(() => auth.user?.id === props.user.id);

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function onFollowClick() {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  emit("follow");
}

function onMessageClick() {
  flash("The feature is coming soon!");
}
</script>

<template>
  <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
    <div
      class="mx-auto flex size-45 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-serif font-bold text-primary-foreground sm:mx-0"
    >
      <img
        v-if="user.image"
        :src="user.image"
        :alt="user.name"
        class="size-full object-cover"
      />
      <span v-else>{{ initials(user.name) }}</span>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        <h1 class="font-serif text-3xl font-bold tracking-tight">
          {{ user.name.toUpperCase() }}
        </h1>
        <span
          class="inline-flex h-6 items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[10px] font-medium uppercase tracking-wider text-primary"
        >
          {{ plan }}
        </span>
      </div>
      <p
        class="flex flex-col items-start justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start"
      >
        <p class="text-sm mb-2 leading-relaxed text-muted-foreground max-w-xl">
          {{ bio }}
        </p>
        <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar class="size-3.5" />
          Member since {{ formatDate(user.createdAt) }}
        </p>
        <p class="text-xs text-muted-foreground/60">
          Active {{ lastActiveLabel }}
        </p>
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-2 sm:self-start">
      <Button
        v-if="!isOwnProfile"
        variant="archival"
        size="sm"
        :disabled="auth.user?.id === user.id"
        @click="onFollowClick"
      >
        <UserCheck v-if="following" class="mr-1.5 size-4" />
        <UserPlus v-else class="mr-1.5 size-4" />
        {{ following ? "Following" : "Follow" }}
        <span v-if="followerCount > 0" class="ml-1 text-xs opacity-70">
          {{ followerCount }}
        </span>
      </Button>
      <Button
        v-if="!isOwnProfile"
        variant="archivalOutline"
        size="sm"
        @click="onMessageClick"
      >
        <MessageCircle class="mr-1.5 size-4" />
        Message
      </Button>
    </div>
  </div>
</template>
```

---

### Task 11: Update profile page — wire follow toggle

**Files:**
- Modify: `frontend/pages/profile/[id].vue`

- [ ] **Step 1: Add `useFollow` composable and pass follow props to ProfileInfo**

```vue
<script setup lang="ts">
import { BookOpen } from "lucide-vue-next";
import { useProfile } from "~/composables/useProfile";
import { useFollow } from "~/composables/useFollow";
import ProfileInfo from "~/components/profile/ProfileInfo.vue";
import StatsRadar from "~/components/profile/StatsRadar.vue";

definePageMeta({
  title: "Profile — Read in Peace",
  description: "User profile and reading stats by category.",
});

const { flash } = useFlash();
const route = useRoute();
const userId = computed(() => route.params.id as string);
const { profile, loading, error, refresh } = useProfile(userId.value);
const { submitting, error: followError, toggle } = useFollow();

watch(error, (err) => {
  if (err) flash("Could not load profile");
});

watch(followError, (err) => {
  if (err) flash(err);
});

watch(userId, () => refresh());

function onFollow() {
  toggle(userId.value, (result) => {
    if (profile.value) {
      profile.value = {
        ...profile.value,
        follow: { following: result.following, followerCount: result.followerCount },
      };
    }
  });
}
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground">
    <Nav mode="feed" />
    <main
      id="main-content"
      class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14"
    >
      <div v-if="loading" class="mt-16 text-center">
        <p class="font-serif italic text-muted-foreground">
          Loading profile...
        </p>
      </div>

      <template v-else-if="profile">
        <section>
          <ProfileInfo
            :user="profile.user"
            :following="profile.follow?.following ?? null"
            :follower-count="profile.follow?.followerCount ?? 0"
            @follow="onFollow"
          />
        </section>

        <section
          v-if="profile.categoryStats.length > 0"
          class="mt-14 border-t border-border pt-10"
        >
          <StatsRadar :categories="profile.categoryStats" />
        </section>

        <section v-else class="mt-14 border-t border-border pt-10 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <h2 class="mt-4 font-serif text-xl">No activity yet</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            This user hasn't borrowed or purchased any books yet.
          </p>
        </section>
      </template>

      <div v-else class="mt-16 text-center">
        <BookOpen class="mx-auto size-10 text-muted-foreground" />
        <h2 class="mt-4 font-serif text-2xl">User not found</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          This profile does not exist or has been removed.
        </p>
      </div>
    </main>
  </div>
</template>
```

---

### Task 12: Run frontend lint and build

- [ ] **Step 1: Run lint**

```bash
cd frontend && npm run lint
```

Expected: 0 errors (pre-existing warnings only)

- [ ] **Step 2: Run build**

```bash
cd frontend && npm run build
```

Expected: Compilation successful

- [ ] **Step 3: Commit**

```bash
git add frontend/ && git commit -m "feat: wire follow button to useFollow composable"
```

---

## Self-Review

**1. Spec coverage:**
- Follow/unfollow API → Task 5: `POST /api/profiles/:id/follow` with AuthGuard
- Self-follow prevention → Task 4: `ForbiddenException` when `followerId === followingId`
- Error handling → Task 4: `NotFoundException` for missing target; Task 5: `AuthGuard` rejects unauthenticated; Task 9: composable catches API errors and sets error state
- Frontend follow button → Task 10: ProfileInfo emits `follow`, shows UserCheck/UserPlus icons based on state
- Optimistic toggle → Task 11: page calls `toggle` and updates `profile.follow` reactively on success
- Hides follow button on own profile → Task 10: `v-if="!isOwnProfile"`

**2. Placeholder scan:** All code blocks contain complete implementations. No TBD, TODO patterns.

**3. Type consistency:** `FollowInfo.following` (boolean), `followerCount` (number) used consistently from backend domain → service → controller → frontend types → composable → ProfileInfo props.

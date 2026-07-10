# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user profile page with avatar/info section and a radar chart comparing borrowed vs purchased books by category.

**Architecture:** New `profiles/` backend module with a single `GET /api/profiles/:id` endpoint returning user info + per-category borrow/purchase counts. Frontend fetches via composable and renders a two-dataset SVG radar chart. No follow, DM, or social graph features.

**Tech Stack:** NestJS, Drizzle ORM + PostgreSQL, Nuxt 3 + Vue 3 Composition API, Tailwind CSS v4, SVG radar chart (zero dependencies).

---

## File Structure

### Backend — New `profiles/` module (5 files)
```
backend/src/profiles/
  profiles.module.ts
  domain/profile.ts                    — types, tokens, repository interface
  application/profile.service.ts
  presentation/profile.controller.ts
  infrastructure/
    drizzle-profile.repository.ts
```

### Backend — Modified
```
backend/src/app.module.ts              — import ProfilesModule
```

### Frontend — New (5 files)
```
frontend/
  pages/profile/[id].vue               — profile page
  types/profile.ts                     — profile types
  composables/useProfile.ts            — fetch profile
  components/profile/
    ProfileInfo.vue                    — avatar + user info
    StatsRadar.vue                     — radar chart (borrowed vs purchased by category)
```

### Frontend — Modified
```
frontend/components/auth/ProfileDropdown.vue  — add "View Profile" link
```

---

### Task 1: Profile domain — types, tokens, repository interface

**Files:**
- Create: `backend/src/profiles/domain/profile.ts`

- [ ] **Step 1: Write domain file**

```typescript
import type { AuthUser } from '../../iam/auth/auth.port';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

export interface CategoryStat {
  category: string;
  borrowCount: number;
  purchaseCount: number;
}

export interface ProfileResponse {
  user: {
    id: string;
    name: string;
    image: string | null;
    createdAt: Date;
  };
  categoryStats: CategoryStat[];
}

export interface ProfileRepository {
  findById(id: string): Promise<{ id: string; name: string; image: string | null; createdAt: Date } | null>;
  getCategoryStats(userId: string): Promise<CategoryStat[]>;
}
```

---

### Task 2: Profile infrastructure — Drizzle repository

**Files:**
- Create: `backend/src/profiles/infrastructure/drizzle-profile.repository.ts`

- [ ] **Step 1: Write repository**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
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
}
```

---

### Task 3: Profile service

**Files:**
- Create: `backend/src/profiles/application/profile.service.ts`

- [ ] **Step 1: Write service**

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ProfileResponse } from '../domain/profile';
import { PROFILE_REPOSITORY } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
  ) {}

  async getProfile(profileId: string): Promise<ProfileResponse> {
    const user = await this.profiles.findById(profileId);
    if (!user) throw new NotFoundException('User not found');

    const categoryStats = await this.profiles.getCategoryStats(profileId);
    return { user, categoryStats };
  }
}
```

---

### Task 4: Profile controller

**Files:**
- Create: `backend/src/profiles/presentation/profile.controller.ts`

- [ ] **Step 1: Write controller**

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ProfileService } from '../application/profile.service';

@Controller('api/profiles')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.profiles.getProfile(id);
  }
}
```

---

### Task 5: Wire up profiles module

**Files:**
- Create: `backend/src/profiles/profiles.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create module**

```typescript
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DrizzleProfileRepository } from './infrastructure/drizzle-profile.repository';
import { PROFILE_REPOSITORY } from './domain/profile';
import { ProfileService } from './application/profile.service';
import { ProfileController } from './presentation/profile.controller';

const alias = (token: symbol, impl: unknown) => ({ provide: token, useExisting: impl });

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

- [ ] **Step 2: Import in app.module.ts**

Add import at top:
```typescript
import { ProfilesModule } from './profiles/profiles.module';
```

Add to `imports` array after `MembershipModule`:
```typescript
    ProfilesModule,
```

- [ ] **Step 3: Run backend lint**

```bash
npm run lint
```

---

### Task 6: Frontend profile types

**Files:**
- Create: `frontend/types/profile.ts`

- [ ] **Step 1: Write types**

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

export interface ProfileResponse {
  user: ProfileUser;
  categoryStats: CategoryStat[];
}
```

---

### Task 7: Profile composable

**Files:**
- Create: `frontend/composables/useProfile.ts`

- [ ] **Step 1: Write composable**

```typescript
import { ref, shallowRef, readonly } from 'vue'
import type { ProfileResponse } from '~/types/profile'

export function useProfile(userId: string) {
  const profile = ref<ProfileResponse | null>(null)
  const loading = shallowRef(true)
  const error = shallowRef<unknown>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<ProfileResponse>(`/api/profiles/${userId}`)
      profile.value = data
    } catch (e) {
      error.value = e
      profile.value = null
    } finally {
      loading.value = false
    }
  }

  fetch()

  return {
    profile: readonly(profile),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetch,
  }
}
```

---

### Task 8: ProfileInfo component — avatar + user info

**Files:**
- Create: `frontend/components/profile/ProfileInfo.vue`

- [ ] **Step 1: Write component**

```vue
<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'
import type { ProfileUser } from '~/types/profile'

defineProps<{
  user: ProfileUser
}>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
    <div
      class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-serif font-bold text-primary-foreground"
    >
      <img v-if="user.image" :src="user.image" :alt="user.name" class="size-full object-cover" />
      <span v-else>{{ initials(user.name) }}</span>
    </div>
    <div class="min-w-0 text-center sm:text-left">
      <h1 class="font-serif text-3xl font-bold tracking-tight">{{ user.name }}</h1>
      <p class="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
        <Calendar class="size-3.5" />
        Member since {{ formatDate(user.createdAt) }}
      </p>
    </div>
  </div>
</template>
```

---

### Task 9: StatsRadar component — borrowed vs purchased by category

**Files:**
- Create: `frontend/components/profile/StatsRadar.vue`

- [ ] **Step 1: Write component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryStat } from '~/types/profile'

const props = withDefaults(defineProps<{
  categories: CategoryStat[]
  size?: number
}>(), {
  size: 340,
})

const effectiveMax = computed(() => {
  const max = Math.max(
    ...props.categories.flatMap((c) => [c.borrowCount, c.purchaseCount]),
    1,
  )
  return Math.ceil(max / 5) * 5 || 5
})

const center = computed(() => props.size / 2)
const radius = computed(() => center.value - 40)

function point(index: number, value: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / props.categories.length - Math.PI / 2
  const r = (value / effectiveMax.value) * radius.value
  return { x: center.value + r * Math.cos(angle), y: center.value + r * Math.sin(angle) }
}

function polygon(data: number[]): string {
  return data
    .map((v, i) => {
      const p = point(i, v)
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    })
    .join(' ') + ' Z'
}

const gridPoints = computed(() => {
  const levels = [0.25, 0.5, 0.75, 1]
  return levels.map((level) =>
    props.categories.map((_, i) => point(i, effectiveMax.value * level)),
  )
})

const borrowPolygon = computed(() => polygon(props.categories.map((c) => c.borrowCount)))
const purchasePolygon = computed(() => polygon(props.categories.map((c) => c.purchaseCount)))
</script>

<template>
  <div class="flex flex-col items-center">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="shrink-0"
      role="img"
      aria-label="Books by category — borrowed vs purchased"
    >
      <!-- Grid rings -->
      <polygon
        v-for="(points, i) in gridPoints"
        :key="i"
        :points="points.map((p) => `${p.x},${p.y}`).join(' ')"
        fill="none"
        stroke="var(--border)"
        stroke-width="1"
      />

      <!-- Axes -->
      <line
        v-for="(cat, i) in categories"
        :key="cat.category"
        :x1="center"
        :y1="center"
        :x2="point(i, effectiveMax).x"
        :y2="point(i, effectiveMax).y"
        stroke="var(--border)"
        stroke-width="1"
      />

      <!-- Borrowed polygon -->
      <polygon
        :points="borrowPolygon"
        fill="var(--primary)"
        fill-opacity="0.15"
        stroke="var(--primary)"
        stroke-width="2"
        stroke-dasharray="none"
      />
      <circle
        v-for="(cat, i) in categories"
        :key="'b' + cat.category"
        :cx="point(i, cat.borrowCount).x"
        :cy="point(i, cat.borrowCount).y"
        r="3.5"
        fill="var(--primary)"
      />

      <!-- Purchased polygon -->
      <polygon
        :points="purchasePolygon"
        fill="oklch(0.5 0.15 250)"
        fill-opacity="0.12"
        stroke="oklch(0.5 0.15 250)"
        stroke-width="2"
        stroke-dasharray="4 3"
      />
      <circle
        v-for="(cat, i) in categories"
        :key="'p' + cat.category"
        :cx="point(i, cat.purchaseCount).x"
        :cy="point(i, cat.purchaseCount).y"
        r="3.5"
        fill="oklch(0.5 0.15 250)"
      />

      <!-- Labels -->
      <text
        v-for="(cat, i) in categories"
        :key="'l' + cat.category"
        :x="point(i, effectiveMax * 1.18).x"
        :y="point(i, effectiveMax * 1.18).y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="fill-foreground text-[11px] font-mono"
      >
        {{ cat.category }}
      </text>
    </svg>

    <!-- Legend -->
    <div class="mt-4 flex items-center gap-6 text-xs">
      <span class="flex items-center gap-2">
        <span class="inline-block size-3 rounded-xs bg-primary" />
        Borrowed
      </span>
      <span class="flex items-center gap-2">
        <span class="inline-block size-3 rounded-xs" style="background: oklch(0.5 0.15 250)" />
        Purchased
      </span>
    </div>
  </div>
</template>
```

---

### Task 10: Profile page

**Files:**
- Create: `frontend/pages/profile/[id].vue`

- [ ] **Step 1: Write page**

```vue
<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next'
import { useProfile } from '~/composables/useProfile'
import ProfileInfo from '~/components/profile/ProfileInfo.vue'
import StatsRadar from '~/components/profile/StatsRadar.vue'

definePageMeta({
  title: 'Profile — Read in Peace',
  description: 'User profile and reading stats by category.',
})

const route = useRoute()
const userId = computed(() => route.params.id as string)
const { profile, loading } = useProfile(userId.value)
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground">
    <Nav mode="feed" />
    <main id="main-content" class="mx-auto max-w-3xl px-4 py-10 md:px-6 lg:py-14">
      <div v-if="loading" class="mt-16 text-center">
        <p class="font-serif italic text-muted-foreground">Loading profile...</p>
      </div>

      <template v-else-if="profile">
        <!-- Section 1: Avatar + user info -->
        <section>
          <ProfileInfo :user="profile.user" />
        </section>

        <!-- Section 2: Radar chart -->
        <section v-if="profile.categoryStats.length > 0" class="mt-14 border-t border-border pt-10">
          <h2 class="mb-8 text-center font-serif text-xl font-semibold sm:text-left">
            Books by Category
          </h2>
          <div class="flex flex-col items-center">
            <StatsRadar :categories="profile.categoryStats" />
          </div>
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

### Task 11: Add "View Profile" link to ProfileDropdown

**Files:**
- Modify: `frontend/components/auth/ProfileDropdown.vue`

- [ ] **Step 1: Add profile link after the "My Library" link (after line 59)**

```vue
      <NuxtLink
        :to="`/profile/${auth.user?.id}`"
        class="flex w-full items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
        @click="show = false"
      >
        View Profile
      </NuxtLink>
      <hr class="border-border" />
```

---

### Task 12: Verify

- [ ] **Step 1: Run backend lint**

```bash
cd backend && npm run lint
```

- [ ] **Step 2: Run backend build**

```bash
cd backend && npm run build
```

- [ ] **Step 3: Run frontend lint**

```bash
cd frontend && npm run lint
```

- [ ] **Step 4: Run frontend build**

```bash
cd frontend && npm run build
```

---

## Self-Review

**1. Spec coverage:**
- Profile image (left) + user info (right) → Task 8 ProfileInfo.vue: flex row with avatar on left, name + date on right
- Big radar chart — borrowed vs purchased by category → Task 9 StatsRadar.vue: two-dataset SVG radar polygon with legend, 340px default size
- No follow/DM system → removed all follow, conversation, message code
- Only get user profile endpoint → Task 4: single `GET /api/profiles/:id` returning user + categoryStats

**2. Placeholder scan:** All code blocks contain complete implementations. No TBD, TODO patterns.

**3. Type consistency:** `CategoryStat.category` (string), `borrowCount`/`purchaseCount` (number) used consistently from backend repository → domain types → frontend types → composable → StatsRadar component.

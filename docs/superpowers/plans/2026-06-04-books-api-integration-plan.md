# Books API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock book data with real PostgreSQL-backed API — book CRUD, likes, comments, ratings, borrow/return/buy, offset pagination.

**Architecture:** Two NestJS feature modules (BooksModule, TransactionsModule) using Drizzle ORM against PostgreSQL. Existing Better Auth guard protects authenticated routes. Nuxt server proxy forwards all `/api/*` to backend. Frontend stores rewritten to call real API.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL 17 (Docker), Better Auth, Nuxt 3, Pinia, Tailwind CSS v4, shadcn-vue

---

## File Structure

### Backend (create)
- `backend/src/books/books.module.ts` — registers all sub-controllers + services
- `backend/src/books/books.controller.ts` — CRUD endpoints
- `backend/src/books/books.service.ts` — CRUD logic with pagination + owner check
- `backend/src/books/likes.controller.ts` — toggle like endpoint
- `backend/src/books/likes.service.ts` — like/unlike logic
- `backend/src/books/comments.controller.ts` — comment CRUD endpoints
- `backend/src/books/comments.service.ts` — comment CRUD logic
- `backend/src/books/ratings.controller.ts` — rating endpoint
- `backend/src/books/ratings.service.ts` — upsert rating + compute average
- `backend/src/transactions/transactions.module.ts`
- `backend/src/transactions/transactions.controller.ts` — borrow/return/buy + user dashboard
- `backend/src/transactions/transactions.service.ts`

### Backend (modify)
- `backend/src/db/schema.ts` — add 6 new tables
- `backend/src/app.module.ts` — register BooksModule + TransactionsModule

### Frontend (modify)
- `frontend/server/api/auth/[...].ts` → generalize to `server/api/[...].ts`
- `frontend/stores/books.ts` — rewrite for real API
- `frontend/stores/dashboard.ts` — rewrite for real API
- `frontend/pages/feed.vue` — API-driven pagination
- `frontend/pages/book/[id].vue` — real comments, likes, ratings
- `frontend/pages/dashboard.vue` — real borrowed/purchased data
- `frontend/components/BookCard.vue` — functional admin buttons

### Frontend (create)
- `frontend/components/BookFormModal.vue` — create/edit book form

---

### Task 1: DB Schema — Add new tables

**Files:**
- Modify: `backend/src/db/schema.ts`

- [ ] **Step 1: Add book, like, comment, rating, borrow, purchase table definitions**

Add these imports and tables at the bottom of `backend/src/db/schema.ts`:

```ts
import { pgTable, text, boolean, timestamp, integer, numeric, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ... existing user, session, account, verification tables ...

export const books = pgTable('books', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  author: text('author').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  cover: text('cover').notNull(),
  synopsis: text('synopsis').notNull(),
  category: text('category').notNull(),
  trending: boolean('trending').notNull().default(false),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const likes = pgTable('likes', {
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.bookId, table.userId] }),
]);

export const comments = pgTable('comments', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
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

export const ratings = pgTable('ratings', {
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.bookId, table.userId] }),
]);

export const borrows = pgTable('borrows', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  borrowedAt: timestamp('borrowed_at').notNull().defaultNow(),
  returnedAt: timestamp('returned_at'),
});

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
});
```

- [ ] **Step 2: Run drizzle-kit push to apply**

```bash
cd backend
npx drizzle-kit push
```

Expected output: "Your database is up to date" with the new tables created.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/migrations/
git commit -m "feat: add books, likes, comments, ratings, borrows, purchases tables"
```

---

### Task 2: Books Module — Service + Controller + Module

**Files:**
- Create: `backend/src/books/books.module.ts`
- Create: `backend/src/books/books.service.ts`
- Create: `backend/src/books/books.controller.ts`

- [ ] **Step 1: Create BooksService**

`backend/src/books/books.service.ts`:
```ts
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { desc, eq, sql, and, count } from 'drizzle-orm';

@Injectable()
export class BooksService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findAll(page: number, limit: number, category?: string) {
    const offset = (page - 1) * limit;
    const where = category ? eq(schema.books.category, category) : undefined;

    const data = await this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        author: schema.books.author,
        price: schema.books.price,
        cover: schema.books.cover,
        synopsis: schema.books.synopsis,
        category: schema.books.category,
        trending: schema.books.trending,
        createdBy: schema.books.createdBy,
        createdAt: schema.books.createdAt,
        updatedAt: schema.books.updatedAt,
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.likes} WHERE ${schema.likes.bookId} = ${schema.books.id})`,
        commentCount: sql<number>`(SELECT COUNT(*) FROM ${schema.comments} WHERE ${schema.comments.bookId} = ${schema.books.id})`,
        avgRating: sql<number>`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
      })
      .from(schema.books)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(schema.books.createdAt));

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(schema.books)
      .where(where);

    return {
      data,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async findOne(id: string) {
    const [book] = await this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        author: schema.books.author,
        price: schema.books.price,
        cover: schema.books.cover,
        synopsis: schema.books.synopsis,
        category: schema.books.category,
        trending: schema.books.trending,
        createdBy: schema.books.createdBy,
        createdAt: schema.books.createdAt,
        updatedAt: schema.books.updatedAt,
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.likes} WHERE ${schema.likes.bookId} = ${schema.books.id})`,
        commentCount: sql<number>`(SELECT COUNT(*) FROM ${schema.comments} WHERE ${schema.comments.bookId} = ${schema.books.id})`,
        avgRating: sql<number>`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
      })
      .from(schema.books)
      .where(eq(schema.books.id, id));

    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async create(data: {
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending?: boolean;
  }, userId: string) {
    const [book] = await this.db
      .insert(schema.books)
      .values({ ...data, createdBy: userId })
      .returning();
    return book;
  }

  async update(id: string, data: Partial<{
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending: boolean;
  }>, userId: string) {
    const existing = await this.findOne(id);
    if (existing.createdBy !== userId) {
      throw new ForbiddenException('You can only edit your own books');
    }
    const [updated] = await this.db
      .update(schema.books)
      .set(data)
      .where(eq(schema.books.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    if (existing.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own books');
    }
    await this.db.delete(schema.books).where(eq(schema.books.id, id));
  }

  async getTrending() {
    return this.db
      .select({
        id: schema.books.id,
        title: schema.books.title,
        author: schema.books.author,
        price: schema.books.price,
        cover: schema.books.cover,
        synopsis: schema.books.synopsis,
        category: schema.books.category,
        trending: schema.books.trending,
        createdBy: schema.books.createdBy,
        createdAt: schema.books.createdAt,
        updatedAt: schema.books.updatedAt,
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${schema.likes} WHERE ${schema.likes.bookId} = ${schema.books.id})`,
        commentCount: sql<number>`(SELECT COUNT(*) FROM ${schema.comments} WHERE ${schema.comments.bookId} = ${schema.books.id})`,
        avgRating: sql<number>`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`,
      })
      .from(schema.books)
      .orderBy(desc(sql`COALESCE((SELECT AVG(${schema.ratings.rating}) FROM ${schema.ratings} WHERE ${schema.ratings.bookId} = ${schema.books.id}), 0)`))
      .limit(3);
  }
}
```

- [ ] **Step 2: Create BooksController**

`backend/src/books/books.controller.ts`:
```ts
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BooksService } from './books.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.booksService.findAll(
      Number(page) || 1,
      Number(limit) || 12,
      category,
    );
  }

  @Get('trending')
  getTrending() {
    return this.booksService.getTrending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() body: {
      title: string;
      author: string;
      price: string;
      cover: string;
      synopsis: string;
      category: string;
      trending?: boolean;
    },
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.create(body, user.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: Partial<{
      title: string;
      author: string;
      price: string;
      cover: string;
      synopsis: string;
      category: string;
      trending: boolean;
    }>,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.update(id, body, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.booksService.remove(id, user.id);
  }
}
```

- [ ] **Step 3: Create BooksModule**

`backend/src/books/books.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  controllers: [BooksController, LikesController, CommentsController, RatingsController],
  providers: [BooksService, LikesService, CommentsService, RatingsService],
  exports: [BooksService],
})
export class BooksModule {}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/books/
git commit -m "feat: add BooksModule with CRUD endpoints"
```

---

### Task 3: Likes feature

**Files:**
- Create: `backend/src/books/likes.service.ts`
- Create: `backend/src/books/likes.controller.ts`

- [ ] **Step 1: Create LikesService**

`backend/src/books/likes.service.ts`:
```ts
import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class LikesService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async toggle(bookId: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.likes)
      .where(and(
        eq(schema.likes.bookId, bookId),
        eq(schema.likes.userId, userId),
      ));

    if (existing.length > 0) {
      await this.db
        .delete(schema.likes)
        .where(and(
          eq(schema.likes.bookId, bookId),
          eq(schema.likes.userId, userId),
        ));
    } else {
      await this.db
        .insert(schema.likes)
        .values({ bookId, userId });
    }

    const [{ count: likeCount }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.likes)
      .where(eq(schema.likes.bookId, bookId));

    return {
      liked: existing.length === 0,
      likeCount: Number(likeCount),
    };
  }
}
```

- [ ] **Step 2: Create LikesController**

`backend/src/books/likes.controller.ts`:
```ts
import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books/:id/like')
@UseGuards(AuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  toggle(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.likesService.toggle(id, user.id);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/books/likes.service.ts backend/src/books/likes.controller.ts
git commit -m "feat: add like/unlike toggle"
```

---

### Task 4: Comments feature

**Files:**
- Create: `backend/src/books/comments.service.ts`
- Create: `backend/src/books/comments.controller.ts`

- [ ] **Step 1: Create CommentsService**

`backend/src/books/comments.service.ts`:
```ts
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async findByBook(bookId: string) {
    return this.db
      .select({
        id: schema.comments.id,
        bookId: schema.comments.bookId,
        userId: schema.comments.userId,
        text: schema.comments.text,
        createdAt: schema.comments.createdAt,
        updatedAt: schema.comments.updatedAt,
        user: {
          id: schema.user.id,
          name: schema.user.name,
          image: schema.user.image,
        },
      })
      .from(schema.comments)
      .innerJoin(schema.user, eq(schema.comments.userId, schema.user.id))
      .where(eq(schema.comments.bookId, bookId))
      .orderBy(desc(schema.comments.createdAt));
  }

  async create(bookId: string, userId: string, text: string) {
    const [comment] = await this.db
      .insert(schema.comments)
      .values({ bookId, userId, text })
      .returning();
    return comment;
  }

  async remove(commentId: string, userId: string) {
    const [comment] = await this.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId));

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('You can only delete your own comments');

    await this.db.delete(schema.comments).where(eq(schema.comments.id, commentId));
  }
}
```

- [ ] **Step 2: Create CommentsController**

`backend/src/books/comments.controller.ts`:
```ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll(@Param('id') id: string) {
    return this.commentsService.findByBook(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Param('id') id: string,
    @Body('text') text: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.create(id, user.id, text);
  }

  @Delete(':commentId')
  @UseGuards(AuthGuard)
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.commentsService.remove(commentId, user.id);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/books/comments.service.ts backend/src/books/comments.controller.ts
git commit -m "feat: add comments CRUD"
```

---

### Task 5: Ratings feature

**Files:**
- Create: `backend/src/books/ratings.service.ts`
- Create: `backend/src/books/ratings.controller.ts`

- [ ] **Step 1: Create RatingsService**

`backend/src/books/ratings.service.ts`:
```ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class RatingsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async upsert(bookId: string, userId: string, rating: number) {
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    await this.db
      .insert(schema.ratings)
      .values({ bookId, userId, rating })
      .onConflictDoUpdate({
        target: [schema.ratings.bookId, schema.ratings.userId],
        set: { rating },
      });

    const [{ avg }] = await this.db
      .select({ avg: sql<number>`AVG(${schema.ratings.rating})` })
      .from(schema.ratings)
      .where(eq(schema.ratings.bookId, bookId));

    return {
      avgRating: avg ? Number(avg.toFixed(1)) : 0,
      userRating: rating,
    };
  }
}
```

- [ ] **Step 2: Create RatingsController**

`backend/src/books/ratings.controller.ts`:
```ts
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/books/:id/rate')
@UseGuards(AuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  rate(
    @Param('id') id: string,
    @Body('rating') rating: number,
    @CurrentUser() user: { id: string },
  ) {
    return this.ratingsService.upsert(id, user.id, rating);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/books/ratings.service.ts backend/src/books/ratings.controller.ts
git commit -m "feat: add ratings upsert"
```

---

### Task 6: Wire BooksModule into AppModule

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Register BooksModule**

Replace the `imports` array in `backend/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { BooksModule } from './books/books.module';

@Module({
  imports: [AuthModule, DbModule, BooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 2: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "feat: register BooksModule in AppModule"
```

---

### Task 7: Transactions Module — borrow, return, buy + user dashboard

**Files:**
- Create: `backend/src/transactions/transactions.service.ts`
- Create: `backend/src/transactions/transactions.controller.ts`
- Create: `backend/src/transactions/transactions.module.ts`

- [ ] **Step 1: Create TransactionsService**

`backend/src/transactions/transactions.service.ts`:
```ts
import { Injectable, Inject, ConflictException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

@Injectable()
export class TransactionsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async borrow(bookId: string, userId: string) {
    const active = await this.db
      .select()
      .from(schema.borrows)
      .where(and(
        eq(schema.borrows.bookId, bookId),
        eq(schema.borrows.userId, userId),
        isNull(schema.borrows.returnedAt),
      ));

    if (active.length > 0) {
      throw new ConflictException('Book already borrowed');
    }

    const [borrow] = await this.db
      .insert(schema.borrows)
      .values({ bookId, userId })
      .returning();
    return borrow;
  }

  async returnBook(bookId: string, userId: string) {
    const [active] = await this.db
      .select()
      .from(schema.borrows)
      .where(and(
        eq(schema.borrows.bookId, bookId),
        eq(schema.borrows.userId, userId),
        isNull(schema.borrows.returnedAt),
      ));

    if (!active) {
      throw new BadRequestException('No active borrow to return');
    }

    const [borrow] = await this.db
      .update(schema.borrows)
      .set({ returnedAt: new Date() })
      .where(eq(schema.borrows.id, active.id))
      .returning();
    return borrow;
  }

  async buy(bookId: string, userId: string) {
    const existing = await this.db
      .select()
      .from(schema.purchases)
      .where(and(
        eq(schema.purchases.bookId, bookId),
        eq(schema.purchases.userId, userId),
      ));

    if (existing.length > 0) {
      return existing[0]; // no-op
    }

    const [purchase] = await this.db
      .insert(schema.purchases)
      .values({ bookId, userId })
      .returning();
    return purchase;
  }

  async getUserBorrows(userId: string) {
    return this.db
      .select({
        borrow: schema.borrows,
        book: {
          id: schema.books.id,
          title: schema.books.title,
          author: schema.books.author,
          price: schema.books.price,
          cover: schema.books.cover,
          synopsis: schema.books.synopsis,
          category: schema.books.category,
          trending: schema.books.trending,
        },
      })
      .from(schema.borrows)
      .innerJoin(schema.books, eq(schema.borrows.bookId, schema.books.id))
      .where(and(
        eq(schema.borrows.userId, userId),
        isNull(schema.borrows.returnedAt),
      ))
      .orderBy(sql`${schema.borrows.borrowedAt} DESC`);
  }

  async getUserPurchases(userId: string) {
    return this.db
      .select({
        purchase: schema.purchases,
        book: {
          id: schema.books.id,
          title: schema.books.title,
          author: schema.books.author,
          price: schema.books.price,
          cover: schema.books.cover,
          synopsis: schema.books.synopsis,
          category: schema.books.category,
          trending: schema.books.trending,
        },
      })
      .from(schema.purchases)
      .innerJoin(schema.books, eq(schema.purchases.bookId, schema.books.id))
      .where(eq(schema.purchases.userId, userId))
      .orderBy(sql`${schema.purchases.purchasedAt} DESC`);
  }
}
```

- [ ] **Step 2: Create TransactionsController**

`backend/src/transactions/transactions.controller.ts`:
```ts
import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('api/books/:id/borrow')
  @UseGuards(AuthGuard)
  borrow(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.borrow(id, user.id);
  }

  @Post('api/books/:id/return')
  @UseGuards(AuthGuard)
  returnBook(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.returnBook(id, user.id);
  }

  @Post('api/books/:id/buy')
  @UseGuards(AuthGuard)
  buy(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.transactionsService.buy(id, user.id);
  }

  @Get('api/user/borrows')
  @UseGuards(AuthGuard)
  myBorrows(@CurrentUser() user: { id: string }) {
    return this.transactionsService.getUserBorrows(user.id);
  }

  @Get('api/user/purchases')
  @UseGuards(AuthGuard)
  myPurchases(@CurrentUser() user: { id: string }) {
    return this.transactionsService.getUserPurchases(user.id);
  }
}
```

- [ ] **Step 3: Create TransactionsModule**

`backend/src/transactions/transactions.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
```

- [ ] **Step 4: Register in AppModule**

Add `TransactionsModule` to the imports in `backend/src/app.module.ts`:
```ts
import { TransactionsModule } from './transactions/transactions.module';

// in @Module imports:
imports: [AuthModule, DbModule, BooksModule, TransactionsModule],
```

- [ ] **Step 5: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/transactions/ backend/src/app.module.ts
git commit -m "feat: add TransactionsModule with borrow/return/buy"
```

---

### Task 8: Nuxt server proxy — generalize for all /api/

**Files:**
- Rename: `frontend/server/api/auth/[...].ts` → `frontend/server/api/[...].ts`

- [ ] **Step 1: Generalize proxy to catch-all**

Replace the content of `frontend/server/api/[...].ts` (was `frontend/server/api/auth/[...].ts`):

```ts
export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookie = getHeader(event, 'cookie');
  if (cookie) {
    headers['cookie'] = cookie;
  }

  const origin = getHeader(event, 'origin');
  if (origin) {
    headers['origin'] = origin;
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: event.method,
    headers,
    body:
      event.method !== 'GET' && event.method !== 'HEAD'
        ? JSON.stringify(await readBody(event))
        : undefined,
  });

  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    setHeader(event, 'set-cookie', setCookie);
  }

  return data;
});
```

Then delete `frontend/server/api/auth/` directory (the old auth-specific proxy).

- [ ] **Step 2: Verify frontend dev server starts**

```bash
cd frontend && npx nuxi dev
```
Expected: Starts on port 3000 (can Ctrl+C after verifying no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/server/api/
git rm -r frontend/server/api/auth/
git commit -m "feat: generalize Nuxt server proxy for all /api/ routes"
```
Note: If the directory is tracked by git, use `git rm`. If not, just delete and `git add`.

---

### Task 9: Frontend Books Store — rewrite for real API

**Files:**
- Modify: `frontend/stores/books.ts`

- [ ] **Step 1: Rewrite store with real API calls**

Replace the entire content of `frontend/stores/books.ts`:
```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Book } from '~/data/books';

export interface BookWithMeta extends Book {
  likeCount: number;
  commentCount: number;
  avgRating: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Comment {
  id: string;
  bookId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export const useBooksStore = defineStore('books', () => {
  const books = ref<BookWithMeta[]>([]);
  const trending = ref<BookWithMeta[]>([]);
  const currentBook = ref<BookWithMeta | null>(null);
  const comments = ref<Comment[]>([]);
  const liked = ref<Record<string, boolean>>({});
  const userRating = ref<Record<string, number>>({});
  const meta = ref<PaginationMeta>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const loading = ref(false);

  async function fetchBooks(page = 1, limit = 12, category?: string) {
    loading.value = true;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (category && category !== 'All') params.set('category', category);

      const res = await $fetch<{ data: BookWithMeta[]; meta: PaginationMeta }>(`/api/books?${params}`);
      books.value = res.data;
      meta.value = res.meta;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTrending() {
    const res = await $fetch<BookWithMeta[]>('/api/books/trending');
    trending.value = res;
  }

  async function fetchBook(id: string) {
    const res = await $fetch<BookWithMeta>(`/api/books/${id}`);
    currentBook.value = res;
    return res;
  }

  async function createBook(data: {
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending?: boolean;
  }) {
    const res = await $fetch('/api/books', {
      method: 'POST',
      body: data,
    });
    return res;
  }

  async function updateBook(id: string, data: Partial<{
    title: string;
    author: string;
    price: string;
    cover: string;
    synopsis: string;
    category: string;
    trending: boolean;
  }>) {
    const res = await $fetch(`/api/books/${id}`, {
      method: 'PUT',
      body: data,
    });
    return res;
  }

  async function deleteBook(id: string) {
    await $fetch(`/api/books/${id}`, { method: 'DELETE' });
  }

  async function toggleLike(id: string) {
    const res = await $fetch<{ liked: boolean; likeCount: number }>(`/api/books/${id}/like`, {
      method: 'POST',
    });
    liked.value = { ...liked.value, [id]: res.liked };
    return res;
  }

  async function fetchComments(bookId: string) {
    const res = await $fetch<Comment[]>(`/api/books/${bookId}/comments`);
    comments.value = res;
    return res;
  }

  async function createComment(bookId: string, text: string) {
    const res = await $fetch(`/api/books/${bookId}/comments`, {
      method: 'POST',
      body: { text },
    });
    return res;
  }

  async function deleteComment(bookId: string, commentId: string) {
    await $fetch(`/api/books/${bookId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async function rateBook(bookId: string, rating: number) {
    const res = await $fetch<{ avgRating: number; userRating: number }>(`/api/books/${bookId}/rate`, {
      method: 'POST',
      body: { rating },
    });
    userRating.value = { ...userRating.value, [bookId]: res.userRating };
    return res;
  }

  return {
    books, trending, currentBook, comments, liked, userRating, meta, loading,
    fetchBooks, fetchTrending, fetchBook, createBook, updateBook, deleteBook,
    toggleLike, fetchComments, createComment, deleteComment, rateBook,
  };
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/stores/books.ts
git commit -m "feat: rewrite books store with real API calls"
```

---

### Task 10: Frontend Dashboard Store — rewrite for real API

**Files:**
- Modify: `frontend/stores/dashboard.ts`

- [ ] **Step 1: Rewrite dashboard store**

Replace entire content of `frontend/stores/dashboard.ts`:
```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Book } from '~/data/books';

interface BorrowRecord {
  borrow: {
    id: string;
    bookId: string;
    userId: string;
    borrowedAt: string;
    returnedAt: string | null;
  };
  book: Book;
}

interface PurchaseRecord {
  purchase: {
    id: string;
    bookId: string;
    userId: string;
    purchasedAt: string;
  };
  book: Book;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const borrowed = ref<BorrowRecord[]>([]);
  const purchased = ref<PurchaseRecord[]>([]);

  async function fetchBorrows() {
    const res = await $fetch<BorrowRecord[]>('/api/user/borrows');
    borrowed.value = res;
  }

  async function fetchPurchases() {
    const res = await $fetch<PurchaseRecord[]>('/api/user/purchases');
    purchased.value = res;
  }

  async function borrowBook(id: string) {
    await $fetch(`/api/books/${id}/borrow`, { method: 'POST' });
    await fetchBorrows();
  }

  async function returnBook(id: string) {
    await $fetch(`/api/books/${id}/return`, { method: 'POST' });
    await fetchBorrows();
  }

  async function buyBook(id: string) {
    await $fetch(`/api/books/${id}/buy`, { method: 'POST' });
    await fetchPurchases();
  }

  return { borrowed, purchased, fetchBorrows, fetchPurchases, borrowBook, returnBook, buyBook };
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/stores/dashboard.ts
git commit -m "feat: rewrite dashboard store with real API calls"
```

---

### Task 11: Frontend Pages — adapt for real API

**Files:**
- Modify: `frontend/pages/feed.vue`
- Modify: `frontend/pages/book/[id].vue`
- Modify: `frontend/pages/dashboard.vue`
- Modify: `frontend/components/BookCard.vue`

- [ ] **Step 1: Update feed.vue for API-driven pagination**

In `<script setup>`, replace the store usage:
```ts
import { useBooksStore } from "~/stores/books";

const booksStore = useBooksStore();
const page = ref(1);
const activeCategory = ref("All");

const categories = ref(["All"]);
const filteredBooks = computed(() => booksStore.books);

// Fetch on mount and when page/category changes
onMounted(async () => {
  await Promise.all([
    booksStore.fetchTrending(),
    booksStore.fetchBooks(1, 12),
  ]);
  // Build categories from first fetch
  const cats = [...new Set(booksStore.books.map((b) => b.category))];
  categories.value = ["All", ...cats];
});

watch([page, activeCategory], async ([p, cat]) => {
  await booksStore.fetchBooks(p, 12, cat === "All" ? undefined : cat);
});

// Pagination uses booksStore.meta.totalPages instead of hardcoded 10
const totalPages = computed(() => booksStore.meta.totalPages);

// Trending from store
const trending = computed(() => booksStore.trending);
```

In `<template>`, replace `totalPages = 10` with `totalPages` (the computed):
```vue
<!-- Pagination section: use booksStore.meta for page buttons -->
<button
  v-for="n in Math.min(totalPages, 5)"
  :key="n"
  ...
>
```

And update the pagination controls to reference `totalPages` instead of the hardcoded constant.

- [ ] **Step 2: Update book/[id].vue for real API**

Replace the `<script setup>`:
```ts
import { ArrowLeft, Star, Heart, MessageSquare, Share2 } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";
import { useDashboardStore } from "~/stores/dashboard";
import { useAuthStore } from "~/stores/auth";

const route = useRoute();
const id = route.params.id as string;

const booksStore = useBooksStore();
const dashboard = useDashboardStore();
const auth = useAuthStore();

const book = ref<any>(null);
const comments = ref<any[]>([]);
const draft = ref("");

onMounted(async () => {
  book.value = await booksStore.fetchBook(id);
  comments.value = await booksStore.fetchComments(id);
});

async function submitReview() {
  if (!draft.value.trim()) return;
  await booksStore.createComment(id, draft.value.trim());
  comments.value = await booksStore.fetchComments(id);
  draft.value = "";
}

async function handleLike() {
  await booksStore.toggleLike(id);
}

async function handleRate(rating: number) {
  await booksStore.rateBook(id, rating);
  if (book.value) {
    book.value.avgRating = (await booksStore.fetchBook(id)).avgRating;
  }
}
```

Update the template:
- `book.rating` → `book.avgRating` (computed field)
- `booksStore.liked[book.id]` → keep using `liked` from store
- `booksStore.toggleLike(book.id)` → `handleLike()`
- Reviews section reads from `comments` array (shows `comment.user.name` and `comment.user.image`)
- Add star rating input (clickable stars calling `handleRate(rating)`)

Replace the reviews section with:
```vue
<!-- Star rating input -->
<div class="mt-6 flex items-center gap-1">
  <span class="text-sm text-muted-foreground mr-2">Your rating:</span>
  <button
    v-for="star in 5"
    :key="star"
    @click="handleRate(star)"
    class="cursor-pointer transition-colors hover:text-amber-400"
    :class="(booksStore.userRating[id] ?? 0) >= star ? 'text-amber-400' : 'text-muted-foreground/30'"
  >
    <Star class="h-5 w-5" :class="(booksStore.userRating[id] ?? 0) >= star ? 'fill-current' : ''" />
  </button>
  <span v-if="book" class="ml-2 text-sm text-muted-foreground">
    {{ book.avgRating.toFixed(1) }} avg
  </span>
</div>
```

Replace review list to use `comments`:
```vue
<div class="mt-8 space-y-6">
  <div v-for="c in comments" :key="c.id" class="flex gap-4">
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
    >
      {{ c.user.name.charAt(0).toUpperCase() }}
    </div>
    <div class="flex-1">
      <div class="flex items-center gap-2">
        <p class="font-medium">{{ c.user.name }}</p>
        <span class="text-xs text-muted-foreground">{{ new Date(c.createdAt).toLocaleDateString() }}</span>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">{{ c.text }}</p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Update dashboard.vue for real API**

Replace `<script setup>`:
```ts
import { BookMarked, Library } from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";
import { useDashboardStore } from "~/stores/dashboard";

const auth = useAuthStore();
const dashboard = useDashboardStore();
const tab = ref<"borrowed" | "purchased">("borrowed");

const list = computed(() =>
  tab.value === "borrowed" ? dashboard.borrowed : dashboard.purchased
);

onMounted(async () => {
  await Promise.all([
    dashboard.fetchBorrows(),
    dashboard.fetchPurchases(),
  ]);
});

definePageMeta({
  title: "My Dashboard — Read in Peace",
});
```

Update template to use `list.value` properly and adapt BookCard to handle the new data shape:
```vue
<BookCard v-for="item in list" :key="item.borrow?.id || item.purchase?.id" :book="item.book" :variant="tab" />
```

- [ ] **Step 4: Update BookCard.vue for admin actions and data shape**

The `book` prop type is the same (`Book` interface). Update the admin buttons to call real API:

```ts
const booksStore = useBooksStore();

async function handleDelete() {
  if (confirm('Delete this book?')) {
    await booksStore.deleteBook(props.book.id);
  }
}

function handleEdit() {
  // Will open BookFormModal (Task 12)
}
```

Update the delete button click handler:
```vue
<button
  @click="handleDelete"
  class="flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 text-destructive backdrop-blur ring-1 ring-border hover:bg-background"
>
  <Trash2 class="h-3.5 w-3.5" />
</button>
```

And update buy/borrow buttons to call real store methods:
```ts
const dashboard = useDashboardStore();

// In template:
@click="dashboard.buyBook(book.id)"
@click="dashboard.borrowBook(book.id)"
@click="dashboard.returnBook(book.id)"
```

- [ ] **Step 5: Commit**

```bash
git add frontend/pages/ frontend/components/BookCard.vue
git commit -m "feat: adapt frontend pages for real API"
```

---

### Task 12: Admin CRUD UI — Book form modal

**Files:**
- Create: `frontend/components/BookFormModal.vue`
- Modify: `frontend/pages/feed.vue` — add "New Book" button
- Modify: `frontend/components/BookCard.vue` — wire edit button to modal

- [ ] **Step 1: Create BookFormModal component**

`frontend/components/BookFormModal.vue`:
```vue
<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";

const props = withDefaults(
  defineProps<{
    book?: {
      id: string;
      title: string;
      author: string;
      price: string;
      cover: string;
      synopsis: string;
      category: string;
      trending: boolean;
    } | null;
  }>(),
  { book: null },
);

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const booksStore = useBooksStore();
const saving = ref(false);
const error = ref("");

const form = reactive({
  title: props.book?.title ?? "",
  author: props.book?.author ?? "",
  price: props.book?.price ?? "",
  cover: props.book?.cover ?? "",
  synopsis: props.book?.synopsis ?? "",
  category: props.book?.category ?? "Fiction",
  trending: props.book?.trending ?? false,
});

async function handleSubmit() {
  saving.value = true;
  error.value = "";
  try {
    if (props.book) {
      await booksStore.updateBook(props.book.id, form);
    } else {
      await booksStore.createBook(form);
    }
    emit("saved");
  } catch (e: any) {
    error.value = e?.message || "Something went wrong";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button
          @click="emit('close')"
          class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <X class="h-4 w-4" />
        </button>

        <h2 class="text-xl font-semibold tracking-tight mb-6">
          {{ book ? "Edit Book" : "New Book" }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Title</label>
              <input v-model="form.title" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Author</label>
              <input v-model="form.author" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Price</label>
              <input v-model="form.price" type="number" step="0.01" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Category</label>
              <select v-model="form.category" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground">
                <option>Fiction</option>
                <option>How-to</option>
                <option>Manga</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Cover URL</label>
            <input v-model="form.cover" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Synopsis</label>
            <textarea v-model="form.synopsis" rows="3" required class="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>

          <label class="flex items-center gap-2 text-sm">
            <input v-model="form.trending" type="checkbox" class="rounded border-border" />
            Mark as trending
          </label>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="emit('close')"
              class="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {{ saving ? "Saving…" : book ? "Save Changes" : "Create Book" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Add "New Book" button to feed.vue and wire modal**

In `feed.vue` `<script setup>`:
```ts
const showBookForm = ref(false);
```

In the template, near the "Full shelf" heading:
```vue
<div class="mb-5 flex items-end justify-between">
  <h2 class="text-2xl font-semibold tracking-tight">Full shelf</h2>
  <button
    v-if="auth.adminMode"
    @click="showBookForm = true"
    class="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
  >
    + New Book
  </button>
</div>
```

And at the bottom of the template (before closing `</main>`):
```vue
<BookFormModal
  v-if="showBookForm"
  @close="showBookForm = false"
  @saved="showBookForm = false; booksStore.fetchBooks(page, 12, activeCategory === 'All' ? undefined : activeCategory)"
/>
```

- [ ] **Step 3: Wire edit button in BookCard.vue**

In `BookCard.vue` `<script setup>`:
```ts
const emit = defineEmits<{
  edit: [book: Book];
}>();
```

Update the pencil button:
```vue
<button
  @click="emit('edit', book)"
  class="flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 backdrop-blur ring-1 ring-border hover:bg-background"
>
  <Pencil class="h-3.5 w-3.5" />
</button>
```

In `feed.vue`, handle the edit event:
```ts
const editingBook = ref<any>(null);

function handleEdit(book: any) {
  editingBook.value = book;
  showBookForm.value = true;
}
```

Update BookCard binding:
```vue
<BookCard v-for="b in filteredBooks" :key="b.id" :book="b" @edit="handleEdit" />
```

Update BookFormModal to use editingBook:
```vue
<BookFormModal
  v-if="showBookForm"
  :book="editingBook"
  @close="showBookForm = false; editingBook = null"
  @saved="showBookForm = false; editingBook = null; booksStore.fetchBooks(page, 12, activeCategory === 'All' ? undefined : activeCategory)"
/>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/BookFormModal.vue frontend/pages/feed.vue frontend/components/BookCard.vue
git commit -m "feat: add admin CRUD UI with book form modal"
```

---

## Task Summary

| Task | What | Files |
|------|------|-------|
| 1 | DB schema + migration | `schema.ts` |
| 2 | Books module (CRUD) | 3 files in `books/` |
| 3 | Likes feature | `likes.controller.ts`, `likes.service.ts` |
| 4 | Comments feature | `comments.controller.ts`, `comments.service.ts` |
| 5 | Ratings feature | `ratings.controller.ts`, `ratings.service.ts` |
| 6 | Wire BooksModule | `app.module.ts` |
| 7 | Transactions module | 3 files in `transactions/` + `app.module.ts` |
| 8 | Nuxt proxy | `server/api/[...].ts` |
| 9 | Books store | `stores/books.ts` |
| 10 | Dashboard store | `stores/dashboard.ts` |
| 11 | Frontend pages | 4 page/component files |
| 12 | Admin CRUD UI | `BookFormModal.vue`, feed, BookCard |

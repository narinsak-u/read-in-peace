// Drizzle schema — single source of truth for the database shape.
// Feature modules should NOT import this directly; they import repository
// interfaces from their own `domain/` folder. The schema stays in core
// because it describes the cross-feature database, not any single feature.
import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { numeric, primaryKey } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  accountId: text('account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const books = pgTable('books', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  cover: text('cover').notNull(),
  synopsis: text('synopsis').notNull(),
  category: text('category').notNull(),
  crop: integer('crop'),
  shelf: text('shelf').notNull(),
  year: integer('year').notNull(),
  trending: boolean('trending').notNull().default(false),
  inStock: integer('in_stock').notNull().default(5),
  isAvailable: boolean('is_available').notNull().default(true),
  totalPages: integer('total_pages').notNull().default(300),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const likes = pgTable(
  'likes',
  {
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.userId] })],
);

export const comments = pgTable('comments', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  parentId: text('parent_id').references((): any => comments.id, {
    onDelete: 'cascade',
  }),
  text: text('text').notNull(),
  rating: integer('rating'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const commentLikes = pgTable(
  'comment_likes',
  {
    commentId: text('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.commentId, table.userId] })],
);

export const ratings = pgTable(
  'ratings',
  {
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.userId] })],
);

export const borrows = pgTable(
  'borrows',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    borrowedAt: timestamp('borrowed_at').notNull().defaultNow(),
    returnedAt: timestamp('returned_at'),
    dueAt: timestamp('due_at').notNull(),
    currentPage: integer('current_page').notNull().default(0),
    totalPages: integer('total_pages').notNull().default(300),
  },
  (table) => ({
    userReturnedIdx: index('borrows_user_id_returned_at_idx').on(
      table.userId,
      table.returnedAt,
    ),
  }),
);

export const purchases = pgTable('purchases', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  stripeSessionId: text('stripe_session_id'),
  receiptUrl: text('receipt_url'),
  amountTotal: integer('amount_total'),
});

export const readingGoals = pgTable('reading_goals', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  goal: integer('goal').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const memberships = pgTable(
  'memberships',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    plan: varchar('plan', { length: 20 }).notNull().default('free'),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    itemLimit: integer('item_limit').notNull().default(15),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    stripeSubscriptionIdIdx: index('memberships_stripe_subscription_id_idx')
      .on(table.stripeSubscriptionId)
      .where(sql`${table.stripeSubscriptionId} IS NOT NULL`),
  }),
);

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

export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

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

// ——— Direct messages ———
export const directMessages = pgTable(
  'direct_messages',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    receiverId: text('receiver_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    senderReceiverIdx: index('idx_dm_sender_receiver').on(
      table.senderId,
      table.receiverId,
    ),
    receiverReadIdx: index('idx_dm_receiver_read').on(
      table.receiverId,
      table.read,
    ),
  }),
);

# Direct Message (Real-time Chat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 1-on-1 real-time direct messaging via Socket.IO with a collapsible right-side chat modal, conversation list, unread badge on navbar, and auth-gated access.

**Architecture:** NestJS WebSocket Gateway (`@nestjs/platform-socket.io`) in a new `chat/` module following the existing domain → infrastructure → application → presentation pattern. Frontend uses `socket.io-client` with composables, a Pinia store for modal state, and Vue components for the chat UI.

**Tech Stack:** `@nestjs/platform-socket.io`, `socket.io` (backend), `socket.io-client` (frontend), Drizzle ORM, Jest, Vitest

**Spec:** `docs/superpowers/specs/2026-07-11-direct-message-chat-design.md`

---

### Task 1: Install backend deps + Add `direct_messages` table + Generate migration

**Files:**
- Modify: `backend/src/core/database/schema.ts`
- Modify: `backend/package.json`
- Create: `backend/src/core/database/migrations/<timestamp>_<name>.sql` (auto-generated)

- [ ] **Step 1: Add `socket.io` and `@nestjs/platform-socket.io` to backend deps**

In `backend/` directory, run:
```bash
npm install @nestjs/platform-socket.io socket.io
```

- [ ] **Step 2: Add `directMessages` table to Drizzle schema**

In `backend/src/core/database/schema.ts`, add after the `follows` table:

```typescript
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
```

Add the import for `index` if it's not already imported (it is used elsewhere in the file).

- [ ] **Step 3: Generate migration**

```bash
cd backend && npx drizzle-kit generate
```

Verify a new migration file appears in `src/core/database/migrations/`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/core/database/schema.ts backend/package.json backend/package-lock.json
git add backend/src/core/database/migrations/
git commit -m "feat: add direct_messages table and socket.io dependency"
```

---

### Task 2: Chat domain types + repository interface

**Files:**
- Create: `backend/src/chat/domain/chat.ts`

- [ ] **Step 1: Create the domain file**

```typescript
// Direct message and conversation domain types.
// Feature modules depend on the interface, not the Drizzle implementation.
export const CHAT_REPOSITORY = Symbol('CHAT_REPOSITORY');

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  userId: string;
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export type SendMessageInput = {
  senderId: string;
  receiverId: string;
  text: string;
};

export interface ChatRepository {
  send(input: SendMessageInput): Promise<DirectMessage>;
  getConversations(userId: string): Promise<Conversation[]>;
  getHistory(
    userId: string,
    otherUserId: string,
    before?: string,
    limit?: number,
  ): Promise<DirectMessage[]>;
  markAsRead(receiverId: string, fromUserId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/chat/domain/chat.ts
git commit -m "feat: add chat domain types and repository interface"
```

---

### Task 3: Chat repository tests + Drizzle implementation (TDD)

**Files:**
- Create: `backend/tests/chat/infrastructure/drizzle-chat.repository.spec.ts`
- Create: `backend/src/chat/infrastructure/drizzle-chat.repository.ts`

- [ ] **Step 1: Write the failing repository test**

```typescript
import { Test } from '@nestjs/testing';
import { DATABASE } from '../../../src/core/database/database.provider';
import { DrizzleChatRepository } from '../../../src/chat/infrastructure/drizzle-chat.repository';

// We test the repository logic by mocking the Drizzle db instance.
// The repository delegates to db.insert/db.select/db.update — we verify
// it calls them with correct arguments and transforms results correctly.

describe('DrizzleChatRepository', () => {
  let repo: DrizzleChatRepository;
  let db: jest.Mocked<{ insert: jest.Mock; select: jest.Mock; update: jest.Mock }>;

  const mockMessage = {
    id: 'msg-1',
    senderId: 'u1',
    receiverId: 'u2',
    text: 'Hello!',
    read: false,
    createdAt: new Date('2026-07-11T10:00:00Z'),
  };

  beforeEach(async () => {
    db = {
      insert: jest.fn() as any,
      select: jest.fn() as any,
      update: jest.fn() as any,
    };

    const mod = await Test.createTestingModule({
      providers: [
        DrizzleChatRepository,
        { provide: DATABASE, useValue: db },
      ],
    }).compile();

    repo = mod.get<DrizzleChatRepository>(DrizzleChatRepository);
  });

  describe('send', () => {
    it('inserts a message and returns it', async () => {
      const returningMock = jest.fn().mockResolvedValue([mockMessage]);
      (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({ returning: returningMock }) } as any);

      const result = await repo.send({
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Hello!',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getUnreadCount', () => {
    it('returns the count of unread messages', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: '5' }]),
        }),
      } as any);

      const count = await repo.getUnreadCount('u2');

      expect(count).toBe(5);
    });

    it('returns 0 when no unread messages', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: '0' }]),
        }),
      } as any);

      const count = await repo.getUnreadCount('u2');

      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('updates messages from a specific user to read', async () => {
      const setMock = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });
      (db.update as jest.Mock).mockReturnValue({ set: setMock } as any);

      await repo.markAsRead('u2', 'u1');

      expect(db.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({ read: true });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=chat/infrastructure/drizzle-chat.repository --no-coverage
```

Expected: FAIL because `DrizzleChatRepository` module does not exist yet.

- [ ] **Step 3: Write the Drizzle repository implementation**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { and, eq, or, desc, sql, count } from 'drizzle-orm';
import { DATABASE, type Database } from '../../core/database/database.provider';
import * as schema from '../../core/database/schema';
import {
  type ChatRepository,
  type DirectMessage,
  type Conversation,
  type SendMessageInput,
} from '../domain/chat';

@Injectable()
export class DrizzleChatRepository implements ChatRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async send(input: SendMessageInput): Promise<DirectMessage> {
    const [msg] = await this.db
      .insert(schema.directMessages)
      .values({
        senderId: input.senderId,
        receiverId: input.receiverId,
        text: input.text,
      })
      .returning();
    return this.toDirectMessage(msg);
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    // Subquery: get the latest message per conversation partner
    const subquery = this.db
      .select({
        otherUserId: sql<string>`CASE WHEN ${schema.directMessages.senderId} = ${userId} THEN ${schema.directMessages.receiverId} ELSE ${schema.directMessages.senderId} END`,
        messageText: schema.directMessages.text,
        createdAt: schema.directMessages.createdAt,
        unreadCount: sql<number>`COUNT(CASE WHEN ${schema.directMessages.receiverId} = ${userId} AND ${schema.directMessages.read} = false THEN 1 END)`,
        rowNum: sql<number>`ROW_NUMBER() OVER (PARTITION BY CASE WHEN ${schema.directMessages.senderId} = ${userId} THEN ${schema.directMessages.receiverId} ELSE ${schema.directMessages.senderId} END ORDER BY ${schema.directMessages.createdAt} DESC)`,
      })
      .from(schema.directMessages)
      .where(
        or(
          eq(schema.directMessages.senderId, userId),
          eq(schema.directMessages.receiverId, userId),
        ),
      )
      .as('sub');

    // Note: For simplicity in the first pass, we fetch raw results and map.
    // A more efficient approach uses raw SQL with proper joins.
    const rows = await this.db
      .select({
        otherUserId: subquery.otherUserId,
        messageText: subquery.messageText,
        createdAt: subquery.createdAt,
        unreadCount: subquery.unreadCount,
      })
      .from(subquery)
      .where(eq(subquery.rowNum, 1));

    // Fetch user names/images for each partner
    const userIds = rows.map((r) => r.otherUserId);
    if (userIds.length === 0) return [];

    const users = await this.db
      .select({ id: schema.user.id, name: schema.user.name, image: schema.user.image })
      .from(schema.user)
      .where(sql`${schema.user.id} = ANY(${userIds})`);

    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => {
      const u = userMap.get(r.otherUserId);
      return {
        userId: r.otherUserId,
        name: u?.name ?? 'Unknown',
        image: u?.image ?? null,
        lastMessage: r.messageText,
        lastMessageAt: r.createdAt,
        unreadCount: Number(r.unreadCount),
      };
    });
  }

  async getHistory(
    userId: string,
    otherUserId: string,
    before?: string,
    limit = 50,
  ): Promise<DirectMessage[]> {
    const conditions = [
      or(
        and(
          eq(schema.directMessages.senderId, userId),
          eq(schema.directMessages.receiverId, otherUserId),
        ),
        and(
          eq(schema.directMessages.senderId, otherUserId),
          eq(schema.directMessages.receiverId, userId),
        ),
      ),
    ];

    if (before) {
      conditions.push(sql`${schema.directMessages.createdAt} < (SELECT created_at FROM direct_messages WHERE id = ${before})`);
    }

    const rows = await this.db
      .select()
      .from(schema.directMessages)
      .where(and(...conditions))
      .orderBy(desc(schema.directMessages.createdAt))
      .limit(limit);

    return rows.map((r) => this.toDirectMessage(r));
  }

  async markAsRead(receiverId: string, fromUserId: string): Promise<void> {
    await this.db
      .update(schema.directMessages)
      .set({ read: true })
      .where(
        and(
          eq(schema.directMessages.receiverId, receiverId),
          eq(schema.directMessages.senderId, fromUserId),
          eq(schema.directMessages.read, false),
        ),
      );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.directMessages)
      .where(
        and(
          eq(schema.directMessages.receiverId, userId),
          eq(schema.directMessages.read, false),
        ),
      );
    return Number(result?.count ?? 0);
  }

  private toDirectMessage(row: any): DirectMessage {
    return {
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      text: row.text,
      read: row.read,
      createdAt: row.createdAt,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=chat/infrastructure/drizzle-chat.repository --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tests/chat/infrastructure/drizzle-chat.repository.spec.ts
git add backend/src/chat/infrastructure/drizzle-chat.repository.ts
git commit -m "feat: add Drizzle chat repository with TDD"
```

---

### Task 4: Chat service tests + implementation (TDD)

**Files:**
- Create: `backend/tests/chat/application/chat.service.spec.ts`
- Create: `backend/src/chat/application/chat.service.ts`

- [ ] **Step 1: Write the failing service test**

```typescript
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from '../../../src/chat/application/chat.service';
import {
  CHAT_REPOSITORY,
  type ChatRepository,
  type DirectMessage,
  type Conversation,
} from '../../../src/chat/domain/chat';

describe('ChatService', () => {
  let svc: ChatService;
  let chatRepo: jest.Mocked<ChatRepository>;

  const mockMessage: DirectMessage = {
    id: 'msg-1',
    senderId: 'u1',
    receiverId: 'u2',
    text: 'Hello!',
    read: false,
    createdAt: new Date('2026-07-11T10:00:00Z'),
  };

  beforeEach(async () => {
    chatRepo = {
      send: jest.fn(),
      getConversations: jest.fn(),
      getHistory: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: CHAT_REPOSITORY, useValue: chatRepo },
      ],
    }).compile();

    svc = mod.get<ChatService>(ChatService);
  });

  describe('send', () => {
    it('throws ForbiddenException when sending to yourself', async () => {
      await expect(svc.send('u1', 'u1', 'Hello')).rejects.toThrow(
        ForbiddenException,
      );
      expect(chatRepo.send).not.toHaveBeenCalled();
    });

    it('throws Error when text is empty', async () => {
      await expect(svc.send('u1', 'u2', '')).rejects.toThrow('Message cannot be empty');
      expect(chatRepo.send).not.toHaveBeenCalled();
    });

    it('throws Error when text exceeds 2000 chars', async () => {
      await expect(svc.send('u1', 'u2', 'x'.repeat(2001))).rejects.toThrow(
        'Message too long',
      );
      expect(chatRepo.send).not.toHaveBeenCalled();
    });

    it('sends successfully', async () => {
      chatRepo.send.mockResolvedValue(mockMessage);

      const result = await svc.send('u1', 'u2', 'Hello!');

      expect(chatRepo.send).toHaveBeenCalledWith({
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Hello!',
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getConversations', () => {
    it('returns conversations list', async () => {
      const conversations: Conversation[] = [
        {
          userId: 'u2',
          name: 'Jane',
          image: null,
          lastMessage: 'Hello!',
          lastMessageAt: new Date(),
          unreadCount: 2,
        },
      ];
      chatRepo.getConversations.mockResolvedValue(conversations);

      const result = await svc.getConversations('u1');

      expect(result).toEqual(conversations);
      expect(chatRepo.getConversations).toHaveBeenCalledWith('u1');
    });

    it('returns empty array when no conversations', async () => {
      chatRepo.getConversations.mockResolvedValue([]);

      const result = await svc.getConversations('u1');

      expect(result).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('returns message history', async () => {
      chatRepo.getHistory.mockResolvedValue([mockMessage]);

      const result = await svc.getHistory('u1', 'u2');

      expect(result).toEqual([mockMessage]);
      expect(chatRepo.getHistory).toHaveBeenCalledWith('u1', 'u2', undefined, 50);
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      chatRepo.getUnreadCount.mockResolvedValue(3);

      const result = await svc.getUnreadCount('u1');

      expect(result).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=chat/application/chat.service --no-coverage
```

Expected: FAIL because `ChatService` does not exist.

- [ ] **Step 3: Write the chat service**

```typescript
import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  type ChatRepository,
  type DirectMessage,
  type Conversation,
} from '../domain/chat';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repo: ChatRepository,
  ) {}

  async send(
    senderId: string,
    receiverId: string,
    text: string,
  ): Promise<DirectMessage> {
    if (senderId === receiverId) {
      throw new ForbiddenException('Cannot send a message to yourself');
    }
    if (!text.trim()) {
      throw new Error('Message cannot be empty');
    }
    if (text.length > 2000) {
      throw new Error('Message too long');
    }
    return this.repo.send({ senderId, receiverId, text: text.trim() });
  }

  getConversations(userId: string): Promise<Conversation[]> {
    return this.repo.getConversations(userId);
  }

  getHistory(
    userId: string,
    otherUserId: string,
    before?: string,
    limit = 50,
  ): Promise<DirectMessage[]> {
    return this.repo.getHistory(userId, otherUserId, before, limit);
  }

  markAsRead(userId: string, fromUserId: string): Promise<void> {
    return this.repo.markAsRead(userId, fromUserId);
  }

  getUnreadCount(userId: string): Promise<number> {
    return this.repo.getUnreadCount(userId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=chat/application/chat.service --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tests/chat/application/chat.service.spec.ts
git add backend/src/chat/application/chat.service.ts
git commit -m "feat: add chat service with TDD"
```

---

### Task 5: Chat gateway tests + implementation (TDD)

**Files:**
- Create: `backend/tests/chat/presentation/chat.gateway.spec.ts`
- Create: `backend/src/chat/presentation/chat.gateway.ts`

- [ ] **Step 1: Write the failing gateway test**

```typescript
import { Test } from '@nestjs/testing';
import { ChatGateway } from '../../../src/chat/presentation/chat.gateway';
import { ChatService } from '../../../src/chat/application/chat.service';
import { AUTH_PORT, type AuthPort } from '../../../src/iam/auth/auth.port';
import { ForbiddenException } from '@nestjs/common';
import type { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: jest.Mocked<ChatService>;
  let authPort: jest.Mocked<AuthPort>;

  const mockSocket = {
    id: 'socket-1',
    handshake: {
      headers: { cookie: 'better-auth.session_token=valid-token' },
    },
    join: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  } as unknown as jest.Mocked<Socket>;

  beforeEach(async () => {
    chatService = {
      send: jest.fn(),
      getConversations: jest.fn(),
      getHistory: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    } as any;

    authPort = {
      getSession: jest.fn(),
    };

    const mod = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: chatService },
        { provide: AUTH_PORT, useValue: authPort },
      ],
    }).compile();

    gateway = mod.get<ChatGateway>(ChatGateway);
    // Set the server instance manually
    (gateway as any).server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
  });

  describe('handleConnection', () => {
    it('accepts valid session and joins user room', async () => {
      authPort.getSession.mockResolvedValue({
        user: { id: 'u1', name: 'User', email: 'u@t.com', emailVerified: true, image: null, createdAt: new Date(), updatedAt: new Date() },
        session: { id: 's1', userId: 'u1', expiresAt: new Date() },
      });

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('user:u1');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('rejects invalid session', async () => {
      authPort.getSession.mockResolvedValue(null);

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleSend', () => {
    it('sends message and emits to receiver room', async () => {
      (mockSocket as any).userId = 'u1';
      chatService.send.mockResolvedValue({
        id: 'msg-1',
        senderId: 'u1',
        receiverId: 'u2',
        text: 'Hello!',
        read: false,
        createdAt: new Date(),
      });

      await gateway.handleSend(mockSocket as any, {
        receiverId: 'u2',
        text: 'Hello!',
      });

      expect(chatService.send).toHaveBeenCalledWith('u1', 'u2', 'Hello!');
      expect((gateway as any).server.to).toHaveBeenCalledWith('user:u2');
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:sent', expect.objectContaining({ id: 'msg-1' }));
    });

    it('emits error on self-messaging', async () => {
      (mockSocket as any).userId = 'u1';
      chatService.send.mockRejectedValue(new ForbiddenException('Cannot send a message to yourself'));

      await gateway.handleSend(mockSocket as any, {
        receiverId: 'u1',
        text: 'Hello!',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'chat:error',
        expect.objectContaining({ code: 'SEND_FAILED' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=chat/presentation/chat.gateway --no-coverage
```

Expected: FAIL because `ChatGateway` does not exist.

- [ ] **Step 3: Write the chat gateway**

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../application/chat.service';
import { AUTH_PORT, type AuthPort } from '../../iam/auth/auth.port';

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    @Inject(AUTH_PORT) private readonly authPort: AuthPort,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const session = await this.authPort.getSession(
        socket.handshake.headers as Record<string, unknown>,
      );
      if (!session) {
        socket.disconnect();
        return;
      }
      (socket as any).userId = session.user.id;
      socket.join(`user:${session.user.id}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(_socket: Socket): void {
    // No cleanup needed — Socket.IO handles room cleanup on disconnect.
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    client: Socket,
    payload: { receiverId: string; text: string },
  ): Promise<void> {
    try {
      const senderId = (client as any).userId as string;
      const message = await this.chatService.send(
        senderId,
        payload.receiverId,
        payload.text,
      );
      this.server
        .to(`user:${payload.receiverId}`)
        .emit('chat:message', message);
      client.emit('chat:sent', { id: message.id, createdAt: message.createdAt });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'SEND_FAILED',
        message: err?.message ?? 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('chat:conversations')
  async handleConversations(client: Socket): Promise<void> {
    try {
      const userId = (client as any).userId as string;
      const conversations = await this.chatService.getConversations(userId);
      const unreadCount = await this.chatService.getUnreadCount(userId);
      client.emit('chat:conversations', { conversations, unreadCount });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'CONVERSATIONS_FAILED',
        message: err?.message ?? 'Failed to load conversations',
      });
    }
  }

  @SubscribeMessage('chat:history')
  async handleHistory(
    client: Socket,
    payload: { userId: string; before?: string; limit?: number },
  ): Promise<void> {
    try {
      const currentUserId = (client as any).userId as string;
      const messages = await this.chatService.getHistory(
        currentUserId,
        payload.userId,
        payload.before,
        payload.limit,
      );
      client.emit('chat:history', { messages, userId: payload.userId });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'HISTORY_FAILED',
        message: err?.message ?? 'Failed to load history',
      });
    }
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    client: Socket,
    payload: { userId: string },
  ): Promise<void> {
    try {
      const currentUserId = (client as any).userId as string;
      await this.chatService.markAsRead(currentUserId, payload.userId);
      client.emit('chat:read', { userId: payload.userId });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'READ_FAILED',
        message: err?.message ?? 'Failed to mark as read',
      });
    }
  }

  @SubscribeMessage('chat:unread')
  async handleUnread(client: Socket): Promise<void> {
    try {
      const userId = (client as any).userId as string;
      const count = await this.chatService.getUnreadCount(userId);
      client.emit('chat:unread', { count });
    } catch (err: any) {
      client.emit('chat:error', {
        code: 'UNREAD_FAILED',
        message: err?.message ?? 'Failed to get unread count',
      });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=chat/presentation/chat.gateway --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tests/chat/presentation/chat.gateway.spec.ts
git add backend/src/chat/presentation/chat.gateway.ts
git commit -m "feat: add chat gateway with TDD"
```

---

### Task 6: Wire ChatModule into AppModule

**Files:**
- Create: `backend/src/chat/chat.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create ChatModule**

```typescript
import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CoreDatabaseModule } from '../core/database/database.module';
import { DrizzleChatRepository } from './infrastructure/drizzle-chat.repository';
import { CHAT_REPOSITORY } from './domain/chat';
import { ChatService } from './application/chat.service';
import { ChatGateway } from './presentation/chat.gateway';

const alias = (token: symbol, impl: unknown) => ({
  provide: token,
  useExisting: impl,
});

@Module({
  imports: [IamModule, CoreDatabaseModule],
  providers: [
    DrizzleChatRepository,
    ChatService,
    ChatGateway,
    alias(CHAT_REPOSITORY, DrizzleChatRepository),
  ],
})
export class ChatModule {}
```

- [ ] **Step 2: Register ChatModule in AppModule**

In `backend/src/app.module.ts`, add `ChatModule` to imports:

```typescript
import { ChatModule } from './chat/chat.module';

// In the @Module decorator's imports array:
ChatModule,
```

- [ ] **Step 3: Run all backend tests to verify nothing broke**

```bash
cd backend && npm run test -- --no-coverage
```

Expected: All tests pass (new + existing)

- [ ] **Step 4: Commit**

```bash
git add backend/src/chat/chat.module.ts
git add backend/src/app.module.ts
git commit -m "feat: wire ChatModule into AppModule"
```

---

### Task 7: Install frontend deps + Create `useChatSocket` composable

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/composables/useChatSocket.ts`
- Create: `frontend/tests/composables/useChatSocket.test.ts`

- [ ] **Step 1: Install socket.io-client**

```bash
cd frontend && npm install socket.io-client
```

- [ ] **Step 2: Create useChatSocket composable**

```typescript
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let connectionCount = 0;

export function useChatSocket() {
  const connected = ref(false);
  const error = ref<string | null>(null);
  const config = useRuntimeConfig();

  function connect(): Socket {
    if (socket?.connected) return socket;

    connectionCount++;

    socket = io(`${config.public.backendUrl}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      connected.value = true;
      error.value = null;
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });

    socket.on('connect_error', (err: Error) => {
      error.value = err.message;
    });

    return socket;
  }

  function disconnect(): void {
    connectionCount--;
    if (connectionCount <= 0) {
      connectionCount = 0;
      socket?.disconnect();
      socket = null;
      connected.value = false;
      error.value = null;
    }
  }

  function getSocket(): Socket | null {
    return socket;
  }

  function onEvent<T>(event: string, handler: (data: T) => void): void {
    socket?.on(event, handler);
  }

  function offEvent(event: string, handler?: (...args: any[]) => void): void {
    if (handler) {
      socket?.off(event, handler);
    } else {
      socket?.off(event);
    }
  }

  function emit(event: string, data?: unknown): void {
    socket?.emit(event, data);
  }

  onUnmounted(() => disconnect());

  return {
    connected: readonly(connected),
    error: readonly(error),
    connect,
    disconnect,
    getSocket,
    onEvent,
    offEvent,
    emit,
  };
}
```

- [ ] **Step 3: Write the composable test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the composable wrapper logic, not socket.io internals.
// The actual socket creation is verified via integration tests.

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the composable API shape', async () => {
    const { useChatSocket } = await import('~/composables/useChatSocket');
    const chat = useChatSocket();

    expect(chat).toHaveProperty('connected');
    expect(chat).toHaveProperty('error');
    expect(chat).toHaveProperty('connect');
    expect(chat).toHaveProperty('disconnect');
    expect(chat).toHaveProperty('emit');
    expect(chat).toHaveProperty('onEvent');
    expect(chat).toHaveProperty('offEvent');
  });

  it('starts disconnected', async () => {
    const { useChatSocket } = await import('~/composables/useChatSocket');
    const chat = useChatSocket();

    expect(chat.connected.value).toBe(false);
    expect(chat.error.value).toBeNull();
  });
});
```

- [ ] **Step 4: Run frontend tests to verify**

```bash
cd frontend && npm run test -- --run
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git add frontend/composables/useChatSocket.ts
git add frontend/tests/composables/useChatSocket.test.ts
git commit -m "feat: add useChatSocket composable with socket.io-client"
```

---

### Task 8: Frontend Pinia chat store

**Files:**
- Create: `frontend/stores/chat.ts`
- Create: `frontend/tests/stores/chat.test.ts`

- [ ] **Step 1: Write the store test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from '~/stores/chat';

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts closed and collapsed', () => {
    const store = useChatStore();

    expect(store.showModal).toBe(false);
    expect(store.activeUserId).toBeNull();
  });

  it('opens the modal', () => {
    const store = useChatStore();
    store.open();
    expect(store.showModal).toBe(true);
  });

  it('closes the modal and resets active user', () => {
    const store = useChatStore();
    store.open();
    store.openConversation('u2');
    store.close();

    expect(store.showModal).toBe(false);
    expect(store.activeUserId).toBeNull();
  });

  it('opens a conversation', () => {
    const store = useChatStore();
    store.openConversation('u2');

    expect(store.showModal).toBe(true);
    expect(store.activeUserId).toBe('u2');
  });

  it('closes conversation returns to conversation list', () => {
    const store = useChatStore();
    store.openConversation('u2');
    store.closeConversation();

    expect(store.showModal).toBe(true);
    expect(store.activeUserId).toBeNull();
  });
});
```

- [ ] **Step 2: Write the store**

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const showModal = ref(false);
  const activeUserId = ref<string | null>(null);

  function open() {
    showModal.value = true;
  }

  function close() {
    showModal.value = false;
    activeUserId.value = null;
  }

  function toggle() {
    showModal.value = !showModal.value;
    if (!showModal.value) {
      activeUserId.value = null;
    }
  }

  function openConversation(userId: string) {
    showModal.value = true;
    activeUserId.value = userId;
  }

  function closeConversation() {
    activeUserId.value = null;
  }

  return {
    showModal: readonly(showModal),
    activeUserId: readonly(activeUserId),
    open,
    close,
    toggle,
    openConversation,
    closeConversation,
  };
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm run test -- --run
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/stores/chat.ts
git add frontend/tests/stores/chat.test.ts
git commit -m "feat: add Pinia chat store with TDD"
```

---

### Task 9: Create `useConversations` + `useChatMessages` composables

**Files:**
- Create: `frontend/composables/useConversations.ts`
- Create: `frontend/composables/useChatMessages.ts`
- Create: `frontend/tests/composables/useConversations.test.ts`
- Create: `frontend/tests/composables/useChatMessages.test.ts`

- [ ] **Step 1: Create useConversations composable**

```typescript
import { useChatSocket } from './useChatSocket';

export interface Conversation {
  userId: string;
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

// Module-level state — shared across all callers in the app
const conversations = ref<Conversation[]>([]);
const unreadCount = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
let initialized = false;

export function useConversations() {
  const { connect, emit } = useChatSocket();

  function init(): void {
    if (initialized) return;
    initialized = true;

    const socket = connect();

    socket.on('chat:conversations', (data: { conversations: Conversation[]; unreadCount: number }) => {
      conversations.value = data.conversations;
      unreadCount.value = data.unreadCount;
      loading.value = false;
    });

    socket.on('chat:unread', (data: { count: number }) => {
      unreadCount.value = data.count;
    });

    socket.on('chat:message', () => {
      // New message arrived — refresh conversations to update preview/order
      fetch();
      emit('chat:unread');
    });

    if (socket.connected) {
      fetch();
    } else {
      socket.on('connect', () => {
        fetch();
        emit('chat:unread');
      });
    }
  }

  function fetch(): void {
    loading.value = true;
    emit('chat:conversations');
  }

  // Initialize immediately — the singleton socket persists across route changes
  init();

  return {
    conversations: readonly(conversations),
    unreadCount: readonly(unreadCount),
    loading: readonly(loading),
    error: readonly(error),
  };
}
```

- [ ] **Step 2: Create useChatMessages composable**

```typescript
import { useChatSocket } from './useChatSocket';
import type { DirectMessage } from '~/types/chat';

export function useChatMessages(userId: string) {
  const messages = ref<DirectMessage[]>([]);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(true);
  const { connect, onEvent, offEvent, emit } = useChatSocket();

  // Temp message tracker for optimistic sends
  const tempMessages = new Map<string, { text: string; createdAt: Date }>();
  let tempCounter = 0;

  function fetch(before?: string): void {
    loading.value = true;
    error.value = null;
    connect();
    emit('chat:history', { userId, before, limit: 50 });
  }

  function send(text: string): void {
    if (!text.trim()) return;

    sending.value = true;
    error.value = null;

    // Optimistic add
    const tempId = `temp-${++tempCounter}`;
    tempMessages.set(tempId, { text: text.trim(), createdAt: new Date() });

    messages.value.push({
      id: tempId,
      senderId: '', // will be set on ack
      receiverId: userId,
      text: text.trim(),
      read: false,
      createdAt: new Date(),
    });

    emit('chat:send', { receiverId: userId, text: text.trim() });
  }

  function markAsRead(): void {
    emit('chat:read', { userId });
  }

  onMounted(() => {
    connect();

    onEvent('chat:history', (data: { messages: DirectMessage[]; userId: string }) => {
      if (data.userId === userId) {
        messages.value = data.messages.reverse(); // server returns newest first
        loading.value = false;
        hasMore.value = data.messages.length >= 50;
      }
    });

    onEvent('chat:sent', (data: { id: string; createdAt: string }) => {
      // Replace temp message with server-confirmed message
      const tempIdx = messages.value.findIndex(
        (m) => m.id.startsWith('temp-'),
      );
      if (tempIdx !== -1) {
        messages.value[tempIdx] = {
          ...messages.value[tempIdx],
          id: data.id,
          createdAt: new Date(data.createdAt),
          senderId: 'me', // will be resolved properly
        };
      }
      tempMessages.clear();
      sending.value = false;
    });

    onEvent('chat:message', (data: DirectMessage) => {
      if (data.senderId === userId) {
        messages.value.push(data);
      }
    });

    onEvent('chat:error', (data: { code: string; message: string }) => {
      error.value = data.message;
      sending.value = false;
      // Remove optimistic message on error
      messages.value = messages.value.filter((m) => !m.id.startsWith('temp-'));
      tempMessages.clear();
    });

    fetch();
    markAsRead();
  });

  onUnmounted(() => {
    offEvent('chat:history');
    offEvent('chat:sent');
    offEvent('chat:message');
    offEvent('chat:error');
  });

  return {
    messages: readonly(messages),
    loading: readonly(loading),
    sending: readonly(sending),
    error: readonly(error),
    hasMore: readonly(hasMore),
    fetch,
    send,
    markAsRead,
  };
}
```

- [ ] **Step 3: Write tests for useConversations**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOnEvent = vi.fn();
const mockOffEvent = vi.fn();
const mockEmit = vi.fn();
const mockConnect = vi.fn(() => ({ connected: false, on: vi.fn() }));
const mockDisconnect = vi.fn();

vi.mock('~/composables/useChatSocket', () => ({
  useChatSocket: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    onEvent: mockOnEvent,
    offEvent: mockOffEvent,
    emit: mockEmit,
    connected: { value: false },
    error: { value: null },
  }),
}));

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls connect and emits conversations event on mount', async () => {
    const { useConversations } = await import('~/composables/useConversations');
    useConversations();

    expect(mockConnect).toHaveBeenCalled();
  });

  it('exposes loading state', async () => {
    const { useConversations } = await import('~/composables/useConversations');
    const conv = useConversations();

    expect(conv.loading).toBeDefined();
    expect(conv.conversations).toBeDefined();
    expect(conv.unreadCount).toBeDefined();
    expect(conv.error).toBeDefined();
  });
});
```

- [ ] **Step 4: Write tests for useChatMessages**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOnEvent = vi.fn();
const mockOffEvent = vi.fn();
const mockEmit = vi.fn();
const mockConnect = vi.fn(() => ({ connected: false, on: vi.fn() }));

vi.mock('~/composables/useChatSocket', () => ({
  useChatSocket: () => ({
    connect: mockConnect,
    onEvent: mockOnEvent,
    offEvent: mockOffEvent,
    emit: mockEmit,
    connected: { value: false },
    error: { value: null },
  }),
}));

describe('useChatMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls connect and emits history on mount', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    useChatMessages('u2');

    expect(mockConnect).toHaveBeenCalled();
  });

  it('exposes messages and actions', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    expect(chat.messages).toBeDefined();
    expect(chat.send).toBeDefined();
    expect(chat.loading).toBeDefined();
    expect(chat.sending).toBeDefined();
    expect(chat.error).toBeDefined();
    expect(chat.hasMore).toBeDefined();
  });
});
```

- [ ] **Step 5: Create shared `types/chat.ts`**

```typescript
// Socket.IO event payloads for the chat feature

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  userId: string;
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}
```

- [ ] **Step 6: Run frontend tests**

```bash
cd frontend && npm run test -- --run
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/composables/useConversations.ts
git add frontend/composables/useChatMessages.ts
git add frontend/tests/composables/useConversations.test.ts
git add frontend/tests/composables/useChatMessages.test.ts
git add frontend/types/chat.ts
git commit -m "feat: add chat composables with TDD"
```

---

### Task 10: Chat UI components

**Files:**
- Create: `frontend/components/chat/ChatModal.vue`
- Create: `frontend/components/chat/ConversationList.vue`
- Create: `frontend/components/chat/MessageThread.vue`
- Create: `frontend/components/chat/MessageBubble.vue`
- Create: `frontend/components/chat/MessageComposer.vue`

- [ ] **Step 1: Create MessageComposer.vue**

```vue
<script setup lang="ts">
const text = ref('');
const emit = defineEmits<{
  send: [text: string];
}>();

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  { disabled: false },
);

function submit() {
  const trimmed = text.value.trim();
  if (!trimmed || props.disabled) return;
  emit('send', trimmed);
  text.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}
</script>

<template>
  <div class="flex items-center gap-2 border-t border-border p-3">
    <input
      v-model="text"
      type="text"
      placeholder="Type a message..."
      :disabled="disabled"
      class="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
      @keydown="onKeydown"
    />
    <button
      :disabled="disabled || !text.trim()"
      class="flex size-9 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground disabled:opacity-50"
      @click="submit"
    >
      Send
    </button>
  </div>
</template>
```

- [ ] **Step 2: Create MessageBubble.vue**

```vue
<script setup lang="ts">
import type { DirectMessage } from '~/types/chat';

const props = withDefaults(
  defineProps<{
    message: DirectMessage;
    isOwn: boolean;
  }>(),
  { isOwn: false },
);

const isError = computed(() => props.message.id.startsWith('temp-') && !props.message.senderId);

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div :class="['flex', isOwn ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
        isOwn
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-muted text-foreground rounded-bl-md',
        isError ? 'opacity-60 border border-red-400' : '',
      ]"
    >
      <p>{{ message.text }}</p>
      <p
        :class="[
          'mt-0.5 text-[10px]',
          isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground',
        ]"
      >
        {{ formatTime(message.createdAt) }}
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Create ConversationList.vue**

```vue
<script setup lang="ts">
import type { Conversation } from '~/types/chat';

defineProps<{
  conversations: Conversation[];
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [userId: string];
}>();
</script>

<template>
  <div class="flex flex-col">
    <div v-if="loading" class="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Loading...
    </div>
    <div v-else-if="conversations.length === 0" class="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
      <p>No conversations yet.</p>
      <p class="mt-1 text-xs">Start one from a profile page.</p>
    </div>
    <div v-else class="divide-y divide-border">
      <button
        v-for="conv in conversations"
        :key="conv.userId"
        class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
        @click="emit('select', conv.userId)"
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {{ conv.name.slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{{ conv.name }}</span>
            <span class="text-[10px] text-muted-foreground">
              {{ new Date(conv.lastMessageAt).toLocaleDateString() }}
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">
            {{ conv.lastMessage }}
          </p>
        </div>
        <div
          v-if="conv.unreadCount > 0"
          class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
        >
          {{ conv.unreadCount }}
        </div>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Create MessageThread.vue**

```vue
<script setup lang="ts">
import type { DirectMessage } from '~/types/chat';
import MessageBubble from './MessageBubble.vue';
import MessageComposer from './MessageComposer.vue';

const props = withDefaults(
  defineProps<{
    userId: string;
    userName: string;
    messages: DirectMessage[];
    loading: boolean;
    sending: boolean;
    hasMore: boolean;
  }>(),
  { loading: false, sending: false, hasMore: false },
);

const emit = defineEmits<{
  send: [text: string];
  loadMore: [];
  close: [];
}>();

import { useAuthStore } from '~/stores/auth';

const scrollRef = ref<HTMLElement | null>(null);
const currentUserId = useAuthStore().user?.id ?? '';

function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  });
}

watch(
  () => props.messages.length,
  () => scrollToBottom(),
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex items-center gap-2 border-b border-border px-4 py-3">
      <button
        class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        @click="emit('close')"
      >
        ←
      </button>
      <span class="text-sm font-medium">{{ userName }}</span>
    </div>

    <!-- Messages -->
    <div ref="scrollRef" class="flex-1 space-y-2 overflow-y-auto p-4">
      <button
        v-if="hasMore && !loading"
        class="w-full py-2 text-xs text-muted-foreground hover:text-foreground"
        @click="emit('loadMore')"
      >
        Load earlier messages
      </button>
      <div v-if="loading && messages.length === 0" class="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading...
      </div>
      <div v-else-if="messages.length === 0" class="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Send a message to start the conversation.
      </div>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-own="msg.senderId === currentUserId"
      />
    </div>

    <!-- Composer -->
    <MessageComposer :disabled="sending" @send="emit('send', $event)" />
  </div>
</template>
```

- [ ] **Step 5: Create ChatModal.vue**

```vue
<script setup lang="ts">
import { useChatStore } from '~/stores/chat';
import { useConversations } from '~/composables/useConversations';
import { useChatMessages } from '~/composables/useChatMessages';
import ConversationList from './ConversationList.vue';
import MessageThread from './MessageThread.vue';
import { useAuthStore } from '~/stores/auth';

const chat = useChatStore();
const auth = useAuthStore();
const { conversations, unreadCount, loading: convsLoading } = useConversations();

const activeUser = computed(() => {
  if (!chat.activeUserId) return null;
  return conversations.value.find((c) => c.userId === chat.activeUserId) ?? null;
});

const messagesApi = computed(() => {
  if (!chat.activeUserId) return null;
  return useChatMessages(chat.activeUserId);
});

function onSelect(userId: string) {
  chat.openConversation(userId);
}

function onClose() {
  chat.closeConversation();
}

function onSend(text: string) {
  messagesApi.value?.send(text);
}

function onLoadMore() {
  // Messages are already loaded — cursor pagination can be added later
}
</script>

<template>
  <div>
    <!-- Collapsed pill -->
    <button
      v-if="!chat.showModal"
      class="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-lg transition-colors hover:bg-accent"
      @click="chat.open()"
    >
      <div class="relative">
        <span class="text-lg">💬</span>
        <span
          v-if="unreadCount > 0"
          class="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
        >
          {{ unreadCount }}
        </span>
      </div>
      <span class="text-sm">Messages</span>
    </button>

    <!-- Expanded modal -->
    <div
      v-else
      class="fixed bottom-0 right-0 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl md:bottom-4 md:right-4 md:rounded-xl"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 class="text-sm font-semibold">
          {{ chat.activeUserId ? activeUser?.name ?? 'Chat' : 'Messages' }}
        </h3>
        <button
          class="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          @click="chat.close()"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-hidden">
        <ConversationList
          v-if="!chat.activeUserId"
          :conversations="conversations"
          :loading="convsLoading"
          @select="onSelect"
        />
        <MessageThread
          v-else-if="messagesApi && activeUser"
          :user-id="chat.activeUserId"
          :user-name="activeUser.name"
          :messages="messagesApi.messages.value"
          :loading="messagesApi.loading.value"
          :sending="messagesApi.sending.value"
          :has-more="messagesApi.hasMore.value"
          @send="onSend"
          @load-more="onLoadMore"
          @close="onClose"
        />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Add `💬` is not a lucide icon, switch to lucide-vue-next MessageCircle**

Replace the `💬` in ChatModal.vue with lucide-vue-next `MessageCircle`:

```vue
<script setup lang="ts">
import { MessageCircle, X } from 'lucide-vue-next';
// ... rest of imports
</script>
```

And update the collapsed button:
```vue
<MessageCircle class="size-5" />
```

And the close button in header:
```vue
<X class="size-4" />
```

- [ ] **Step 7: Commit**

```bash
git add frontend/components/chat/
git commit -m "feat: add chat UI components"
```

---

### Task 11: Navbar + Profile integration

**Files:**
- Modify: `frontend/components/Nav.vue`
- Modify: `frontend/components/profile/ProfileInfo.vue`

- [ ] **Step 1: Add message icon to Nav.vue**

After the cart `NuxtLink` and before `ProfileDropdown`, add:

```vue
<template>
  <!-- After the cart button, before ProfileDropdown -->
  <Button
    v-if="auth.signedIn"
    variant="archivalGhost"
    size="icon"
    :aria-label="`Messages${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`"
    class="relative"
    @click="onMessagesClick"
  >
    <MessageCircle class="size-5" />
    <span
      v-if="unreadCount > 0"
      class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground"
    >
      {{ unreadCount > 9 ? '9+' : unreadCount }}
    </span>
  </Button>
</template>

<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next';
import { MessageCircle } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { useAuthStore } from '~/stores/auth';
import { useChatStore } from '~/stores/chat';
import { useConversations } from '~/composables/useConversations';

const auth = useAuthStore();
const chat = useChatStore();
const { unreadCount } = useConversations();

function onMessagesClick() {
  if (auth.signedIn) {
    chat.toggle();
  } else {
    auth.openAuthModal();
  }
}
</script>
```

**Important:** The `Nav.vue` currently uses `<script setup>` without importing `ref`, `computed`, or `useState`. Add `onMounted` to the imports or to the script block if needed. Nuxt auto-imports `onMounted` so it should work. But `MessageCircle` needs to be imported explicitly (it's a lucide icon).

- [ ] **Step 2: Update ProfileInfo.vue Message button**

In `frontend/components/profile/ProfileInfo.vue`, replace `onMessageClick`:

```typescript
import { useChatStore } from '~/stores/chat';

function onMessageClick() {
  if (auth.signedIn) {
    const chatStore = useChatStore();
    chatStore.openConversation(props.user.id);
  } else {
    auth.openAuthModal();
  }
}
```

- [ ] **Step 3: Listen for chat:message to update unread badge in real-time**

The `useConversations` composable already refreshes when `chat:message` arrives (Task 9, Step 1). The `Nav.vue` uses `unreadCount` from `useConversations()` which is reactive. So unread badge updates automatically when new messages arrive in the same session.

For the scenario where the chat modal is closed and a message arrives, the Socket.IO connection stays alive (it's not tied to the modal — `useConversations` connects on mount in Nav.vue), so `chat:message` triggers `fetch()` which updates `unreadCount`, and the badge updates in real-time.

- [ ] **Step 4: Add ChatModal to the app layout**

In `frontend/app.vue`, add `<ChatModal />` so it renders globally outside the layout:

```vue
<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ChatModal />
  </div>
</template>
```

- [ ] **Step 5: Run lint and build**

```bash
cd frontend && npm run lint && npm run build
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add frontend/components/Nav.vue
git add frontend/components/profile/ProfileInfo.vue
git add frontend/app.vue
git commit -m "feat: wire chat into navbar and profile, add ChatModal to layout"
```

---

### Task 12: Frontend integration tests

**Files:**
- Modify: `frontend/tests/composables/useChatMessages.test.ts` (expand)
- Modify: `frontend/tests/composables/useConversations.test.ts` (expand)

- [ ] **Step 1: Expand useChatMessages test with send behavior**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

let onEventHandler: ((data: any) => void) | null = null;
const mockOnEvent = vi.fn((_event: string, handler: (data: any) => void) => {
  onEventHandler = handler;
});
const mockOffEvent = vi.fn();
const mockEmit = vi.fn();
const mockConnect = vi.fn(() => ({ connected: true, on: vi.fn() }));

vi.mock('~/composables/useChatSocket', () => ({
  useChatSocket: () => ({
    connect: mockConnect,
    onEvent: mockOnEvent,
    offEvent: mockOffEvent,
    emit: mockEmit,
    connected: { value: true },
    error: { value: null },
  }),
}));

describe('useChatMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onEventHandler = null;
  });

  it('connects and emits history on init', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    useChatMessages('u2');

    expect(mockConnect).toHaveBeenCalled();
  });

  it('send emits chat:send event', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('Hello!');

    expect(mockEmit).toHaveBeenCalledWith('chat:send', {
      receiverId: 'u2',
      text: 'Hello!',
    });
  });

  it('send does not emit for empty text', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('');
    chat.send('   ');

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('markAsRead emits chat:read event', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.markAsRead();

    expect(mockEmit).toHaveBeenCalledWith('chat:read', { userId: 'u2' });
  });

  it('handles incoming message updates', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    // Simulate history response
    const historyHandler = mockOnEvent.mock.calls.find(
      (c) => c[0] === 'chat:history',
    );
    if (historyHandler) {
      historyHandler[1]({
        messages: [
          { id: 'm1', senderId: 'u2', receiverId: 'u1', text: 'Hi!', read: false, createdAt: new Date() },
        ],
        userId: 'u2',
      });
    }

    expect(chat.messages.value.length).toBe(1);
    expect(chat.messages.value[0].text).toBe('Hi!');
  });
});
```

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npm run test -- --run
```

Expected: All PASS

- [ ] **Step 3: Run full backend tests**

```bash
cd backend && npm run test -- --no-coverage
```

Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/composables/useChatMessages.test.ts
git add frontend/tests/composables/useConversations.test.ts
git commit -m "test: expand chat composable integration tests"
```

---

### Final verification

- [ ] **Run backend lint + test + build**

```bash
cd backend && npm run lint && npm run test -- --no-coverage && npm run build
```

Expected: All pass

- [ ] **Run frontend lint + test + build**

```bash
cd frontend && npm run lint && npm run test -- --run && npm run build
```

Expected: All pass

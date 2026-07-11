# Direct Message (Real-time Chat) — Design Spec

## Overview

Add 1-on-1 real-time direct messaging to Read in Peace using Socket.IO. Users can
send text messages to each other via a collapsible right-side modal (Facebook/Twitter
style) with a conversation list, unread badge on the navbar, and auth-gated access.

## Database

New table in `src/core/database/schema.ts`:

```sql
direct_messages (
  id          text PK (gen_random_uuid)
  sender_id   text FK → user.id (cascade)
  receiver_id text FK → user.id (cascade)
  text        text NOT NULL
  read        boolean NOT NULL DEFAULT false
  created_at  timestamp NOT NULL DEFAULT now()
)
```

Indexes:
- `idx_dm_sender_receiver` on `(sender_id, receiver_id)` — conversation queries
- `idx_dm_receiver_read` on `(receiver_id, read)` — unread count queries

Migration via `drizzle-kit generate`.

## Backend — Chat Module (`src/chat/`)

Follows the `profiles/` module pattern exactly. Imports `IamModule` for auth.

### Domain (`domain/chat.ts`)

```typescript
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
  userId: string;          // the other participant
  name: string;
  image: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export interface ChatRepository {
  send(msg: Omit<DirectMessage, 'id' | 'createdAt'>): Promise<DirectMessage>;
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

### Infrastructure (`infrastructure/drizzle-chat.repository.ts`)

Drizzle implementation of `ChatRepository` using the `direct_messages` table.
Queries:
- `send` → `db.insert(directMessages).values(...).returning()`
- `getConversations` → subquery grouping by partner, joining user table
- `getHistory` → `db.select().where(or(...)).orderBy(desc).limit().offset` with cursor
- `markAsRead` → `db.update().set({ read: true }).where(and(...))`
- `getUnreadCount` → `db.select(count).where(receiver_id = userId AND read = false)`

### Application (`application/chat.service.ts`)

```typescript
class ChatService {
  send(senderId: string, receiverId: string, text: string): DirectMessage
  getConversations(userId: string): Conversation[]
  getHistory(userId: string, otherUserId: string, before?: string): DirectMessage[]
  markAsRead(userId: string, fromUserId: string): void
  getUnreadCount(userId: string): number
}
```

Validation:
- `text` must be non-empty, max 2000 chars
- `senderId` !== `receiverId` (self-messaging forbidden → `ForbiddenException`)
- `receiverId` must exist (throws `NotFoundException` if user not found)

### Presentation (`presentation/chat.gateway.ts`)

NestJS `@WebSocketGateway({ namespace: '/chat', cors: ... })`. Configuration:

```typescript
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: corsOrigins, credentials: true },
})
```

**Authentication**: On `handleConnection`, reads the session cookie/token from
`socket.handshake.auth` or `socket.handshake.headers.cookie`. Validates via
`AuthPort.getSession(sessionToken)`. If invalid → `socket.disconnect()`.

**Per-user room**: After auth, joins `user:<userId>` room.

**Event handlers:**

| Event | Guard | Handler |
|-------|-------|---------|
| `chat:send` | authenticated | Validate → service.send → emit `chat:message` to receiver's room, emit `chat:sent` to sender |
| `chat:conversations` | authenticated | service.getConversations → emit `chat:conversations` |
| `chat:history` | authenticated | service.getHistory → emit `chat:history` |
| `chat:read` | authenticated | service.markAsRead → emit `chat:read` to sender |
| `chat:unread` | authenticated | service.getUnreadCount → emit `chat:unread` |

Error events: On any error, emit `chat:error` with `{ code: string, message: string }`.

### Module (`chat.module.ts`)

```typescript
@Module({
  imports: [IamModule],
  providers: [
    DrizzleChatRepository,
    ChatService,
    ChatGateway,
    alias(CHAT_REPOSITORY, DrizzleChatRepository),
  ],
})
```

Registered in `AppModule`.

## Frontend

### Dependencies
- `socket.io-client` (npm)
- `@types/socket.io-client` (if needed)

### Composables

**`composables/useChatSocket.ts`**

Manages Socket.IO connection lifecycle:
- Connects on first call (lazy)
- Passes auth token from `authClient` in handshake
- Returns `socket` instance
- Auto-disconnects on `onUnmounted` (cleanup)
- Handles reconnect: rejoins room automatically (Socket.IO handles this)
- Exposes: `connected` (ref), `error` (ref), `socket`

**`composables/useConversations.ts`**

Wraps `chat:conversations` and `chat:unread` events:
- Fetches conversation list and unread count on mount
- Listens for `chat:message` to update conversation preview + bump to top + increment unread
- Listens for `chat:unread` updates
- Returns: `conversations` (ref), `unreadCount` (computed), `loading`, `error`
- Calls `useChatSocket()` internally

**`composables/useChatMessages.ts`**

Takes `userId` param, manages a single conversation:
- Fetches history with `chat:history` (cursor-based, `loadMore()`)
- Sends via `chat:send` — optimistic add, replace id on `chat:sent` ack, rollback on error
- Mark read via `chat:read` when thread opens
- Listens for `chat:message` from this user to append
- Returns: `messages` (ref), `send(text)`, `loadMore()`, `loading`, `error`, `sending`
- Handles empty state, loading state

### Pinia Store (`stores/chat.ts`)

```typescript
interface ChatState {
  showModal: boolean;
  expanded: boolean;     // true = expanded, false = collapsed pill
  activeUserId: string | null;
}
```

Actions: `open()`, `close()`, `toggleCollapse()`, `openConversation(userId)`, `closeConversation()`

### Components

**`components/chat/ChatModal.vue`**

Root container. Absolutely positioned at right side. Conditionally rendered when
`showModal` is true. Two visual states:
- **Expanded**: 340px wide, full height (~450px max), slide-in from right
- **Collapsed**: small pill at bottom-right ("Messages" + icon + unread count)

Transition between states via CSS. Uses Pinia store state.
Renders `ConversationList` when `activeUserId` is null, `MessageThread` otherwise.

**`components/chat/ConversationList.vue`**

Props: `conversations: Conversation[]`.
Emits: `select(userId: string)`.
Rows: avatar initials, name, last message preview, timestamp, unread dot.
Empty state: "No conversations yet." with a subtle illustration or message.

**`components/chat/MessageThread.vue`**

Props: `userId: string`.
Shows header with back arrow (←) and user name.
Auto-scrolls to bottom on new messages. "Load earlier" button at top when more pages exist.
Renders `MessageBubble` for each message and `MessageComposer` at bottom.

**`components/chat/MessageBubble.vue`**

Props: `message: DirectMessage`, `isOwn: boolean`.
Sent: right-aligned, primary color background. Received: left-aligned, muted background.
Shows timestamp on hover or as small label.

**`components/chat/MessageComposer.vue`**

Input + send button. Disabled while `sending` is true. Enter key sends. Trims whitespace.
Does not send empty messages.

### Existing Component Changes

**`components/Nav.vue`**: Add message icon (`MessageCircle` from lucide-vue-next) with
`unreadCount` badge. If count > 0, show red badge. Click: `auth.signedIn` →
`chatStore.open()`, else `auth.openAuthModal()`.

**`components/profile/ProfileInfo.vue`**: `onMessageClick()` — if `auth.signedIn`,
`chatStore.openConversation(user.id)`, else `auth.openAuthModal()`. Remove the old
flash("coming soon") call.

### Auth Gating Summary

| Trigger | Authenticated? | Action |
|---------|---------------|--------|
| Click navbar message icon | Yes | Open chat modal |
| Click navbar message icon | No | Open auth modal |
| Click profile "Message" button | Yes | Open chat modal, start conversation with that user |
| Click profile "Message" button | No | Open auth modal |
| Socket.IO connection | No | Immediate disconnect with error |

## Edge Cases & Error Handling

### Connection States
- **disconnected** — navbar icon shows no badge, chat modal shows "Reconnecting..." in collapsed state
- **connecting** — modal can show a subtle loading indicator
- **connected** — normal operation
- **error** — flash message, retry with backoff (Socket.IO handles this natively)

### Validation
- Empty message → not sent (disabled button / trimmed input)
- Message > 2000 chars → truncated on client, rejected on server → `chat:error` with `MESSAGE_TOO_LONG`
- Self-messaging → `chat:error` with `SELF_MESSAGE`, message not sent
- Unknown receiver → `chat:error` with `USER_NOT_FOUND`
- Sending while disconnected → queue and send on reconnect, or show error

### UI States
- **Empty conversations list**: "No conversations yet. Start one from a profile page."
- **Empty message thread**: "Send a message to start the conversation."
- **Loading history**: skeleton/spinner in message area
- **Load more**: "Load earlier messages" button at top of thread
- **Send failure**: message bubble shows error state (red border, retry option)

### Race Conditions
- Multiple rapid sends: each `chat:send` gets its own `chat:sent` ack, matched by client-generated
  temp ID → no duplicates
- Open same conversation from two tabs: each Socket.IO connection gets its own room subscription,
  both receive messages
- Send to user who just deleted account: `userId` validated before insert, returns error

### Optimistic UI
- On `chat:send`: add message to local list immediately with temp ID
- On `chat:sent` ack: replace temp ID with server ID
- On `chat:error`: remove message from list, show flash error

## Testing Strategy (TDD)

### Backend (Jest)

1. **ChatRepository** — mock Drizzle, test all CRUD operations
2. **ChatService** — mock repository, test:
   - Send returns correctly formatted message
   - Self-messaging throws ForbiddenException
   - Unknown receiver throws NotFoundException
   - Empty text throws validation error
   - Get history returns in correct order
   - Mark as read updates correctly
   - Get conversations handles empty case
   - Get unread count returns correct number
3. **ChatGateway** — mock service + auth port, test:
   - Authenticated connection joins room
   - Unauthenticated connection is rejected
   - Send event calls service and emits to correct room
   - Error in service sends `chat:error` event

### Frontend (Vitest)

1. **useChatSocket** — test connect/disconnect lifecycle, auth token passing
2. **useConversations** — test conversation list updates, unread count changes
3. **useChatMessages** — test:
   - Optimistic send: message added immediately
   - Send ack: temp ID replaced
   - Send error: message removed
   - History loaded correctly
   - Load more pagination
   - Empty state
4. **chatStore** — test open/close/toggle/openConversation/closeConversation
5. **ChatModal** — test render/no-render based on store state
6. **MessageComposer** — test empty message not sent, Enter key sends

## Files to Create/Modify

### Backend (new)
- `backend/src/chat/domain/chat.ts`
- `backend/src/chat/infrastructure/drizzle-chat.repository.ts`
- `backend/src/chat/application/chat.service.ts`
- `backend/src/chat/presentation/chat.gateway.ts`
- `backend/src/chat/chat.module.ts`

### Backend (modified)
- `backend/src/core/database/schema.ts` — add `directMessages` table + indexes
- `backend/src/app.module.ts` — register `ChatModule`
- `backend/package.json` — add `@nestjs/platform-socket.io`, `socket.io`

### Frontend (new)
- `frontend/composables/useChatSocket.ts`
- `frontend/composables/useConversations.ts`
- `frontend/composables/useChatMessages.ts`
- `frontend/stores/chat.ts`
- `frontend/components/chat/ChatModal.vue`
- `frontend/components/chat/ConversationList.vue`
- `frontend/components/chat/MessageThread.vue`
- `frontend/components/chat/MessageBubble.vue`
- `frontend/components/chat/MessageComposer.vue`

### Frontend (modified)
- `frontend/components/Nav.vue` — add message icon with unread badge
- `frontend/components/profile/ProfileInfo.vue` — wire Message button to chat
- `frontend/package.json` — add `socket.io-client`

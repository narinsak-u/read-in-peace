# PR #12 Fix Plan — Chat System Issues

Fixes for issues found during code review of PR #12 (Direct message chat system).

## Table of Contents

1. [Critical Fixes](#1-critical-fixes)
2. [Architecture Fixes](#2-architecture-fixes)
3. [Minor Fixes](#3-minor-fixes)

---

## 1. Critical Fixes

### 1A. ChatService: `throw new Error` → `BadRequestException`

**File:** `backend/src/chat/application/chat.service.ts:21-26`

**Problem:** Validation errors throw generic `Error` which maps to HTTP 500. Should be `BadRequestException` (400).

**Current:**
```typescript
if (!text.trim()) {
  throw new Error('Message cannot be empty');
}
if (text.length > 2000) {
  throw new Error('Message too long');
}
```

**Fix:**
```typescript
import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';

// ...

if (!text.trim()) {
  throw new BadRequestException('Message cannot be empty');
}
if (text.length > 2000) {
  throw new BadRequestException('Message too long');
}
```

**Also update test:** `tests/chat/application/chat.service.spec.ts` — verify the thrown exception type is `BadRequestException`, not `Error`.

---

### 1B. Add DTO for POST `/api/chat/messages`

**File:** New `backend/src/chat/presentation/dto/send-message.dto.ts`

**Problem:** No input validation on the send endpoint. Missing `receiverId` causes DB error; `text` can be any type.

**Create DTO (follow existing pattern from `books/presentation/dto/`):**
```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}
```

**Update controller:**
```typescript
import { SendMessageDto } from './dto/send-message.dto';

// ...

@Post('messages')
send(
  @CurrentUser() user: AuthUser,
  @Body() body: SendMessageDto,
) {
  return this.chatService.send(user.id, body.receiverId, body.text);
}
```

---

### 1C. ChatGateway: hardcoded CORS → use config

**File:** `backend/src/chat/presentation/chat.gateway.ts:14-19`

**Problem:** CORS origin hardcoded to `['http://localhost:3000']`.

**Fix:** Inject `CoreConfigService` and read `config.frontend.url`. Since decorators are evaluated at module load time, use the gateway's `afterInit()` hook or a factory provider.

**Option A (afterInit hook):**
```typescript
import { CoreConfigService } from '../../core/config/config.provider';

constructor(
  private readonly chatService: ChatService,
  @Inject(AUTH_PORT) private readonly authPort: AuthPort,
  private readonly config: CoreConfigService,
) {}

afterInit(server: Server) {
  // CORS is configured on the underlying HTTP server, not the gateway decorator
}
```

**Option B (remove decorator CORS, configure at app level):** The `main.ts` already configures CORS via `app.enableCors()`. Socket.IO inherits this. Remove the `cors` option from `@WebSocketGateway` entirely — it will use the app-level CORS config.

**Recommended: Option B** — simplest, consistent with how the rest of the app handles CORS.

---

## 2. Architecture Fixes

### 2A. Refactor `computed()` calling `useChatMessages`

**File:** `frontend/components/chat/ChatModal.vue:46-52`

**Problem:** `useChatMessages` calls composition API functions (`useRuntimeConfig()`, `useAuthStore()`, `onUnmounted()`) inside a `computed()`. This violates Vue's rules — composables should be called at setup top level.

**Current:**
```typescript
const messagesApi = computed(() => {
  if (!chat.activeUserId) return null;
  return useChatMessages(chat.activeUserId, () => {
    fetchConversations();
    fetchUnread();
  });
});
```

**Fix:** Use `watch` to manage the messages API lifecycle instead:
```typescript
const messagesApi = ref<ReturnType<typeof useChatMessages> | null>(null);

watch(
  () => chat.activeUserId,
  (userId) => {
    // Cleanup previous
    messagesApi.value = null;
    if (userId) {
      messagesApi.value = useChatMessages(userId, () => {
        fetchConversations();
        fetchUnread();
      });
    }
  },
  { immediate: true },
);
```

**Note:** This still calls `useChatMessages` inside a `watch`, which is borderline. The cleanest fix is to extract the thread into a child component (`ChatThreadWrapper.vue`) that receives `userId` as a prop and calls `useChatMessages` at its own top level. But that's a larger refactor — the `watch` approach is acceptable for now.

---

### 2B. Fix `handleSent` matching first temp message instead of specific one

**File:** `frontend/composables/useChatMessages.ts:42-54`

**Problem:** When multiple messages are sent rapidly, `handleSent` replaces the first `temp-*` message, not the one that was actually acknowledged.

**Current:**
```typescript
function handleSent(data: { id: string; createdAt: string }): void {
  const tempIdx = messages.value.findIndex((m) => m.id.startsWith('temp-'));
  // ...
}
```

**Fix:** Track pending sends with a queue keyed by temp ID, or include the temp ID in the socket ack. The simplest approach: since Socket.IO guarantees ordering for a single client, the first temp message is always the oldest unacked one. This is actually correct for sequential sends. However, for safety, track the last sent temp ID:

```typescript
let lastSentTempId: string | null = null;

function send(text: string): void {
  // ...
  lastSentTempId = tempId;
  emit('chat:send', { receiverId: userId, text: text.trim() });
}

function handleSent(data: { id: string; createdAt: string }): void {
  if (lastSentTempId) {
    const idx = messages.value.findIndex((m) => m.id === lastSentTempId);
    if (idx !== -1) {
      messages.value[idx] = {
        ...messages.value[idx],
        id: data.id,
        createdAt: new Date(data.createdAt),
        senderId: currentUserId,
      };
    }
    lastSentTempId = null;
  }
  sending.value = false;
  onSent?.();
}
```

---

## 3. Minor Fixes

### 3A. `@CurrentUser()` type: `{ id: string }` → `AuthUser`

**File:** `backend/src/chat/presentation/chat.controller.ts:20,25,46`

Replace all `{ id: string }` with `AuthUser` from `iam/auth/auth.port`.

---

### 3B. `drizzle-chat.repository.ts`: rename `rows` → `result`

**File:** `backend/src/chat/infrastructure/drizzle-chat.repository.ts:29,75`

```typescript
const result = await this.db.execute(sql`...`);
return (result.rows as any[]).map(...)
```

---

### 3C. Remove unused `Library` import from Nav.vue

**File:** `frontend/components/Nav.vue:2`

```typescript
import { ArrowLeft, Bell, ShoppingBag } from "lucide-vue-next";
// removed Library
```

---

### 3D. `ChatModal` responsive sizing

**File:** `frontend/components/chat/ChatModal.vue:75`

Add responsive classes for mobile:
```html
class="fixed inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl md:inset-auto md:bottom-4 md:right-4 md:h-[500px] md:w-[360px] md:rounded-xl"
```

---

### 3E. `ConversationList`: move `timeAgo` import to shared util

**File:** `frontend/components/chat/ConversationList.vue:3`

Move `timeAgo` from `~/utils/comment` to `~/utils/time.ts` and update all imports.

---

## Verification

After each fix:
```bash
# Backend
cd backend && npm run lint && npm run test && npm run build

# Frontend
cd frontend && npm run lint && npm run test && npm run build
```

## Priority Order

1. **1A** — `BadRequestException` (bug, 1 line change)
2. **1B** — SendMessageDto (security, new file + 3 line edit)
3. **1C** — CORS fix (deployment blocker, remove 4 lines)
4. **2A** — `computed()` refactor (correctness, medium effort)
5. **2B** — `handleSent` matching (correctness, small effort)
6. **3A-3E** — Minor cleanup (all independent, low effort)

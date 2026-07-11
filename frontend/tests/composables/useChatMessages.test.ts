import { describe, it, expect, vi, beforeEach } from 'vitest';

let onEventHandlers: Record<string, (...args: any[]) => void> = {};
const mockSocket = {
  connected: true,
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    onEventHandlers[event] = handler;
  }),
  off: vi.fn((event: string) => {
    onEventHandlers[event] = undefined as unknown as (...args: any[]) => void;
  }),
  emit: vi.fn(),
};
const mockConnect = vi.fn(() => mockSocket);
const mockEmit = vi.fn();

vi.mock('~/composables/useChatSocket', () => ({
  useChatSocket: () => ({
    connect: mockConnect,
    emit: mockEmit,
  }),
}));

describe('useChatMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    onEventHandlers = {};
  });

  it('connects and emits history on init', async () => {
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

    mockEmit.mockClear();
    chat.send('');
    chat.send('   ');

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('markAsRead emits chat:read event', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    mockEmit.mockClear();
    chat.markAsRead();

    expect(mockEmit).toHaveBeenCalledWith('chat:read', { userId: 'u2' });
  });

  it('handles incoming message updates via history event', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    const historyHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'chat:history',
    );
    expect(historyHandler).toBeDefined();

    historyHandler[1]({
      messages: [
        { id: 'm1', senderId: 'u2', receiverId: 'u1', text: 'Hi!', read: false, createdAt: new Date() },
      ],
      userId: 'u2',
    });

    expect(chat.messages.value.length).toBe(1);
    expect(chat.messages.value[0].text).toBe('Hi!');
  });

  it('handles sent acknowledgement replacing temp ID', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('Hello!');

    const tempMsg = chat.messages.value.find((m) => m.id.startsWith('temp-'));
    expect(tempMsg).toBeDefined();

    const sentHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'chat:sent',
    );
    expect(sentHandler).toBeDefined();

    sentHandler[1]({ id: 'server-msg-1', createdAt: new Date().toISOString() });

    const updated = chat.messages.value.find((m) => m.id === 'server-msg-1');
    expect(updated).toBeDefined();
    expect(chat.sending.value).toBe(false);
  });

  it('handles error event clearing optimistic messages', async () => {
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('Hello!');
    expect(chat.messages.value.some((m) => m.id.startsWith('temp-'))).toBe(true);

    const errorHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'chat:error',
    );
    expect(errorHandler).toBeDefined();

    errorHandler[1]({ code: 'SEND_FAILED', message: 'Failed' });

    expect(chat.messages.value.some((m) => m.id.startsWith('temp-'))).toBe(false);
    expect(chat.sending.value).toBe(false);
    expect(chat.error.value).toBe('Failed');
  });
});

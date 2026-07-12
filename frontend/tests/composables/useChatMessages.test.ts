import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
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

vi.mock('#app', () => ({
  $fetch: (...args: any[]) => mockFetch(...args),
}));

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

  it('fetches messages via REST on init', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useChatMessages } = await import('~/composables/useChatMessages');
    useChatMessages('u2');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat/messages/u2'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('exposes messages and actions', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    expect(chat.messages).toBeDefined();
    expect(chat.send).toBeDefined();
    expect(chat.loading).toBeDefined();
    expect(chat.sending).toBeDefined();
    expect(chat.error).toBeDefined();
    expect(chat.hasMore).toBeDefined();
  });

  it('send connects socket and emits chat:send', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('Hello!');

    expect(mockConnect).toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith('chat:send', {
      receiverId: 'u2',
      text: 'Hello!',
    });
  });

  it('send does not emit for empty text', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    mockEmit.mockClear();
    chat.send('');
    chat.send('   ');

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('handles sent acknowledgement replacing temp ID', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('Hello!');

    const tempMsg = chat.messages.value.find((m) => m.id.startsWith('temp-'));
    expect(tempMsg).toBeDefined();

    const sentHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'chat:sent',
    ) as [string, (data: any) => void] | undefined;
    expect(sentHandler).toBeDefined();

    sentHandler![1]({ id: 'server-msg-1', createdAt: new Date().toISOString() });

    const updated = chat.messages.value.find((m) => m.id === 'server-msg-1');
    expect(updated).toBeDefined();
    expect(chat.sending.value).toBe(false);
  });

  it('handles error event clearing optimistic messages', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useChatMessages } = await import('~/composables/useChatMessages');
    const chat = useChatMessages('u2');

    chat.send('Hello!');
    expect(chat.messages.value.some((m) => m.id.startsWith('temp-'))).toBe(true);

    const errorHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === 'chat:error',
    ) as [string, (data: any) => void] | undefined;
    expect(errorHandler).toBeDefined();

    errorHandler![1]({ code: 'SEND_FAILED', message: 'Failed' });

    expect(chat.messages.value.some((m) => m.id.startsWith('temp-'))).toBe(false);
    expect(chat.sending.value).toBe(false);
    expect(chat.error.value).toBe('Failed');
  });
});

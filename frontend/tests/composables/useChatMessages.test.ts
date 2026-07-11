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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};
const mockConnect = vi.fn(() => mockSocket);

vi.mock('~/composables/useChatSocket', () => ({
  useChatSocket: () => ({
    connect: mockConnect,
    emit: vi.fn(),
  }),
}));

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('calls connect on first call', async () => {
    const { useConversations } = await import('~/composables/useConversations');
    useConversations();

    expect(mockConnect).toHaveBeenCalled();
  });

  it('exposes reactive state', async () => {
    const { useConversations } = await import('~/composables/useConversations');
    const conv = useConversations();

    expect(conv.loading).toBeDefined();
    expect(conv.conversations).toBeDefined();
    expect(conv.unreadCount).toBeDefined();
    expect(conv.error).toBeDefined();
  });
});

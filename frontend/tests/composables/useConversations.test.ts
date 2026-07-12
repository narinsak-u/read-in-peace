import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();

vi.stubGlobal('$fetch', mockFetch);

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'current-user' } }),
}));

vi.mock('~/composables/useChatSocket', () => ({
  useChatSocket: () => ({
    connect: vi.fn(),
    emit: vi.fn(),
  }),
}));

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetches conversations via REST', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const { useConversations } = await import('~/composables/useConversations');
    const conv = useConversations();

    await conv.fetchConversations();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat/conversations'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('exposes reactive state', async () => {
    const { useConversations } = await import('~/composables/useConversations');
    const conv = useConversations();

    expect(conv.loading).toBeDefined();
    expect(conv.conversations).toBeDefined();
    expect(conv.unreadCount).toBeDefined();
    expect(conv.fetchConversations).toBeInstanceOf(Function);
    expect(conv.fetchUnread).toBeInstanceOf(Function);
  });
});

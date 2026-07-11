import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { backendUrl: 'http://localhost:4000' },
}));

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

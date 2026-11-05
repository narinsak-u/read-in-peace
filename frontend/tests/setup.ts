import { vi } from 'vitest';

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { backendUrl: 'http://localhost:3000' },
}));

import { createPinia, setActivePinia } from 'pinia';
import { ref, readonly } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '~/stores/auth';

const { mockSignInSocial } = vi.hoisted(() => ({ mockSignInSocial: vi.fn() }));
vi.stubGlobal('ref', ref);
vi.stubGlobal('readonly', readonly);

vi.mock('~/lib/auth-client', () => ({
  authClient: {
    useSession: () => ref({ data: null }),
    signIn: { social: mockSignInSocial },
  },
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));
vi.mock('~/composables/useFlash', () => ({ useFlash: () => ({ flash: vi.fn() }) }));

describe('central identity sign-in', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('window', {
      location: { origin: 'https://reading.example' },
      history: { replaceState: vi.fn() },
    });
    mockSignInSocial.mockReset().mockResolvedValue({});
  });

  it('returns to the protected route after the application callback', async () => {
    const auth = useAuthStore();
    auth.openAuthModal(undefined, '/dashboard?tab=borrowed');

    await auth.signInCentral();

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'central-identity',
      callbackURL: `${window.location.origin}/dashboard?tab=borrowed`,
    });
  });

  it('uses the normal origin when no destination was requested', async () => {
    const auth = useAuthStore();

    await auth.signInCentral();

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'central-identity',
      callbackURL: window.location.origin,
    });
  });

  it.each([
    'https://attacker.example',
    '//attacker.example/path',
    '/%zz',
    '/\u0000dashboard',
    '/\u001f',
    '/\u007f',
  ])('does not use hostile destination %s', async (destination) => {
    const auth = useAuthStore();
    auth.openAuthModal(undefined, destination);

    await auth.signInCentral();

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'central-identity',
      callbackURL: window.location.origin,
    });
  });
});

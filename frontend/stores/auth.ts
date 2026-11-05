import { defineStore } from 'pinia';
import { shallowRef, watch } from 'vue';
import { authClient, signOut } from '~/lib/auth-client';
import { useFlash } from '~/composables/useFlash';

export interface User {
  id: string;
  name: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const signedIn = shallowRef(false);
  const user = shallowRef<User | null>(null);
  const adminMode = shallowRef(false);
  const sessionReady = shallowRef(false);

  const session = authClient.useSession();

  watch(session, (val) => {
    if (val?.data?.user) {
      user.value = val.data.user;
      signedIn.value = true;
    } else {
      user.value = null;
      signedIn.value = false;
    }
    sessionReady.value = Boolean(val && !val.isPending);
  }, { immediate: true });



  async function authSignOut() {
    const { error } = await signOut();
    if (error) {
      flash('Read in Peace sign-out failed. Try again.');
      return;
    }
    signedIn.value = false;
    user.value = null;
    flash('Signed out of Read in Peace. Your Central SSO Session and other Application Sessions remain active.');
  }
  async function signInCentral(returnTo?: string) {
    const origin = window.location.origin;
    const destination = safeReturnTo(returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`, origin);
    const { error } = await authClient.signIn.social({
      provider: 'central-identity',
      callbackURL: destination ? `${origin}${destination}` : origin,
      errorCallbackURL: `${origin}/account/identity?error=login`,
    });
    if (error) flash(error.message || 'Central sign-in failed');
  }


  function toggleAdmin() {
    adminMode.value = !adminMode.value;
  }

  return {
    signedIn: readonly(signedIn),
    user: readonly(user),
    adminMode: readonly(adminMode),
    sessionReady: readonly(sessionReady),
    signInCentral,
    signOut: authSignOut,
    toggleAdmin,
  };
});
function safeReturnTo(destination: string | null, origin: string): string | null {
  if (!destination?.startsWith('/') || destination.startsWith('//') || destination.includes('\\')) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(destination);
    const url = new URL(destination, origin);
    if (
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      hasControlCharacters(decoded) ||
      url.origin !== origin ||
      url.pathname.startsWith('//')
    ) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

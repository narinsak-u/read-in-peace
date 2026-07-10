import { defineStore } from 'pinia';
import { shallowRef, watch } from 'vue';
import { authClient, signIn, signUp, signOut } from '~/lib/auth-client';
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
  const loading = shallowRef(false);
  const showAuthModal = ref(false);
  const onAuthSuccess = shallowRef<(() => void) | null>(null);
  const { flash } = useFlash();

  const session = authClient.useSession();

  watch(session, (val) => {
    if (val?.data?.user) {
      user.value = val.data.user;
      signedIn.value = true;
    } else {
      user.value = null;
      signedIn.value = false;
    }
  }, { immediate: true });

  function openAuthModal(onSuccess?: () => void) {
    if (onSuccess) onAuthSuccess.value = onSuccess;
    showAuthModal.value = true;
  }

  function closeAuthModal() {
    showAuthModal.value = false;
    onAuthSuccess.value = null;
  }

  async function authSignIn(email: string, password: string) {
    loading.value = true;
    try {
      const { data, error } = await signIn.email({ email, password });
      if (error) throw error;
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
        flash('Signed in successfully');
        const callback = onAuthSuccess.value;
        closeAuthModal();
        callback?.();
      }
    } catch (err: any) {
      signedIn.value = false;
      user.value = null;
      flash(err?.message || err?.data?.message || 'Failed to sign in');
    } finally {
      loading.value = false;
    }
  }

  async function authSignUp(name: string, email: string, password: string) {
    loading.value = true;
    try {
      const { data, error } = await signUp.email({ name, email, password });
      if (error) throw error;
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
        flash('Account created successfully');
        const callback = onAuthSuccess.value;
        closeAuthModal();
        callback?.();
      }
    } catch (err: any) {
      signedIn.value = false;
      user.value = null;
      flash(err?.message || err?.data?.message || 'Failed to create account');
    } finally {
      loading.value = false;
    }
  }

  async function authSignOut() {
    await signOut();
    signedIn.value = false;
    user.value = null;
    flash('Signed out');
  }

  function toggleAdmin() {
    adminMode.value = !adminMode.value;
  }

  return {
    signedIn: readonly(signedIn),
    user: readonly(user),
    adminMode: readonly(adminMode),
    loading: readonly(loading),
    showAuthModal,
    signIn: authSignIn,
    signUp: authSignUp,
    signOut: authSignOut,
    toggleAdmin,
    openAuthModal,
    closeAuthModal,
  };
});

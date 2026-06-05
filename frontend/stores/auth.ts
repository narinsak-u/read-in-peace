import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { authClient, signIn, signUp, signOut } from '~/lib/auth-client';

export interface User {
  name: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const signedIn = ref(false);
  const user = ref<User | null>(null);
  const adminMode = ref(false);
  const loading = ref(false);

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

  async function authSignIn(email: string, password: string) {
    loading.value = true;
    try {
      const { data, error } = await signIn.email({ email, password });
      if (error) throw error;
      if (data?.user) {
        user.value = data.user;
        signedIn.value = true;
        toast.success('Signed in successfully');
      }
    } catch {
      signedIn.value = false;
      user.value = null;
      toast.error('Failed to sign in');
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
        toast.success('Account created successfully');
      }
    } catch {
      signedIn.value = false;
      user.value = null;
      toast.error('Failed to create account');
    } finally {
      loading.value = false;
    }
  }

  async function authSignOut() {
    await signOut();
    signedIn.value = false;
    user.value = null;
    toast.success('Signed out');
  }

  function toggleAdmin() {
    adminMode.value = !adminMode.value;
  }

  return {
    signedIn,
    user,
    adminMode,
    loading,
    signIn: authSignIn,
    signUp: authSignUp,
    signOut: authSignOut,
    toggleAdmin,
  };
});

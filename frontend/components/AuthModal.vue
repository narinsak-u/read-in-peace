<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const emit = defineEmits<{
  close: [];
}>();

const auth = useAuthStore();
const router = useRouter();

const tab = shallowRef<'sign-in' | 'sign-up'>('sign-in');
const email = shallowRef('');
const password = shallowRef('');
const name = shallowRef('');
const error = shallowRef('');
const submitting = shallowRef(false);

async function handleSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    if (tab.value === 'sign-in') {
      await auth.signIn(email.value, password.value);
    } else {
      await auth.signUp(name.value, email.value, password.value);
    }
    emit('close');
    router.push('/feed');
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Something went wrong';
  } finally {
    submitting.value = false;
  }
}

function switchTab(t: 'sign-in' | 'sign-up') {
  tab.value = t;
  error.value = '';
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-2xl"
    >
      <div class="mb-6 text-center">
        <p class="text-lg font-semibold tracking-tight">
          Read<span class="text-primary"> in </span>Pace
        </p>
      </div>

      <!-- Tabs -->
      <div class="mb-6 flex rounded-lg border border-border bg-muted p-1">
        <button
          @click="switchTab('sign-in')"
          class="flex-1 rounded-md px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
          :class="tab === 'sign-in' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        >
          Sign In
        </button>
        <button
          @click="switchTab('sign-up')"
          class="flex-1 rounded-md px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
          :class="tab === 'sign-up' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        >
          Sign Up
        </button>
      </div>

      <!-- Error -->
      <p
        v-if="error"
        class="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ error }}
      </p>

      <!-- Name field (sign-up only) -->
      <div v-if="tab === 'sign-up'" class="mb-4">
        <label class="mb-1 block text-sm font-medium text-muted-foreground">Name</label>
        <input
          v-model="name"
          type="text"
          placeholder="Alex Rivera"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
        <input
          v-model="email"
          type="email"
          placeholder="alex@example.com"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Password -->
      <div class="mb-6">
        <label class="mb-1 block text-sm font-medium text-muted-foreground">Password</label>
        <input
          v-model="password"
          type="password"
          placeholder="At least 8 characters"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <!-- Submit -->
      <button
        @click="handleSubmit"
        :disabled="submitting"
        class="w-full rounded-lg bg-foreground px-4 py-2 cursor-pointer text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {{ submitting ? 'Please wait...' : tab === 'sign-in' ? 'Sign in' : 'Create account' }}
      </button>

      <!-- Switch tab -->
      <p class="mt-4 text-center text-sm text-muted-foreground">
        <template v-if="tab === 'sign-in'">
          Don't have an account?
          <button @click="switchTab('sign-up')" class="font-medium cursor-pointer text-primary hover:underline">
            Sign up
          </button>
        </template>
        <template v-else>
          Already have an account?
          <button @click="switchTab('sign-in')" class="font-medium text-primary cursor-pointer hover:underline">
            Sign in
          </button>
        </template>
      </p>
    </div>
  </div>
</template>

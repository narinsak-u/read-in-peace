<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const emit = defineEmits<{
  close: [];
}>();

const auth = useAuthStore();

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
    class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-sm border border-border bg-background p-8"
    >
      <div class="mb-6 text-center">
        <h2 class="text-lg font-semibold tracking-tight">
          Read<span class="text-primary"> in </span>Pace
        </h2>
      </div>

      <!-- Tabs -->
      <div class="mb-6 flex rounded-sm border border-border bg-muted p-1">
        <button
          @click="switchTab('sign-in')"
          class="flex-1 rounded-sm px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
          :class="tab === 'sign-in' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        >
          Sign In
        </button>
        <button
          @click="switchTab('sign-up')"
          class="flex-1 rounded-sm px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
          :class="tab === 'sign-up' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        >
          Sign Up
        </button>
      </div>

      <!-- Error -->
      <p
        v-if="error"
        class="mb-4 rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ error }}
      </p>

      <!-- Name field (sign-up only) -->
      <div v-if="tab === 'sign-up'" class="mb-4">
        <label class="mb-1 block font-mono text-sm font-medium text-muted-foreground">Name</label>
        <input
          v-model="name"
          type="text"
          placeholder="Alex Rivera"
          class="w-full rounded-sm border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <!-- Email -->
      <div class="mb-4">
        <label class="mb-1 block font-mono text-sm font-medium text-muted-foreground">Email</label>
        <input
          v-model="email"
          type="email"
          placeholder="alex@example.com"
          class="w-full rounded-sm border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <!-- Password -->
      <div class="mb-6">
        <label class="mb-1 block font-mono text-sm font-medium text-muted-foreground">Password</label>
        <input
          v-model="password"
          type="password"
          placeholder="At least 8 characters"
          class="w-full rounded-sm border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <!-- Submit -->
      <Button
        variant="archival"
        class="w-full"
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? 'Please wait...' : tab === 'sign-in' ? 'Sign in' : 'Create account' }}
      </Button>

      <!-- Switch tab -->
      <p class="mt-4 text-center text-sm text-muted-foreground">
        <template v-if="tab === 'sign-in'">
          Don't have an account?
          <Button variant="archivalGhost" size="sm" @click="switchTab('sign-up')">
            Sign up
          </Button>
        </template>
        <template v-else>
          Already have an account?
          <Button variant="archivalGhost" size="sm" @click="switchTab('sign-in')">
            Sign in
          </Button>
        </template>
      </p>
    </div>
  </div>
</template>

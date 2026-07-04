<script setup lang="ts">
import { Button } from "~/components/ui/button";

defineProps<{
  tab: "sign-in" | "sign-up";
  error: string;
  submitting: boolean;
}>();

const email = defineModel<string>("email");
const password = defineModel<string>("password");
const name = defineModel<string>("name");

const emit = defineEmits<{
  submit: [];
  "switch-tab": [tab: "sign-in" | "sign-up"];
}>();
</script>

<template>
  <div
    class="w-full max-w-sm border border-border bg-background p-6 shadow-2xl"
    @mousedown.stop
  >
    <div class="mb-6 text-center">
      <p
        class="font-mono text-[10px] uppercase tracking-widest text-primary my-4"
      >
        Reader access
      </p>
      <h2 class="mt-1 font-display text-3xl tracking-tight">
        Read<span class="text-primary"> in </span>Peace
      </h2>
      <p class="mt-2 text-sm text-muted-foreground">
        {{
          tab === "sign-in"
            ? "Welcome back to the stacks."
            : "Join the library."
        }}
      </p>
    </div>

    <div class="mb-6 flex rounded-sm border border-border bg-muted p-1">
      <button
        class="flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
        :class="
          tab === 'sign-in'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="emit('switch-tab', 'sign-in')"
      >
        Sign In
      </button>
      <button
        class="flex-1 rounded-sm px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
        :class="
          tab === 'sign-up'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="emit('switch-tab', 'sign-up')"
      >
        Sign Up
      </button>
    </div>

    <p
      v-if="error"
      class="mb-4 rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ error }}
    </p>

    <div v-if="tab === 'sign-up'" class="mb-5">
      <label
        class="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        Name
      </label>
      <input
        v-model="name"
        type="text"
        placeholder="Alex Rivera"
        class="w-full rounded-sm border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <div class="mb-5">
      <label
        class="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        Email
      </label>
      <input
        v-model="email"
        type="email"
        placeholder="alex@example.com"
        autofocus
        class="w-full rounded-sm border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <div class="mb-6">
      <label
        class="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        Password
      </label>
      <input
        v-model="password"
        type="password"
        placeholder="At least 8 characters"
        class="w-full rounded-sm border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
      />
    </div>

    <Button
      variant="archival"
      class="w-full tracking-widest uppercase cursor-pointer"
      :disabled="submitting"
      @click="emit('submit')"
    >
      {{
        submitting
          ? "Please&nbsp;wait\u2026"
          : tab === "sign-in"
            ? "Sign in"
            : "Create account"
      }}
    </Button>

    <p class="mt-5 text-center text-sm text-muted-foreground">
      <template v-if="tab === 'sign-in'">
        Don&rsquo;t have an account?
        <Button
          class="cursor-pointer text-primary"
          variant="archivalGhost"
          size="sm"
          @click="emit('switch-tab', 'sign-up')"
        >
          Sign up
        </Button>
      </template>
      <template v-else>
        Already have an account?
        <Button
          class="cursor-pointer text-primary"
          variant="archivalGhost"
          size="sm"
          @click="emit('switch-tab', 'sign-in')"
        >
          Sign in
        </Button>
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { onClickOutside } from '@vueuse/core';
import { Button } from '~/components/ui/button';

const auth = useAuthStore();

const show = ref(false);
const menuRef = ref<HTMLElement | null>(null);

onClickOutside(menuRef, () => { show.value = false; });

const initials = computed(() => {
  if (!auth.user?.name) return '';
  return auth.user.name.slice(0, 2).toUpperCase();
});

function toggle() {
  if (auth.signedIn) {
    show.value = !show.value;
  } else {
    auth.openAuthModal();
  }
}

function signOut() {
  auth.signOut();
  show.value = false;
}
</script>

<template>
  <div ref="menuRef" class="relative">
    <Button
      size="icon"
      variant="archival"
      :aria-label="auth.signedIn ? 'Open profile menu' : 'Sign in'"
      class="rounded-full text-xs italic cursor-pointer"
      @click="toggle"
    >
      {{ auth.signedIn ? initials : '?' }}
    </Button>
    <div
      v-if="show && auth.signedIn"
      class="absolute right-0 top-full z-50 mt-2 w-48 rounded-sm border border-border bg-white p-2 shadow-lg"
    >
      <p class="px-3 py-2 text-sm font-medium">{{ auth.user?.name }}</p>
      <p class="px-3 pb-2 text-xs text-muted-foreground">{{ auth.user?.email }}</p>
      <hr class="border-border" />
      <Button variant="archivalGhost" size="sm" class="w-full justify-start cursor-pointer" @click="signOut">Sign out</Button>
    </div>
  </div>
</template>

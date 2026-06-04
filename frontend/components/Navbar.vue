<script setup lang="ts">
import {
  Rss,
  LayoutDashboard,
  User,
  LogOut,
  LogIn,
  Shield,
} from "lucide-vue-next";
import { useAuthStore } from "~/stores/auth";

const auth = useAuthStore();
const open = ref(false);
const router = useRouter();

function navigate(path: string) {
  open.value = false;
  router.push(path);
}
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 md:px-0"
    >
      <NuxtLink to="/" class="text-lg font-semibold tracking-tight">
        Read<span class="text-primary"> in </span>Pace
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <NuxtLink
          to="/feed"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <Rss class="h-4 w-4" /> Feed
        </NuxtLink>
        <NuxtLink
          to="/dashboard"
          class="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <LayoutDashboard class="h-4 w-4" /> My Dashboard
        </NuxtLink>

        <div class="relative ml-2">
          <button
            @click="open = !open"
            @blur="setTimeout(() => (open = false), 150)"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-border transition-transform hover:scale-105"
            aria-label="Profile menu"
          >
            <span v-if="auth.signedIn" class="text-sm font-semibold">
              {{
                auth.username
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
              }}
            </span>
            <User v-else class="h-4 w-4" />
          </button>
          <div
            v-if="open"
            class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-popover p-2 shadow-lg"
          >
            <template v-if="auth.signedIn">
              <div class="px-3 py-2">
                <p class="text-sm font-medium">{{ auth.username }}</p>
                <p class="text-xs text-muted-foreground">alex@readinpace.com</p>
              </div>
              <div class="my-1 h-px bg-border" />
              <button
                @mousedown="navigate('/dashboard')"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <LayoutDashboard class="h-4 w-4" /> Dashboard
              </button>
              <button
                @mousedown="auth.toggleAdmin()"
                class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <span class="flex items-center gap-2"
                  ><Shield class="h-4 w-4" /> Admin mode</span
                >
                <span
                  class="relative h-4 w-7 rounded-full transition-colors"
                  :class="
                    auth.adminMode ? 'bg-primary' : 'bg-muted-foreground/30'
                  "
                >
                  <span
                    class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
                    :class="auth.adminMode ? 'left-3.5' : 'left-0.5'"
                  />
                </span>
              </button>
              <button
                @mousedown="auth.toggleAuth()"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                <LogOut class="h-4 w-4" /> Sign out
              </button>
            </template>
            <template v-else>
              <button
                @mousedown="auth.toggleAuth()"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <LogIn class="h-4 w-4" /> Sign in
              </button>
            </template>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>

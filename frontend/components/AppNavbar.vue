<script setup lang="ts">
import {
  User,
  LogOut,
  Shield,
  Search,
} from 'lucide-vue-next';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const open = shallowRef(false);
const dropdownRef = shallowRef<HTMLElement | null>(null);
const buttonRef = shallowRef<HTMLElement | null>(null);
const router = useRouter();
const route = useRoute();

function onClickOutside(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node;
  if (dropdownRef.value?.contains(target) || buttonRef.value?.contains(target)) return;
  open.value = false;
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));

const userInitials = computed(() => {
  if (!auth.user) return '';
  return auth.user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('');
});

function navigate(path: string) {
  open.value = false;
  router.push(path);
}

const isActive = (path: string): boolean => route.path.startsWith(path);
</script>

<template>
  <nav
    aria-label="Primary navigation"
    class="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
  >
    <div class="flex items-center gap-8">
      <NuxtLink to="/home" class="font-serif text-xl font-bold italic tracking-tight text-primary">
        Read<span class="text-foreground"> in </span>Pace
      </NuxtLink>
      <div class="hidden items-center gap-6 text-xs font-medium uppercase tracking-wider text-muted-foreground md:flex">
        <NuxtLink
          to="/home"
          class="transition-colors hover:text-foreground"
          :class="isActive('/home') ? 'border-b border-primary text-foreground' : ''"
        >
          Home
        </NuxtLink>
        <NuxtLink
          to="/explore"
          class="transition-colors hover:text-foreground"
          :class="isActive('/explore') ? 'border-b border-primary text-foreground' : ''"
        >
          Explore
        </NuxtLink>
        <NuxtLink
          to="/shelf"
          class="transition-colors hover:text-foreground"
          :class="isActive('/shelf') ? 'border-b border-primary text-foreground' : ''"
        >
          Shelf
        </NuxtLink>
        <NuxtLink
          to="/social"
          class="transition-colors hover:text-foreground"
          :class="isActive('/social') ? 'border-b border-primary text-foreground' : ''"
        >
          Social
        </NuxtLink>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <label class="relative hidden sm:block">
        <span class="sr-only">Search books</span>
        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search titles, authors..."
          class="w-56 rounded-sm border-0 bg-input py-2 pl-9 pr-3 text-sm placeholder-muted-foreground focus:ring-1 focus:ring-ring lg:w-64"
        />
      </label>
      <CartIcon />
      <div class="relative">
        <button
          ref="buttonRef"
          @click="open = !open"
          class="flex h-9 w-9 items-center cursor-pointer justify-center rounded-sm bg-transparent text-muted-foreground transition-colors hover:text-primary"
          aria-label="Profile menu"
        >
          <span v-if="auth.signedIn && auth.user" class="text-sm font-semibold">
            {{ userInitials }}
          </span>
          <User v-else class="h-4 w-4" />
        </button>
        <div
          v-if="open"
          ref="dropdownRef"
          class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-border bg-card p-2 shadow-md"
        >
          <template v-if="auth.signedIn">
            <div class="px-3 py-2">
              <p class="text-sm font-medium">{{ auth.user?.name }}</p>
              <p class="text-xs text-muted-foreground">{{ auth.user?.email }}</p>
            </div>
            <div class="my-1 h-px bg-border" />
            <Button
              variant="archivalGhost"
              class="w-full justify-start"
              @mousedown="navigate('/shelf')"
            >
              Shelf
            </Button>
            <Button
              variant="archivalGhost"
              class="w-full justify-between"
              @mousedown="auth.toggleAdmin()"
            >
              <span class="flex items-center gap-2"><Shield class="h-4 w-4" /> Admin mode</span>
              <span
                class="relative h-4 w-7 rounded-full transition-colors"
                :class="auth.adminMode ? 'bg-primary' : 'bg-muted-foreground/30'"
              >
                <span
                  class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
                  :class="auth.adminMode ? 'left-3.5' : 'left-0.5'"
                />
              </span>
            </Button>
            <Button
              variant="archivalGhost"
              class="w-full justify-start text-destructive"
              @mousedown="auth.signOut()"
            >
              <LogOut class="h-4 w-4" /> Sign out
            </Button>
          </template>
          <template v-else>
            <Button
              variant="archivalGhost"
              class="w-full justify-start"
              @mousedown="auth.openAuthModal()"
            >
              Sign in
            </Button>
          </template>
        </div>
      </div>
    </div>
  </nav>
  <AuthModal v-if="auth.showAuthModal" @close="auth.closeAuthModal()" />
</template>

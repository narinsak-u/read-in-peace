<script setup lang="ts">
import { Home, Library, MessageCircle, Settings, User } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useAuthStore } from "~/stores/auth";
import { useChatStore } from "~/stores/chat";
import { useConversations } from "~/composables/useConversations";

const auth = useAuthStore();
const chat = useChatStore();
const { unreadCount } = useConversations();
</script>

<template>
  <div
    class="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-background/10 bg-foreground px-6 py-1 text-background shadow-2xl"
  >
    <Button variant="archivalDock" @click="navigateTo('/feed')">
      <Home /><span class="font-mono text-[8px] uppercase opacity-60">
        Home
      </span>
    </Button>
    <Button variant="archivalDock" @click="navigateTo('/dashboard')">
      <Library /><span class="font-mono text-[8px] uppercase opacity-60">
        Shelf
      </span>
    </Button>
    <Button variant="archivalDock" class="relative" @click="chat.toggle()">
      <MessageCircle />
      <span class="font-mono text-[8px] uppercase opacity-60"> Chat </span>
      <span
        v-if="unreadCount > 0"
        class="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground"
      >
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </span>
    </Button>
    <Button
      variant="archivalDock"
      @click="navigateTo(auth.user?.id ? `/profile/${auth.user.id}` : '/feed')"
    >
      <User /><span class="font-mono text-[8px] uppercase opacity-60">
        Profile
      </span>
    </Button>
    <Button variant="archivalDock" @click="navigateTo('/plans')">
      <Settings /><span class="font-mono text-[8px] uppercase opacity-60">
        Plans
      </span>
    </Button>
  </div>
</template>

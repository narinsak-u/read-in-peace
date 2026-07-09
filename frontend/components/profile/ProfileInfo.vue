<script setup lang="ts">
import { Calendar, MessageCircle, UserPlus } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import type { ProfileUser } from "~/types/profile";

defineProps<{
  user: ProfileUser;
}>();

const { flash } = useFlash();

const bio = ref(
  "Avid reader and collector of rare editions. I spend most weekends curled up with a good mystery or a thick work of historical fiction.",
);

const plan = ref("Curator");

const lastActiveLabel = ref("2hr ago");

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function comingSoon() {
  flash("The feature is coming soon!");
}
</script>

<template>
  <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
    <div
      class="mx-auto flex size-45 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-3xl font-serif font-bold text-primary-foreground sm:mx-0"
    >
      <img
        v-if="user.image"
        :src="user.image"
        :alt="user.name"
        class="size-full object-cover"
      />
      <span v-else>{{ initials(user.name) }}</span>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        <h1 class="font-serif text-3xl font-bold tracking-tight">
          {{ user.name.toUpperCase() }}
        </h1>
        <span
          class="inline-flex h-6 items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[10px] font-medium uppercase tracking-wider text-primary"
        >
          {{ plan }}
        </span>
      </div>
      <p
        class="flex flex-col items-start justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start"
      >
        <p class="text-sm mb-2 leading-relaxed text-muted-foreground max-w-xl">
          {{ bio }}
        </p>
        <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar class="size-3.5" />
          Member since {{ formatDate(user.createdAt) }}
        </p>
        <p class="text-xs text-muted-foreground/60">
          Active {{ lastActiveLabel }}
        </p>
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-2 sm:self-start">
      <Button variant="archival" size="sm" @click="comingSoon">
        <UserPlus class="mr-1.5 size-4" />
        Follow
      </Button>
      <Button variant="archivalOutline" size="sm" @click="comingSoon">
        <MessageCircle class="mr-1.5 size-4" />
        Message
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Share2 } from 'lucide-vue-next';

const showShare = shallowRef(false);
</script>

<template>
  <div class="relative">
    <button
      @click="showShare = !showShare"
      class="flex h-11 w-11 items-center cursor-pointer justify-center rounded-lg border border-border transition-colors hover:bg-muted"
      :class="showShare ? 'bg-muted' : ''"
    >
      <Share2 class="h-4 w-4" />
    </button>
    <div
      v-if="showShare"
      class="absolute left-full top-0 ml-3 flex flex-col gap-1 rounded-lg border border-border/60 bg-card p-2 shadow-md whitespace-nowrap"
    >
      <SocialShare
        v-for="network in ['facebook', 'x', 'linkedin', 'reddit', 'threads', 'whatsapp']"
        :key="network"
        :network="network"
        :styled="true"
        @click="showShare = false"
      />
    </div>
  </div>
</template>

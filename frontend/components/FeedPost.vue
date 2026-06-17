<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next';
import { Button } from '~/components/ui/button';

defineProps<{
  initials: string;
  name: string;
  time: string;
}>();

const replyOpen = ref(false);
const replyText = ref('');
const liked = ref(false);
const likeCount = ref(12);
const flashProp = inject<(msg: string) => void>('flash')!;

function toggleLike() {
  liked.value = !liked.value;
  likeCount.value += liked.value ? 1 : -1;
}

function postReply() {
  replyOpen.value = false;
  replyText.value = '';
  flashProp('Reply posted.');
}
</script>

<template>
  <article class="border-l border-foreground/5 pl-4">
    <div class="mb-1 flex items-center gap-2">
      <span class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold">{{ initials }}</span>
      <span class="text-[11px] font-bold uppercase">{{ name }}</span>
      <span class="font-mono text-[10px] text-muted-foreground">{{ time }}</span>
    </div>
    <p class="text-sm leading-snug text-foreground/80">
      <slot />
    </p>
    <div class="mt-2 flex items-center gap-3">
      <div>
        <Button variant="archivalGhost" size="sm" @click="replyOpen = !replyOpen"><MessageCircle /> Reply</Button>
        <div v-if="replyOpen" class="mt-2">
          <textarea
            v-model="replyText"
            rows="2"
            placeholder="Write your reply..."
            class="w-full resize-none rounded-sm border border-border bg-card p-2 text-xs focus:ring-1 focus:ring-ring"
          />
          <div class="mt-1 flex justify-end gap-1">
            <Button size="sm" variant="archivalGhost" @click="replyOpen = false; replyText = ''">Cancel</Button>
            <Button size="sm" variant="archival" :disabled="!replyText.trim()" @click="postReply">Post</Button>
          </div>
        </div>
      </div>
      <Button variant="archivalGhost" size="sm" @click="toggleLike" :class="liked ? 'text-primary' : ''">
        {{ liked ? 'Liked' : 'Like' }} ({{ likeCount }})
      </Button>
    </div>
  </article>
</template>

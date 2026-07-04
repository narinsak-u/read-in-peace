<script setup lang="ts">
import { MessageCircle } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { useAuthStore } from "~/stores/auth";

interface Reply {
  name: string;
  text: string;
  pending?: boolean;
}

const props = defineProps<{
  initials: string;
  name: string;
  time: string;
  likeCount: number;
  liked?: boolean;
  submitting?: boolean;
  replies?: readonly Reply[];
  submitReply: (text: string) => Promise<boolean>;
  toggleLike: () => Promise<void>;
}>();

const auth = useAuthStore();
const replyOpen = shallowRef(false);
const replyText = shallowRef("");
const liked = shallowRef(props.liked ?? false);
const localLikeCount = shallowRef(props.likeCount);
const showAllReplies = shallowRef(false);
const optimisticReplies = ref<Reply[]>([]);

const mergedReplies = computed<Reply[]>(() => [
  ...(props.replies ?? []),
  ...optimisticReplies.value,
]);

const visibleReplies = computed<Reply[]>(() => {
  const list = mergedReplies.value;
  if (showAllReplies.value || list.length <= 3) return list;
  return list.slice(0, 3);
});

const hiddenReplyCount = computed<number>(() => {
  const list = mergedReplies.value;
  if (showAllReplies.value || list.length <= 3) return 0;
  return list.length - 3;
});

watch(
  () => (props.replies ?? []).length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      optimisticReplies.value = [];
    }
  },
);

async function onToggleLike() {
  if (!auth.signedIn) {
    auth.openAuthModal();
    return;
  }
  liked.value = !liked.value;
  localLikeCount.value += liked.value ? 1 : -1;

  try {
    await props.toggleLike();
  } catch {
    liked.value = !liked.value;
    localLikeCount.value += liked.value ? -1 : 1;
  }
}

function toggleReply() {
  replyOpen.value = !replyOpen.value;
}

async function postReply() {
  if (!replyText.value.trim() || props.submitting) return;
  const text = replyText.value.trim();
  const authorName = auth.user?.name ?? "You";
  const optimistic: Reply = { name: authorName, text, pending: true };
  optimisticReplies.value = [...optimisticReplies.value, optimistic];
  replyText.value = "";

  const success = await props.submitReply(text);

  if (success) {
    replyOpen.value = false;
    optimisticReplies.value = optimisticReplies.value.map((r) =>
      r.pending ? { ...r, pending: false } : r,
    );
  } else {
    optimisticReplies.value = optimisticReplies.value.filter(
      (r) => r !== optimistic,
    );
  }
}
</script>

<template>
  <article class="border-l border-foreground/5 pl-4">
    <div class="mb-1 flex items-center gap-2">
      <span
        class="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold"
      >
        {{ initials }}
      </span>
      <span class="text-[11px] font-bold uppercase">{{ name }}</span>
      <span class="font-mono text-[10px] text-muted-foreground">
        {{ time }}
      </span>
    </div>
    <p class="text-sm leading-snug text-foreground/80">
      <slot />
    </p>

    <div class="mt-2 flex items-center gap-3">
      <div class="w-full">
        <div class="flex">
          <Button variant="archivalGhost" size="sm" @click="toggleReply">
            <MessageCircle />
            Reply ({{ mergedReplies.length }})
          </Button>
          <Button
            variant="archivalGhost"
            size="sm"
            @click="onToggleLike"
            :class="liked ? 'text-primary' : ''"
          >
            {{ liked ? "Liked" : "Like" }} ({{ localLikeCount }})
          </Button>
        </div>

        <div v-if="replyOpen" class="mt-2">
          <!-- items -->
          <div
            v-if="replies && replies.length > 0"
            class="mt-2 space-y-1 border-l border-primary/20 pl-3"
          >
            <p
              v-for="(reply, i) in visibleReplies"
              :key="i"
              class="text-xs leading-snug text-muted-foreground"
              :class="reply.pending ? 'opacity-60' : ''"
            >
              <span class="ml-1 text-foreground/70">
                {{ `${reply.text} — ${reply.name}` }}
              </span>
              <span
                v-if="reply.pending"
                class="ml-1 font-mono text-[10px] text-muted-foreground"
              >
                sending…
              </span>
            </p>
            <button
              v-if="hiddenReplyCount > 0"
              type="button"
              class="font-mono text-[10px] text-primary hover:underline"
              @click="showAllReplies = true"
            >
              Show {{ hiddenReplyCount }} more
              {{ hiddenReplyCount === 1 ? "reply" : "replies" }}
            </button>
          </div>

          <!-- input: hidden if user is not signed in -->
          <template v-if="auth.signedIn">
            <textarea
              v-model="replyText"
              rows="2"
              placeholder="Write your reply..."
              class="w-full mt-2 resize-none rounded-sm border border-border bg-card p-2 text-xs focus:ring-1 focus:ring-ring"
            />
            <div class="mt-1 flex justify-end gap-1">
              <Button
                size="sm"
                variant="archivalGhost"
                @click="
                  replyOpen = false;
                  replyText = '';
                "
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="archival"
                :disabled="!replyText.trim() || submitting"
                @click="postReply"
              >
                Post
              </Button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Comment } from "~/stores/books";

const props = defineProps<{
  comments: Comment[];
  signedIn: boolean;
  showCommentForm: boolean;
}>();

const emit = defineEmits<{
  submit: [text: string];
}>();

const draft = shallowRef("");

function handleSubmit() {
  if (!draft.value.trim()) return;
  emit("submit", draft.value.trim());
  draft.value = "";
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}
</script>

<template>
  <section class="mt-12 border-t border-border pt-10">
    <h2 class="text-2xl font-semibold tracking-tight">Comments</h2>

    <form
      v-if="signedIn && showCommentForm"
      @submit.prevent="handleSubmit"
      class="mt-6 rounded-lg border border-border bg-card p-4"
    >
      <textarea
        v-model="draft"
        placeholder="Leave a comment"
        rows="3"
        class="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <div class="flex justify-end">
        <button
          type="submit"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:-translate-y-px"
        >
          Post comment
        </button>
      </div>
    </form>

    <div class="mt-8 space-y-2">
      <div
        v-for="c in comments"
        :key="c.id"
        class="rounded-lg border border-border/60 bg-card px-4 py-2 shadow-sm"
      >
        <div class="flex gap-4">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
          >
            {{ getInitials(c.user.name) }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-xs">{{ c.user.name }}</p>
              <span class="text-xs text-muted-foreground">
                {{ new Date(c.createdAt).toLocaleDateString() }}
              </span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{{ c.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

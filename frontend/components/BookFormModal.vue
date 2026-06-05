<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useBooksStore } from "~/stores/books";

const props = withDefaults(
  defineProps<{
    book?: {
      id: string;
      title: string;
      author: string;
      price: string;
      cover: string;
      synopsis: string;
      category: string;
      trending: boolean;
    } | null;
  }>(),
  { book: null },
);

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const booksStore = useBooksStore();
const saving = shallowRef(false);
const error = shallowRef("");

const form = reactive({
  title: props.book?.title ?? "",
  author: props.book?.author ?? "",
  price: props.book?.price ?? "",
  cover: props.book?.cover ?? "",
  synopsis: props.book?.synopsis ?? "",
  category: props.book?.category ?? "Fiction",
  trending: props.book?.trending ?? false,
});

async function handleSubmit() {
  saving.value = true;
  error.value = "";
  try {
    if (props.book) {
      await booksStore.updateBook(props.book.id, form);
    } else {
      await booksStore.createBook(form);
    }
    emit("saved");
  } catch (e: any) {
    error.value = e?.message || "Something went wrong";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button
          @click="emit('close')"
          class="absolute right-4 top-4 cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <X class="h-4 w-4" />
        </button>

        <h2 class="text-xl font-semibold tracking-tight mb-6">
          {{ book ? "Edit Book" : "New Book" }}
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Title</label>
              <input v-model="form.title" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Author</label>
              <input v-model="form.author" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Price</label>
              <input v-model="form.price" type="number" step="0.01" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-medium">Category</label>
              <select v-model="form.category" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground">
                <option>Fiction</option>
                <option>How-to</option>
                <option>Manga</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Cover URL</label>
            <input v-model="form.cover" required class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">Synopsis</label>
            <textarea v-model="form.synopsis" rows="3" required class="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          </div>

          <label class="flex items-center gap-2 text-sm">
            <input v-model="form.trending" type="checkbox" class="rounded border-border" />
            Mark as trending
          </label>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              @click="emit('close')"
              class="rounded-lg border cursor-pointer border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-lg bg-foreground cursor-pointer px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {{ saving ? "Saving" : book ? "Save Changes" : "Create Book" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

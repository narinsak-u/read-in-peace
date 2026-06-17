<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { Button } from "~/components/ui/button";

defineProps<{
  page: number;
  totalPages: number;
  pageNumbers: number[];
}>();

const emit = defineEmits<{
  go: [p: number];
}>();

function goTo(p: number) {
  emit("go", p);
}
</script>

<template>
  <div
    v-if="totalPages > 1"
    class="mt-10 flex items-center justify-center gap-1"
  >
    <Button
      size="icon"
      variant="archivalGhost"
      :disabled="page <= 1"
      aria-label="Previous page"
      @click="goTo(page - 1)"
    >
      <ChevronLeft class="size-4" />
    </Button>

    <template v-for="n in pageNumbers" :key="n">
      <Button
        size="sm"
        :variant="n === page ? 'archival' : 'archivalGhost'"
        class="min-w-8 font-mono text-xs"
        @click="goTo(n)"
      >
        {{ n }}
      </Button>
    </template>

    <Button
      size="icon"
      variant="archivalGhost"
      :disabled="page >= totalPages"
      aria-label="Next page"
      @click="goTo(page + 1)"
    >
      <ChevronRight class="size-4" />
    </Button>

    <span class="ml-3 font-mono text-[10px] text-muted-foreground">
      Page {{ page }} of {{ totalPages }}
    </span>
  </div>
</template>

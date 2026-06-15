<script setup lang="ts">
import { useReadingGoalStore } from '~/stores/readingGoal';

const store = useReadingGoalStore();
const showInput = shallowRef(false);
const newGoal = shallowRef<number | null>(null);

onMounted(() => {
  store.fetchGoal();
});

async function handleSetGoal() {
  if (newGoal.value && newGoal.value > 0) {
    await store.setGoal(newGoal.value);
    showInput.value = false;
    newGoal.value = null;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="store.goal === 0 && !showInput" class="space-y-3">
      <p class="text-sm italic text-muted-foreground">Set a reading goal to get started.</p>
      <Button variant="archivalOutline" size="sm" @click="showInput = true">
        Set Goal
      </Button>
    </div>

    <div v-else-if="showInput" class="flex gap-2 items-end">
      <div>
        <label class="block text-xs text-muted-foreground mb-1">Books per year</label>
        <input
          v-model.number="newGoal"
          type="number"
          min="1"
          placeholder="50"
          class="w-24 rounded-sm border border-border bg-input px-3 py-1.5 text-sm focus:ring-1 focus:ring-ring"
          @keyup.enter="handleSetGoal"
        />
      </div>
      <Button variant="archival" size="sm" @click="handleSetGoal">Save</Button>
      <Button variant="archivalGhost" size="sm" @click="showInput = false">Cancel</Button>
    </div>

    <template v-else>
      <div class="flex items-baseline gap-2">
        <span class="font-serif text-4xl font-bold">{{ store.current }}</span>
        <span class="text-sm italic text-muted-foreground">of {{ store.goal }} books</span>
      </div>
      <div class="h-1 w-full bg-foreground/5">
        <div class="h-full bg-foreground" :style="{ width: store.progress + '%' }" />
      </div>
      <p class="text-[11px] leading-relaxed text-muted-foreground">
        <template v-if="store.current >= store.goal">
          You've reached your {{ store.year }} goal!
        </template>
        <template v-else>
          {{ store.behindMessage }}
        </template>
      </p>
    </template>
  </div>
</template>

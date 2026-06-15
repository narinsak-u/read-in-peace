import { defineStore } from 'pinia';
import { shallowRef, computed } from 'vue';

export const useReadingGoalStore = defineStore('readingGoal', () => {
  const goal = shallowRef<number>(0);
  const current = shallowRef<number>(0);
  const year = shallowRef<number>(new Date().getFullYear());

  const progress = computed(() =>
    goal.value > 0 ? Math.round((current.value / goal.value) * 100) : 0,
  );

  async function fetchGoal(): Promise<void> {
    try {
      const res = await $fetch<{ year: number; goal: number; current: number }>(
        '/api/user/reading-goal',
      );
      goal.value = res.goal;
      current.value = res.current;
      year.value = res.year;
    } catch {
      // not signed in — leave at defaults
    }
  }

  async function setGoal(g: number): Promise<void> {
    await $fetch('/api/user/reading-goal', {
      method: 'PUT',
      body: { goal: g },
    });
    goal.value = g;
    await fetchGoal();
  }

  function daysIntoYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  const behindMessage = computed(() => {
    if (goal.value === 0) return '';
    const dayOfYear = daysIntoYear();
    const expectedProgress = Math.round((dayOfYear / 365) * goal.value);
    const diff = expectedProgress - current.value;
    if (diff > 2) return `You are ${diff} books behind your ${year.value} reading goal. A short essay collection might be perfect this weekend.`;
    if (diff > 0) return `You're slightly behind pace for your ${year.value} goal.`;
    return `You're on track for your ${year.value} reading goal!`;
  });

  return { goal, current, year, progress, fetchGoal, setGoal, behindMessage };
});

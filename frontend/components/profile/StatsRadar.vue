<script setup lang="ts">
import { computed } from "vue";
import { Radar } from "vue-chartjs";
import {
  Chart as ChartJS,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { CategoryStat } from "~/types/profile";

ChartJS.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const props = withDefaults(
  defineProps<{
    categories: CategoryStat[];
  }>(),
  {},
);

const labels = computed(() => props.categories.map((c) => c.category));

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: "Borrowed",
      data: props.categories.map((c) => c.borrowCount),
      backgroundColor: "oklch(0.39 0.145 25 / 0.15)",
      borderColor: "oklch(0.39 0.145 25)",
      borderWidth: 2,
      pointBackgroundColor: "oklch(0.39 0.145 25)",
      pointBorderColor: "oklch(0.975 0.008 88)",
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: "Purchased",
      data: props.categories.map((c) => c.purchaseCount),
      backgroundColor: "oklch(0.55 0.09 55 / 0.15)",
      borderColor: "oklch(0.55 0.09 55)",
      borderWidth: 2,
      borderDash: [4, 3],
      pointBackgroundColor: "oklch(0.55 0.09 55)",
      pointBorderColor: "oklch(0.975 0.008 88)",
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "oklch(0.21 0 0)",
      titleFont: { family: "Inter, sans-serif", size: 12 },
      bodyFont: { family: "JetBrains Mono, monospace", size: 11 },
      padding: 10,
      cornerRadius: 2,
      displayColors: true,
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      grid: {
        color: "oklch(0.21 0 0 / 0.08)",
        lineWidth: 1,
      },
      angleLines: {
        color: "oklch(0.21 0 0 / 0.08)",
        lineWidth: 1,
      },
      pointLabels: {
        font: {
          family: "JetBrains Mono, monospace",
          size: 11,
        },
        color: "oklch(0.48 0.01 35)",
      },
      ticks: {
        display: false,
        stepSize: 1,
      },
    },
  },
}));

const maxBarValue = computed(() => {
  return Math.max(
    ...props.categories.flatMap((c) => [c.borrowCount, c.purchaseCount]),
    1,
  );
});

function barWidth(count: number): string {
  return `${(count / maxBarValue.value) * 100}%`;
}
</script>

<template>
  <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
    <div class="w-full max-w-xs shrink-0">
      <Radar :data="chartData" :options="chartOptions" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-4">
      <div v-for="cat in categories" :key="cat.category" class="space-y-1.5">
        <div class="flex items-baseline justify-between text-xs">
          <span class="font-serif font-medium text-foreground">
            {{ cat.category }}
          </span>
          <span class="font-mono text-muted-foreground">
            {{ cat.borrowCount }}b · {{ cat.purchaseCount }}p
          </span>
        </div>
        <div class="flex gap-1.5">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: barWidth(cat.borrowCount),
                background: 'oklch(0.39 0.145 25)',
              }"
            />
          </div>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: barWidth(cat.purchaseCount),
                background: 'oklch(0.55 0.09 55)',
              }"
            />
          </div>
        </div>
      </div>
      <div
        class="mt-2 flex items-center gap-5 border-t border-border pt-3 text-[11px]"
      >
        <span class="flex items-center gap-1.5">
          <span class="inline-block size-2 rounded-full bg-primary" />
          <span class="text-muted-foreground">Borrowed</span>
        </span>
        <span class="flex items-center gap-1.5">
          <span
            class="inline-block size-2 rounded-full"
            style="background: oklch(0.55 0.09 55)"
          />
          <span class="text-muted-foreground">Purchased</span>
        </span>
      </div>
    </div>
  </div>
</template>

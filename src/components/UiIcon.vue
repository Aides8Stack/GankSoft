<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 19 });
const paths: Record<string, string> = {
  grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
  home: "m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8",
  folder: "M3 7V4h6l2 3h10v14H3V7z",
  chevron: "m9 5 7 7-7 7",
  play: "m8 4 12 8-12 8V4z",
  book: "M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3V3zM12 5v17",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  bell: "M18 8a6 6 0 0 0-12 0v7l-2 3h16l-2-3V8M10 21h4",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  layout: "M12 3v6M5 15V9h14v6M3 15h4v6H3zM10 15h4v6h-4zM17 15h4v6h-4z",
  fit: "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8z",
  center: "M12 2v4M12 18v4M2 12h4M18 12h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  add: "M12 4v16M4 12h16",
  undo: "M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12",
  redo: "m16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12",
  detail: "M3 3h18v18H3zM14 3v18M17 8h1M17 12h1M17 16h1",
  save: "M4 3h13l4 4v14H3V3h1M7 3v6h9V3M7 21v-8h10v8",
  cards: "M5 3h14v18H5zM8 8h8M8 12h8M8 16h5",
  summary: "M4 3h16v18H4zM8 16v-4M12 16V8M16 16v-6",
  knowledge: "M12 7v4M5 16v-5h14v5M9 2h6v5H9zM2 16h6v6H2zM16 16h6v6h-6z",
  insights: "M3 3v18h18M7 16l4-6 4 3 6-9",
  exchange: "M3 7h17l-4-4M21 17H4l4 4",
  schedule: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.cards" />
  </svg>
</template>

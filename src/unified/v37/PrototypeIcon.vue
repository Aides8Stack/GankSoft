<script setup lang="ts">
// Trusted frozen-source SVG markup; no user content enters v-html.
withDefaults(defineProps<{name:string;size?:number}>(),{size:18});
const aliases:Record<string,string>={searchField:'search',add:'plus',summary:'grid',search:'filter',knowledge:'brain',insights:'chart',exchange:'copy',schedule:'clock',detail:'panel'};
const icons:Record<string,string>={
  "home": "<path d=\"m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><path d=\"M9 21v-8h6v8\"/>",
  "grid": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/>",
  "folder": "<path d=\"M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z\"/>",
  "cards": "<rect x=\"5\" y=\"4\" width=\"15\" height=\"17\" rx=\"2\"/><path d=\"M2 8V6a4 4 0 0 1 4-4h10M9 9h7M9 13h7M9 17h4\"/>",
  "play": "<path d=\"m8 5 11 7-11 7z\"/>",
  "list": "<path d=\"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01\"/>",
  "chart": "<path d=\"M3 3v18h18M7 16l4-5 4 3 6-8\"/>",
  "brain": "<path d=\"M12 5a4 4 0 0 0-7.5 2A4.5 4.5 0 0 0 5 15a3.5 3.5 0 0 0 7 1V5zm0 0a4 4 0 0 1 7.5 2A4.5 4.5 0 0 1 19 15a3.5 3.5 0 0 1-7 1\"/><path d=\"M8 9c0 2-2 2-2 4m10-4c0 2 2 2 2 4\"/>",
  "book": "<path d=\"M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zm0 0v15\"/>",
  "settings": "<path d=\"M10 2h4l.6 2.4 2.1 1.1 2.4-.8 2 3.5-1.9 1.7v2.3l1.9 1.7-2 3.5-2.4-.8-2.1 1.1L14 22h-4l-.6-2.4-2.1-1.1-2.4.8-2-3.5 1.9-1.7v-2.3L2.9 10l2-3.5 2.4.8 2.1-1.1z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "search": "<circle cx=\"10.8\" cy=\"10.8\" r=\"7.1\"/><path d=\"m16 16 5 5\"/>",
  "plus": "<path d=\"M12 4v16M4 12h16\"/>",
  "more": "<circle cx=\"5\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/>",
  "arrow": "<path d=\"M5 12h14m-7-7 7 7-7 7\"/>",
  "back": "<path d=\"M19 12H5m7-7-7 7 7 7\"/>",
  "down": "<path d=\"m6 9 6 6 6-6\"/>",
  "filter": "<path d=\"M3 6h18M7 12h10m-7 6h4\"/>",
  "copy": "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/>",
  "paste": "<path d=\"M9 5h8a2 2 0 0 1 2 2v14H5V7a2 2 0 0 1 2-2h2\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"4\" rx=\"1\"/><path d=\"M9 13h6m-3-3 3 3-3 3\"/>",
  "image": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"m21 16-6-6L5 21\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l4 2\"/>",
  "pause": "<path d=\"M8 5v14m8-14v14\"/>",
  "check": "<path d=\"m4 12 5 5L20 6\"/>",
  "close": "<path d=\"M5 5l14 14M19 5 5 19\"/>",
  "spark": "<path d=\"m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z\"/>",
  "upload": "<path d=\"M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4\"/>",
  "trash": "<path d=\"M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7M10 11v6m4-6v6\"/>",
  "chevron": "<path d=\"m9 6 6 6-6 6\"/>",
  "minus": "<path d=\"M4 12h16\"/>",
  "fit": "<path d=\"M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5M9 9h6v6H9z\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 1v5m0 12v5M1 12h5m12 0h5\"/>",
  "layout": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M10 3v18M10 10h11\"/>",
  "undo": "<path d=\"M9 6 4 11l5 5M4 11h10a6 6 0 0 1 0 12\"/>",
  "redo": "<path d=\"m15 6 5 5-5 5m5-5H10a6 6 0 0 0 0 12\"/>",
  "expand": "<path d=\"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 7l-4-4m14 4 4-4M7 17l-4 4m14-4 4 4\"/>",
  "collapse": "<path d=\"M3 10h7V3m11 7h-7V3M3 14h7v7m11-7h-7v7M4 4l6 6m10-6-6 6M4 20l6-6m10 6-6-6\"/>",
  "child": "<path d=\"M6 4v12h7m-7-6h5m-5-6h5M17 13v8m-4-4h8\"/><circle cx=\"6\" cy=\"4\" r=\"1.2\"/>",
  "sibling": "<path d=\"M5 5v14m0-11h6m-6 10h6m6-7v10m-4-5h8\"/><circle cx=\"5\" cy=\"5\" r=\"1.4\"/><circle cx=\"11\" cy=\"8\" r=\"1.4\"/><circle cx=\"11\" cy=\"18\" r=\"1.4\"/>",
  "panel": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M15 4v16M7 8h4M7 12h4\"/>",
  "fullscreen": "<path d=\"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5\"/>"
};
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="icons[aliases[name]??name]??icons.cards"/></template>

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
// Separate build: normal production app never imports or offers this validation page.
export default defineConfig({
  base: "./",
  plugins: [vue()],
  build: {
    // Keep fonts as same-origin files: the isolated page's CSP rejects data: fonts.
    assetsInlineLimit: 0,
    outDir: "dist/assets/editor-spike",
    emptyOutDir: true,
    rollupOptions: {
      input: [
        resolve("tools/editor-spike/index.html"),
        resolve("tools/card-draft-spike/index.html"),
        resolve("tools/review-spike/index.html"),
      ],
      output: { entryFileNames: "assets/[name]-[hash].js" },
    },
  },
});

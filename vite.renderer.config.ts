// import { defineConfig } from "vite";

// // https://vitejs.dev/config
// export default defineConfig({
//   css: {
//     postcss: "./postcss.config.js",
//   },
//   esbuild: {
//     jsx: "automatic",
//   },
//   define: {
//     global: "globalThis",
//   },
// });

import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig({
  css: {
    postcss: "./postcss.config.js",
  },
  esbuild: {
    jsx: "automatic",
  },
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

import { defineConfig } from "vite";

// Relative base so the bundle works when served from a DeWEB circuit container.
export default defineConfig({
  root: "frontend",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, target: "es2022" },
});

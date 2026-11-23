import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative paths: the site is served from a DeWEB name, not a fixed domain.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  build: { target: "es2022", assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});

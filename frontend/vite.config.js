import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    // Bumped because Recharts + React together still cross the default 500kB
    // even after splitting; chunks are gzip-compressed in flight so the
    // network cost is much smaller than the raw size suggests.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual vendor splits. Each chunk caches independently — a
        // Recharts update doesn't bust React, and vice versa. The lazy
        // route chunks (PlanPage, ImprovePage, etc.) automatically import
        // from these so they don't duplicate Recharts code.
        manualChunks: {
          react:    ["react", "react-dom"],
          recharts: ["recharts"],
        },
      },
    },
  },
});

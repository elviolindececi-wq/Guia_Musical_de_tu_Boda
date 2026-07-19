import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const normalizePath = (id = "") => id.replace(/\\/g, "/");

export default defineConfig({
  plugins: [react()],

  build: {
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = normalizePath(id);

          if (!path.includes("/node_modules/")) {
            return undefined;
          }

          if (
            path.includes("/node_modules/react/") ||
            path.includes("/node_modules/react-dom/") ||
            path.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          if (path.includes("/node_modules/@supabase/")) {
            return "supabase-vendor";
          }

          if (
            path.includes("/node_modules/react-phone-number-input/") ||
            path.includes("/node_modules/libphonenumber-js/")
          ) {
            return "phone-input-vendor";
          }

          return undefined;
        }
      }
    }
  }
});

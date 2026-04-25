import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@recuro/sdk": path.resolve(__dirname, "../../../sdk/src/index.ts"),
    },
  },
  define: { "process.env": {}, global: "globalThis" },
  server: { port: 3000 },
});

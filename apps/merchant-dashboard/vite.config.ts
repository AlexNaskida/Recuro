import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define:  { "process.env": {}, global: "globalThis" },
  optimizeDeps: {
    include: ["@coral-xyz/anchor", "@solana/web3.js", "@solana/spl-token"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-solana": ["@solana/web3.js", "@coral-xyz/anchor"],
          "vendor-ui":     ["recharts", "lucide-react"],
          "vendor-react":  ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  server: { port: 3001 },
});

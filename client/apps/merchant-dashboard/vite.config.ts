import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      "@privy-io/react-auth": path.resolve(
        __dirname,
        "../../../node_modules/@privy-io/react-auth",
      ),
    },
  },
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer", "js-sha3", "hash.js", "bech32"],
    exclude: ["@privy-io/react-auth"],
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
}));

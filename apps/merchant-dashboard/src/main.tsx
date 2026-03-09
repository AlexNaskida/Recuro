import "@/polyfills";
import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SolanaWalletProvider } from "./lib/wallet.tsx";

globalThis.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(
  <SolanaWalletProvider>
    <App />
  </SolanaWalletProvider>,
);

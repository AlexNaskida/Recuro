import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

import App from "./App";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./index.css";
import "@solana/wallet-adapter-react-ui/styles.css";

// ── React Query client ──────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:      30_000,   // 30 seconds
      refetchInterval: 60_000,  // poll every minute
      retry:           2,
      refetchOnWindowFocus: true,
    },
  },
});

// ── Solana wallet adapters ──────────────────────────────────────────────────
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_ENDPOINT ?? "https://api.devnet.solana.com";

// ── Mount ───────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConnectionProvider endpoint={RPC_ENDPOINT}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider delayDuration={200}>
                <App />
                <Toaster />
              </TooltipProvider>
            </QueryClientProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  </React.StrictMode>
);

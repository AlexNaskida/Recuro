import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import {
  defaultSolanaRpcsPlugin,
  toSolanaWalletConnectors,
} from "@privy-io/react-auth/solana";

const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID ?? "").trim();
const SOLANA_RPCS = defaultSolanaRpcsPlugin().getDefaultRpcs({
  appId: PRIVY_APP_ID,
});

function PrivyConfigError({ reason }: { reason: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#0b1220",
        color: "#e5e7eb",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          border: "1px solid #1f2937",
          borderRadius: "12px",
          background: "#111827",
          padding: "20px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "20px", color: "#f9fafb" }}>
          Privy Configuration Error
        </h1>
        <p style={{ marginTop: "10px", marginBottom: 0, color: "#d1d5db" }}>
          {reason}
        </p>
        <p style={{ marginTop: "10px", marginBottom: 0, color: "#9ca3af" }}>
          Set a valid app ID in <code>client/apps/merchant-dashboard/.env</code>
          :
        </p>
        <pre
          style={{
            marginTop: "10px",
            marginBottom: 0,
            padding: "12px",
            borderRadius: "8px",
            background: "#0f172a",
            color: "#d1fae5",
            overflowX: "auto",
          }}
        >
          {"VITE_PRIVY_APP_ID=your-privy-app-id"}
        </pre>
      </div>
    </div>
  );
}

// initialise ONCE outside the component — not on every render
const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID)
    return <PrivyConfigError reason="VITE_PRIVY_APP_ID is missing." />;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={import.meta.env.VITE_PRIVY_CLIENT_ID ?? ""}
      config={{
        appearance: {
          walletChainType: "solana-only",
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors, // ← this is what registers Phantom Solana
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        solana: {
          rpcs: SOLANA_RPCS,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

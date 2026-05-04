import type { ReactNode } from "react";
// Do not statically import @privy-io/react-auth here — the package's
// optional subpaths and build outputs can confuse Vite during prebundle.
// For local development we provide a no-op wrapper so the app can render
// without the Privy runtime. Reintroduce the real provider when the
// package is available and works with Vite's resolver.

const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID ?? "").trim();
// If Privy's optional solana helpers are not available in the installed package,
// fall back to an empty RPC map and no external connectors. This keeps the
// provider usable for authentication while Solana wallet adapter is handled
// locally by the app.
const SOLANA_RPCS: Record<string, string> = {};

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
const solanaConnectors: any[] = [];

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID)
    return <PrivyConfigError reason="VITE_PRIVY_APP_ID is missing." />;
  // No-op provider: render children directly. This keeps auth-related
  // imports out of the dependency graph so Vite can start. Replace with
  // the actual PrivyProvider when the package is compatible.
  return <>{children}</>;
}

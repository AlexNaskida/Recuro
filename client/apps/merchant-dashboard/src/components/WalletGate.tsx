import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import LoadingScreen from "@/components/LoadingScreen";

export default function WalletGate({ children }: { children: ReactNode }) {
  const { ready, authenticated, connected, connecting } = useMerchantWallet();

  if (!ready || connecting) {
    return (
      <LoadingScreen
        title="Loading secure session..."
        description="We’re checking wallet access before opening your dashboard."
      />
    );
  }

  if (!authenticated || !connected) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

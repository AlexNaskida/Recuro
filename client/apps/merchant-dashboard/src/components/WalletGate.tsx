import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import LoadingScreen from "@/components/LoadingScreen";

export default function WalletGate({ children }: { children: ReactNode }) {
  const { ready, authenticated, connected, connecting } = useMerchantWallet();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && ready && !connecting && (!authenticated || !connected)) {
      navigate("/", { replace: true });
    }
  }, [authenticated, connected, connecting, hydrated, navigate, ready]);

  if (!hydrated || !ready || connecting || !authenticated || !connected) {
    return (
      <LoadingScreen
        title="Loading secure session..."
        description="We’re checking wallet access before opening your dashboard."
      />
    );
  }

  return <>{children}</>;
}

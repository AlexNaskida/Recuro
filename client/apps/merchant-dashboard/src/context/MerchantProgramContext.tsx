import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import IDL from "@/lib/idl.json";
import { RPC_URL } from "@/lib/config";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";

type MerchantProgramContextValue = {
  provider: AnchorProvider | null;
  program: Program | null;
  connected: boolean;
};

const MerchantProgramContext =
  createContext<MerchantProgramContextValue | null>(null);

export function MerchantProgramProvider({ children }: { children: ReactNode }) {
  const connection = useMemo(() => new Connection(RPC_URL, "confirmed"), []);
  const { ready, wallet } = useMerchantWallet();

  const provider = useMemo(() => {
    if (!ready || !wallet) return null;

    return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  }, [connection, ready, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Program(IDL as any, provider);
    } catch (e) {
      console.error("Failed to init Anchor program:", e);
      return null;
    }
  }, [provider]);

  return (
    <MerchantProgramContext.Provider
      value={{ provider, program, connected: !!wallet }}
    >
      {children}
    </MerchantProgramContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMerchantProgramContext() {
  const context = useContext(MerchantProgramContext);
  if (!context) {
    throw new Error(
      "useAnchorProgram must be used within MerchantProgramProvider",
    );
  }

  return context;
}

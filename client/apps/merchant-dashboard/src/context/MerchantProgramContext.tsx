import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import IDL from "@/lib/idl.json";

type MerchantProgramContextValue = {
  provider: AnchorProvider | null;
  program: Program | null;
  connected: boolean;
};

const MerchantProgramContext =
  createContext<MerchantProgramContextValue | null>(null);

export function MerchantProgramProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;

    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      { commitment: "confirmed" },
    );
  }, [
    connection,
    wallet.publicKey,
    wallet.signTransaction,
    wallet.signAllTransactions,
  ]);

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
      value={{ provider, program, connected: !!wallet.publicKey }}
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

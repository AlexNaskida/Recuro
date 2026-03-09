import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@/lib/constants";

// IDL will be available after anchor build + copy
// For now we use a minimal stub that lets us at least init the provider
// Replace with: import IDL from "@/lib/idl.json" after anchor build
const IDL_STUB: Idl = {
  version: "0.1.0",
  name: "subscription",
  instructions: [],
  accounts: [],
  errors: [],
} as unknown as Idl;

let cachedIdl: Idl = IDL_STUB;
// Attempt to load real IDL if it exists
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const realIdl = require("@/lib/idl.json");
  cachedIdl = realIdl;
} catch {
  // IDL not yet generated — will use mock data
}

export function useAnchorProgram() {
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
      { commitment: "confirmed" }
    );
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      return new Program(cachedIdl, new PublicKey(PROGRAM_ID), provider);
    } catch {
      return null;
    }
  }, [provider]);

  return { provider, program, connected: !!wallet.publicKey };
}

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "@/lib/constants";
import IDL from "@/lib/idl.json";

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
      return new Program(IDL as any, provider);
    } catch (e) {
      console.error("Failed to init Anchor program:", e);
      return null;
    }
  }, [provider]);

  return { provider, program, connected: !!wallet.publicKey };
}

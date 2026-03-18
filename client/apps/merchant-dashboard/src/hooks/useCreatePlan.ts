import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProgram } from "./useAnchorProgram";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";
import { getPlanPDA, usdcToMicro } from "@/lib/pda";
import { USDC_MINT } from "@/lib/config";

export interface CreatePlanInput {
  name: string;
  description: string;
  amountUsdc: number;
  intervalDays: number;
  trialDays: number;
  maxSubscribers: number;
  merchantReceiveAddress?: string;
}

export function useCreatePlan() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [loading, setLoading] = useState(false);

  const createPlan = async (input: CreatePlanInput): Promise<string | null> => {
    if (!program || !publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    try {
      const planId = new BN(Date.now());
      const planPubkey = getPlanPDA(publicKey, planId);
      const usdcMint = new PublicKey(USDC_MINT);
      const merchantTokenAccount = await getAssociatedTokenAddressSync(
        usdcMint,
        publicKey,
      );

      const sig = await program.methods
        .createPlan({
          planId,
          name: input.name,
          description: input.description,
          amountUsdc: usdcToMicro(input.amountUsdc),
          intervalSeconds: new BN(input.intervalDays * 86_400),
          trialSeconds: new BN(input.trialDays * 86_400),
          maxSubscribers: new BN(input.maxSubscribers),
          merchantReceiveAddress: input.merchantReceiveAddress
            ? new PublicKey(input.merchantReceiveAddress)
            : null,
        })
        .accounts({
          merchant: publicKey,
          usdcMint,
          merchantTokenAccount,
          plan: planPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc({ commitment: "confirmed" });

      return sig;
    } finally {
      setLoading(false);
    }
  };

  return { createPlan, loading, canCreate: !!program && !!publicKey };
}

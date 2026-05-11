import { useState } from "react";
import { useAnchorProgram } from "./useAnchorProgram";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import { getPlanPDA, usdcToMicro } from "@/lib/pda";
import { randomPlanId } from "@/lib/random";
import { USDC_MINT } from "@/lib/config";
import { useMerchantWallet } from "./useMerchantWallet";

function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

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
  const { publicKey, connected, canSignTransactions } = useMerchantWallet();
  const { program } = useAnchorProgram();
  const [loading, setLoading] = useState(false);

  const canCreate = !!program && !!publicKey && canSignTransactions;
  const createDisabledReason = !connected
    ? "Connect wallet first"
    : !canSignTransactions
      ? "Wallet session is not ready for signing. Reconnect your wallet in Privy and try again."
      : !program
        ? "Program is not ready"
        : !publicKey
          ? "Wallet public key is missing"
          : null;

  const createPlan = async (input: CreatePlanInput): Promise<string | null> => {
    if (!canCreate) {
      throw new Error(createDisabledReason ?? "Wallet is not ready");
    }

    setLoading(true);
    try {
      const planId = randomPlanId();
      const planPubkey = getPlanPDA(publicKey, planId);
      const usdcMint = new PublicKey(USDC_MINT);
      const merchantTokenAccount = getAssociatedTokenAddress(
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

  return {
    createPlan,
    loading,
    canCreate,
    createDisabledReason,
  };
}

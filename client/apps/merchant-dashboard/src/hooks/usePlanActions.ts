import { useState } from "react";
import BN from "bn.js";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useAnchorProgram } from "./useAnchorProgram";
import { useMerchantWallet } from "./useMerchantWallet";
import { getPlanPDA, usdcToMicro } from "@/lib/pda";
import { randomPlanId } from "@/lib/random";
import { USDC_MINT } from "@/lib/config";

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

type UsePlanActionsOptions = {
  onPlanUpdated?: () => Promise<void> | void;
};

export function usePlanActions(options: UsePlanActionsOptions = {}) {
  const { publicKey, connected, canSignTransactions } = useMerchantWallet();
  const { program } = useAnchorProgram();
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);

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

  const deleteDisabledReason = !connected
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

    setCreatingPlan(true);
    try {
      const planId = randomPlanId();
      const planPubkey = getPlanPDA(publicKey, planId);
      const usdcMint = new PublicKey(USDC_MINT);
      const merchantTokenAccount = getAssociatedTokenAddress(
        usdcMint,
        publicKey,
      );

      const signature = await program.methods
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

      await options.onPlanUpdated?.();
      return signature;
    } finally {
      setCreatingPlan(false);
    }
  };

  const deletePlan = async (planPubkey: string): Promise<string | null> => {
    if (!program || !publicKey) {
      throw new Error(deleteDisabledReason ?? "Wallet is not ready");
    }

    setDeletingPlan(true);
    try {
      const signature = await program.methods
        .deletePlan()
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(planPubkey),
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      await options.onPlanUpdated?.();
      return signature;
    } finally {
      setDeletingPlan(false);
    }
  };

  return {
    createPlan,
    deletePlan,
    creatingPlan,
    deletingPlan,
    canCreate,
    createDisabledReason,
    deleteDisabledReason,
  };
}

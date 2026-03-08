import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { SubscriptionSdk } from "@solana-subscription/sdk";
import { CLUSTER, PROGRAM_ID, USDC_MINT } from "./utils";

export function createUserSdk(
  connection: Connection,
  wallet:     AnchorWallet
): SubscriptionSdk {
  const provider = new AnchorProvider(connection, wallet, {
    commitment:          "confirmed",
    preflightCommitment: "confirmed",
  });

  return new SubscriptionSdk(provider, {
    programId: PROGRAM_ID,
    usdcMint:  USDC_MINT,
    cluster:   CLUSTER as "devnet" | "mainnet-beta" | "localnet",
  });
}

import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { SubscriptionSdk } from "@solana-subscription/sdk";
import IDL from "@solana-subscription/sdk/idl.json";
import { CLUSTER, PROGRAM_ID, USDC_MINT } from "@/constants";

/** Create a read-only provider (no wallet required) */
export function createReadOnlyProvider(connection: Connection): AnchorProvider {
  return new AnchorProvider(
    connection,
    {
      publicKey:  PublicKey.default,
      signTransaction:     async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    },
    { commitment: "confirmed" }
  );
}

/** Create a fully-signer provider from an Anchor wallet */
export function createProvider(
  connection: Connection,
  wallet: AnchorWallet
): AnchorProvider {
  return new AnchorProvider(connection, wallet, {
    commitment:           "confirmed",
    preflightCommitment:  "confirmed",
    skipPreflight:        false,
  });
}

/** Instantiate the SubscriptionSdk with a connected wallet */
export function createSdk(
  connection: Connection,
  wallet: AnchorWallet
): SubscriptionSdk {
  const provider = createProvider(connection, wallet);
  return new SubscriptionSdk(provider, {
    cluster:   CLUSTER,
    programId: PROGRAM_ID,
    usdcMint:  USDC_MINT,
  });
}

/** Read-only program instance (for fetching accounts without wallet) */
export function createReadOnlyProgram(connection: Connection): Program {
  const provider = createReadOnlyProvider(connection);
  return new Program(IDL as Idl, new PublicKey(PROGRAM_ID), provider);
}

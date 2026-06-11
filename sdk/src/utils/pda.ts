import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { PROGRAM_ID, CLOCKWORK_THREAD_PROGRAM_ID, SEEDS, FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID } from "../constants";

/**
 * Derive the Plan PDA for a given merchant and planId.
 * Seeds: ["plan", merchant, planId_le_bytes_8]
 */
export function getPlanPDA(
  merchant: PublicKey,
  planId: number | BN,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  const idBn = BN.isBN(planId) ? planId : new BN(planId);
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(idBn.toString()));

  return PublicKey.findProgramAddressSync(
    [SEEDS.PLAN, merchant.toBuffer(), idBuf],
    programId,
  );
}

/**
 * Derive the Subscription PDA for a (plan, subscriber) pair.
 * Seeds: ["subscription", plan, subscriber]
 */
export function getSubscriptionPDA(
  plan: PublicKey,
  subscriber: PublicKey,
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.SUBSCRIPTION, plan.toBuffer(), subscriber.toBuffer()],
    programId,
  );
}

/**
 * Derive the Guard PDA for a subscription.
 * Seeds: ["guard", subscription]
 */
export function getGuardPDA(
  subscription: PublicKey,
  guardProgramId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guard"), subscription.toBuffer()],
    guardProgramId,
  );
}

// ── FeeRouter PDA helpers ─────────────────────────────────────────────────────

/** FeeRouter PDA — seeds: ["fee_router"] on Recuro program */
export function getFeeRouterPDA(
  programId: PublicKey = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("fee_router")],
    programId,
  );
}

/**
 * FeeRouter USDC ATA — the token account that receives keeper fees from Foundation,
 * then forwards them to the calling keeper.
 * Uses the standard ATA derivation; owner is a PDA (off-curve) which is valid.
 */
export function getFeeRouterATA(
  feeRouterPDA: PublicKey,
  usdcMint: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [feeRouterPDA.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), usdcMint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

// ── Foundation Subscriptions PDA helpers ─────────────────────────────────────

/** Foundation Plan PDA — seeds: ["plan", merchant, planId_le_bytes_8] on Foundation program */
export function getFoundationPlanPDA(
  merchant: PublicKey,
  planId: number | BN,
  foundationProgramId: PublicKey = FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID,
): [PublicKey, number] {
  const idBn = BN.isBN(planId) ? planId : new BN(planId);
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(idBn.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("plan"), merchant.toBuffer(), idBuf],
    foundationProgramId,
  );
}

/** Foundation SubscriptionDelegation PDA — seeds: ["subscription", foundationPlanPDA, subscriber] */
export function getFoundationSubscriptionPDA(
  foundationPlanPDA: PublicKey,
  subscriber: PublicKey,
  foundationProgramId: PublicKey = FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), foundationPlanPDA.toBuffer(), subscriber.toBuffer()],
    foundationProgramId,
  );
}

/** Foundation SubscriptionAuthority PDA — seeds: ["SubscriptionAuthority", user, tokenMint] */
export function getFoundationSubscriptionAuthorityPDA(
  user: PublicKey,
  tokenMint: PublicKey,
  foundationProgramId: PublicKey = FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("SubscriptionAuthority"), user.toBuffer(), tokenMint.toBuffer()],
    foundationProgramId,
  );
}

/** Foundation event authority PDA — seeds: ["event_authority"] */
export function getFoundationEventAuthorityPDA(
  foundationProgramId: PublicKey = FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("event_authority")],
    foundationProgramId,
  );
}

/**
 * Derive the Clockwork Thread PDA for a given subscription.
 * Seeds (inside Clockwork program): ["thread", authority, thread_id]
 * authority = subscription PDA
 * thread_id = "payment"
 */
export function getThreadPDA(
  subscriptionPubkey: PublicKey,
  clockworkProgramId: PublicKey = CLOCKWORK_THREAD_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.THREAD, subscriptionPubkey.toBuffer(), SEEDS.THREAD],
    clockworkProgramId,
  );
}

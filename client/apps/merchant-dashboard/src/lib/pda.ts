import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PROGRAM_ID, SEED_PLAN, SEED_SUBSCRIPTION, SEED_CONFIG } from "./constants";

const programId = new PublicKey(PROGRAM_ID);

export function getPlanPDA(merchant: PublicKey, planId: BN): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_PLAN), merchant.toBuffer(), planId.toArrayLike(Buffer, "le", 8)],
    programId
  );
  return pda;
}

export function getSubscriptionPDA(plan: PublicKey, subscriber: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_SUBSCRIPTION), plan.toBuffer(), subscriber.toBuffer()],
    programId
  );
  return pda;
}

export function getConfigPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONFIG)],
    programId
  );
  return pda;
}

export function truncateWallet(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function microToUsdc(micro: BN | number): number {
  const n = typeof micro === "number" ? micro : micro.toNumber();
  return n / 1_000_000;
}

export function usdcToMicro(usdc: number): BN {
  return new BN(Math.round(usdc * 1_000_000));
}

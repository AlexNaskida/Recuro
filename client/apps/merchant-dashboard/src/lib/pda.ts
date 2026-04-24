import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SEED_PLAN, SEED_SUBSCRIPTION, SEED_CONFIG } from "./constants";
import { PROGRAM_ID } from "@/lib/config";

function getProgramId(): PublicKey {
  if (!PROGRAM_ID) throw new Error("VITE_PROGRAM_ID is not set");
  return new PublicKey(PROGRAM_ID);
}

export function getPlanPDA(merchant: PublicKey, planId: BN): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED_PLAN),
      merchant.toBuffer(),
      planId.toArrayLike(Buffer, "le", 8),
    ],
    getProgramId(),
  );
  return pda;
}

export function getSubscriptionPDA(
  plan: PublicKey,
  subscriber: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_SUBSCRIPTION), plan.toBuffer(), subscriber.toBuffer()],
    getProgramId(),
  );
  return pda;
}

export function getConfigPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONFIG)],
    getProgramId(),
  );
  return pda;
}

export function truncateWallet(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function microToUsdc(micro: BN | number): number {
  if (typeof micro === "number") return micro / 1_000_000;

  const raw = micro.toString(10);
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  const padded = digits.padStart(7, "0");
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6);
  const parsed = Number(`${negative ? "-" : ""}${whole}.${fraction}`);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function usdcToMicro(usdc: number): BN {
  return new BN(Math.round(usdc * 1_000_000));
}

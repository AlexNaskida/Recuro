/**
 * SubPay Keeper — Production Payment Executor
 *
 * Watches all active subscriptions on-chain and calls execute_payment
 * when next_payment_at is reached. Runs as a daemon, retries on failure.
 *
 * Usage:
 *   node keeper.mjs
 *
 * Env vars:
 *   RPC_URL        — Solana RPC endpoint (use Helius/Alchemy, not public)
 *   KEEPER_KEYPAIR — path to keypair JSON (default: ~/.config/solana/id.json)
 *   POLL_INTERVAL  — seconds between polls (default: 60)
 *   DRY_RUN        — "true" to simulate without submitting
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  "HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq",
);
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR_PATH =
  process.env.KEEPER_KEYPAIR ?? resolve(homedir(), ".config/solana/id.json");
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL ?? "60") * 1000;
const DRY_RUN = process.env.DRY_RUN === "true";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;
const BAR_WIDTH = 24;
const BAR_TICK_MS = 120;

// Tracks subscriptions that permanently fail so the keeper stops retrying them
// each poll (e.g. stale delegate, wrong accounts). Cleared on keeper restart.
const permanentFailures = new Set();

// ── IDL ───────────────────────────────────────────────────────────────────────

const IDL_PATHS = [
  "./sdk/src/idl.json",
  "./target/idl/subscription.json",
  "../sdk/src/idl.json",
];

let IDL = null;
for (const p of IDL_PATHS) {
  if (existsSync(p)) {
    IDL = JSON.parse(readFileSync(p, "utf8"));
    log("info", `IDL loaded from ${p}`);
    break;
  }
}
if (!IDL) {
  log(
    "error",
    "IDL not found. Run: cp target/idl/subscription.json sdk/src/idl.json",
  );
  process.exit(1);
}

// ── Keypair ───────────────────────────────────────────────────────────────────

if (!existsSync(KEYPAIR_PATH)) {
  log("error", `Keypair not found at ${KEYPAIR_PATH}`);
  process.exit(1);
}
const keeperKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"))),
);

// ── Provider ──────────────────────────────────────────────────────────────────

const connection = new Connection(RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60_000,
});
const wallet = new anchor.Wallet(keeperKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
});
const program = new anchor.Program(IDL, provider);

// ── PDAs ──────────────────────────────────────────────────────────────────────

const [configPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  PROGRAM_ID,
);

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level, message, meta = {}) {
  const ts = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
  const prefix =
    {
      info: "\x1b[36m[INFO]\x1b[0m",
      success: "\x1b[32m[OK]\x1b[0m",
      warn: "\x1b[33m[WARN]\x1b[0m",
      error: "\x1b[31m[ERROR]\x1b[0m",
      skip: "\x1b[90m[SKIP]\x1b[0m",
    }[level] ?? "[LOG]";
  console.log(`${ts} ${prefix} ${message}${metaStr}`);
}

function shortKey(pk) {
  const s = typeof pk === "string" ? pk : (pk?.toBase58?.() ?? String(pk));
  return s.slice(0, 8) + "...";
}

function renderBar(filled) {
  const clamped = Math.max(0, Math.min(BAR_WIDTH, filled));
  return `[${"#".repeat(clamped)}${"-".repeat(BAR_WIDTH - clamped)}]`;
}

async function withLoadingBar(label, fn) {
  if (!process.stdout.isTTY) return fn();

  let step = 0;
  process.stdout.write(`\r\x1b[36m[LOAD]\x1b[0m ${label} ${renderBar(0)}`);

  const timer = setInterval(() => {
    step = (step + 1) % (BAR_WIDTH + 1);
    process.stdout.write(`\r\x1b[36m[LOAD]\x1b[0m ${label} ${renderBar(step)}`);
  }, BAR_TICK_MS);

  try {
    const out = await fn();
    clearInterval(timer);
    process.stdout.write(
      `\r\x1b[32m[LOAD]\x1b[0m ${label} ${renderBar(BAR_WIDTH)} done\n`,
    );
    return out;
  } catch (err) {
    clearInterval(timer);
    process.stdout.write(
      `\r\x1b[31m[LOAD]\x1b[0m ${label} ${renderBar(BAR_WIDTH)} failed\n`,
    );
    throw err;
  }
}

async function waitWithBar(ms, label = "Waiting") {
  if (ms <= 0) return;
  if (!process.stdout.isTTY) {
    await sleep(ms);
    return;
  }

  const started = Date.now();

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = Date.now() - started;
      const progress = Math.min(1, elapsed / ms);
      const filled = Math.round(progress * BAR_WIDTH);
      const remainingMs = Math.max(0, ms - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);

      process.stdout.write(
        `\r\x1b[36m[WAIT]\x1b[0m ${label} ${renderBar(filled)} ${remainingSec}s `,
      );

      if (elapsed >= ms) {
        process.stdout.write(
          `\r\x1b[32m[WAIT]\x1b[0m ${label} ${renderBar(BAR_WIDTH)} done\n`,
        );
        resolve();
      } else {
        setTimeout(tick, BAR_TICK_MS);
      }
    };

    tick();
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const stats = {
  polls: 0,
  payments: 0,
  failures: 0,
  skipped: 0,
  errors: 0,
  startedAt: Date.now(),
};

function printStats() {
  const uptime = Math.floor((Date.now() - stats.startedAt) / 1000);
  log(
    "info",
    `Uptime=${uptime}s | polls=${stats.polls} payments=${stats.payments} failures=${stats.failures} skipped=${stats.skipped} errors=${stats.errors}`,
  );
}

// ── Fetch due subscriptions ───────────────────────────────────────────────────
//
// Uses raw getProgramAccounts and deserializes each account individually
// so a single stale/old-layout account can't crash the whole fetch.

async function fetchDueSubscriptions(now) {
  const rawAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [{ dataSize: 173 }], // 8 discriminator + 165 data (current layout)
  });

  const results = [];
  for (const { pubkey, account } of rawAccounts) {
    try {
      const decoded = program.coder.accounts.decode(
        "subscription",
        account.data,
      );

      // Must be Active
      if (!decoded.status || !("active" in decoded.status)) continue;

      // Skip if still in trial
      const trialEnd =
        decoded.trialEndsAt?.toNumber?.() ?? decoded.trialEndsAt ?? 0;
      if (trialEnd > 0 && now < trialEnd) continue;

      // Due if next_payment_at <= now
      const nextPayment =
        decoded.nextPaymentAt?.toNumber?.() ?? decoded.nextPaymentAt;
      if (now < nextPayment) continue;

      results.push({ publicKey: pubkey, account: decoded });
    } catch {
      log(
        "warn",
        `Skipping undeserializable account ${pubkey.toBase58().slice(0, 8)}... (old layout)`,
      );
    }
  }
  return results;
}

// ── Execute one payment ───────────────────────────────────────────────────────
//
// Mirrors execute_payment.rs ExecutePayment accounts exactly:
//
//   keeper                   → this wallet (any signer is allowed by program)
//   config                   → PDA [b"config"]
//   subscription             → PDA [b"subscription", plan, subscriber]
//   plan                     → subscription.plan
//   subscriberTokenAccount   → subscription.subscriberTokenAccount  (stored on-chain, NOT recomputed)
//   merchantTokenAccount     → plan.merchantTokenAccount            (stored on-chain)
//   treasuryTokenAccount     → ATA(config.treasury, USDC_MINT)     (derived from config)
//   subscriber               → subscription.subscriber              (CHECK / read-only)
//   token_program / system_program  → resolved by Anchor

async function executePayment(subPubkey, subAccount, config) {
  // Fetch plan
  let plan;
  try {
    plan = await withLoadingBar(`Fetch plan ${shortKey(subAccount.plan)}`, () =>
      program.account.plan.fetch(subAccount.plan),
    );
  } catch (err) {
    log("error", "Could not fetch plan", {
      subscription: subPubkey.toBase58(),
      error: err?.message,
    });
    return "error";
  }

  // All account addresses sourced from on-chain state — keeper cannot manipulate them
  const subscriberTokenAccount = subAccount.subscriberTokenAccount; // from Subscription PDA
  const merchantTokenAccount = plan.merchantTokenAccount; // from Plan PDA
  const treasuryTokenAccount = await getAssociatedTokenAddress(
    // from config.treasury
    USDC_MINT,
    config.treasury,
  );

  const amountUsdc =
    subAccount.amountUsdc?.toNumber?.() ?? subAccount.amountUsdc;
  const cyclesLeft = subAccount.cyclesRemaining;

  if (DRY_RUN) {
    log("info", "[DRY RUN] Would call execute_payment", {
      subscription: subPubkey.toBase58(),
      subscriber: subAccount.subscriber.toBase58(),
      amount: `${amountUsdc / 1_000_000} USDC`,
      cyclesLeft,
    });
    return "dry_run";
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tx = await withLoadingBar(
        `Execute payment ${shortKey(subPubkey)} try ${attempt}/${MAX_RETRIES}`,
        () =>
          program.methods
            .executePayment()
            .accounts({
              keeper: keeperKeypair.publicKey,
              config: configPDA,
              subscription: subPubkey,
              plan: subAccount.plan,
              subscriberTokenAccount,
              merchantTokenAccount,
              treasuryTokenAccount,
              subscriber: subAccount.subscriber,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 1_000,
              }),
              ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
            ])
            .rpc({ commitment: "confirmed" }),
      );

      log("success", "Payment executed", {
        subscription: subPubkey.toBase58().slice(0, 8) + "...",
        subscriber: subAccount.subscriber.toBase58().slice(0, 8) + "...",
        amount: `${amountUsdc / 1_000_000} USDC`,
        cyclesLeft: cyclesLeft - 1,
        tx: tx.slice(0, 16) + "...",
        explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      });

      return "success";
    } catch (err) {
      const msg = err?.message ?? String(err);

      // Program silently returned Ok() — not due yet or already cancelled
      if (msg.includes("SubscriptionNotActive") || msg.includes("skipped")) {
        log("skip", "Program skipped payment (not active or not due)", {
          subscription: subPubkey.toBase58(),
        });
        return "skip";
      }

      if (attempt < MAX_RETRIES) {
        log(
          "warn",
          `Attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${RETRY_DELAY_MS / 1000}s`,
          {
            subscription: subPubkey.toBase58(),
            error: msg.slice(0, 120),
          },
        );
        await sleep(RETRY_DELAY_MS);
      } else {
        log(
          "error",
          `Failed after ${MAX_RETRIES} attempts — marking as permanent failure for this session`,
          {
            subscription: subPubkey.toBase58(),
            error: msg.slice(0, 200),
          },
        );
        permanentFailures.add(subPubkey.toBase58());
        return "error";
      }
    }
  }
}

// ── Poll cycle ────────────────────────────────────────────────────────────────

async function poll(config) {
  stats.polls++;
  const now = Math.floor(Date.now() / 1000);

  let due;
  try {
    due = await fetchDueSubscriptions(now);
  } catch (err) {
    log("error", "Failed to fetch subscriptions", { error: err?.message });
    stats.errors++;
    return;
  }

  log("info", `Poll #${stats.polls} — ${due.length} payment(s) due`);

  for (const { publicKey, account } of due) {
    // Skip subscriptions that have permanently failed this session
    if (permanentFailures.has(publicKey.toBase58())) {
      log("skip", "Skipping permanently failed subscription", {
        sub: publicKey.toBase58().slice(0, 8) + "...",
      });
      continue;
    }

    const nextPayment =
      account.nextPaymentAt?.toNumber?.() ?? account.nextPaymentAt;
    log("info", "Processing", {
      sub: publicKey.toBase58().slice(0, 8) + "...",
      subscriber: account.subscriber.toBase58().slice(0, 8) + "...",
      overdueMins: Math.floor((now - nextPayment) / 60),
      cyclesLeft: account.cyclesRemaining,
    });

    const result = await executePayment(publicKey, account, config);

    if (result === "success") stats.payments++;
    else if (result === "error") stats.errors++;
    else if (result === "skip") stats.skipped++;

    await sleep(500); // pace RPC calls
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("info", "SubPay Keeper starting", {
    keeper: keeperKeypair.publicKey.toBase58(),
    programId: PROGRAM_ID.toBase58(),
    rpc: RPC_URL.replace(/[?&]api-key=[^&]+/, "&api-key=***"),
    pollInterval: `${POLL_INTERVAL / 1000}s`,
    dryRun: DRY_RUN,
  });

  // Check SOL balance
  const balance = await connection.getBalance(keeperKeypair.publicKey);
  log("info", `Keeper balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 10_000_000) {
    log("warn", "Low SOL — fund keeper before production use");
    if (RPC_URL.includes("devnet")) {
      try {
        await connection.requestAirdrop(keeperKeypair.publicKey, 1_000_000_000);
        await sleep(2_000);
        log("success", "Devnet airdrop received (1 SOL)");
      } catch {
        log("warn", "Airdrop failed — run: solana airdrop 1");
      }
    }
  }

  // Load protocol config — required for treasury ATA derivation
  let config;
  try {
    config = await withLoadingBar("Fetch protocol config", () =>
      program.account.protocolConfig.fetch(configPDA),
    );
    log("info", "Protocol config loaded", {
      feeBps: config.feeBps,
      treasury: config.treasury.toBase58(),
    });
  } catch {
    log("error", "Protocol config not found at PDA — run initialize first");
    process.exit(1);
  }

  // Stats every 10 min
  const statsTimer = setInterval(printStats, 10 * 60 * 1000);

  // Graceful shutdown
  process.on("SIGINT", () => {
    clearInterval(statsTimer);
    printStats();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    clearInterval(statsTimer);
    printStats();
    process.exit(0);
  });

  // Immediate first poll, then loop
  await poll(config);
  while (true) {
    await waitWithBar(POLL_INTERVAL, "Waiting for next poll");
    // Refresh config each cycle in case treasury address ever changes
    try {
      config = await withLoadingBar("Refresh protocol config", () =>
        program.account.protocolConfig.fetch(configPDA),
      );
    } catch {}
    await poll(config);
  }
}

main().catch((err) => {
  log("error", "Fatal error", { error: err?.message });
  process.exit(1);
});

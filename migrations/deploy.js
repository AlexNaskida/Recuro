// ─────────────────────────────────────────────────────────────────────────────
// Protocol fee configuration
//
// FEE MODEL: "fee on top"
//   Subscriber pays:  plan_amount + fee
//   Merchant gets:    plan_amount  (always the full advertised price)
//   Treasury gets:    fee
//
// Set FEE_BPS below to control the protocol fee:
//   25   = 0.25%  →  $10 plan costs subscriber $10.025
// ─────────────────────────────────────────────────────────────────────────────
const FEE_BPS = 25; // 0.25% fee

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  anchor.setProvider(provider);
  const program = anchor.workspace.Subscription;

  const [config] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Only initialise if it doesn't exist yet
  try {
    const existing = await program.account.protocolConfig.fetch(config);
    console.log("Config already initialised:", config.toBase58());
    console.log("Current fee_bps:", existing.feeBps, `(${existing.feeBps / 100}%)`);
    return;
  } catch {
    // Not found — create it
  }

  const treasury = provider.wallet.publicKey;
  const tx = await program.methods
    .initializeConfig({ feeBps: FEE_BPS, treasury })
    .accounts({
      admin:         provider.wallet.publicKey,
      config,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Protocol config initialised:", config.toBase58());
  console.log(`   Fee: ${FEE_BPS} bps (${FEE_BPS / 100}%)`);
  console.log(`   Treasury: ${treasury.toBase58()}`);
  console.log("   Tx:", tx);
};

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::str::FromStr;

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{Plan, PlanCreated, PlanStatus},
};

// ────────────────────────────────────────────────────────────
// Instruction parameters - passed as a single struct so the
// IDL generates a clean typed interface for the TypeScript SDK.
// ────────────────────────────────────────────────────────────
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePlanParams {
    pub plan_id: u64,
    pub name: String,
    pub description: String,
    pub amount_usdc: u64, // micro-units (1 USDC = 1_000_000)
    pub interval_seconds: i64,
    pub trial_seconds: i64,                       // 0 = no trial
    pub max_subscribers: u64,                     // 0 = unlimited
    pub merchant_receive_address: Option<Pubkey>, // Optional: where merchant receives funds. Defaults to merchant signer if not provided.
}

// ────────────────────────────────────────────────────────────
// Account context
// ────────────────────────────────────────────────────────────
#[derive(Accounts)]
#[instruction(params: CreatePlanParams)]
pub struct CreatePlan<'info> {
    /// Merchant wallet - pays rent, becomes plan authority
    #[account(mut)]
    pub merchant: Signer<'info>,

    /// USDC SPL mint that this plan is denominated in
    pub usdc_mint: Account<'info, Mint>,

    /// Merchant's USDC ATA - must already exist before creating a plan
    #[account(
        associated_token::mint      = usdc_mint,
        associated_token::authority = merchant,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// New Plan PDA - created here, owned by this program
    #[account(
        init,
        payer  = merchant,
        space  = 8 + Plan::INIT_SPACE,
        seeds  = [SEED_PLAN, merchant.key().as_ref(), &params.plan_id.to_le_bytes()],
        bump,
    )]
    pub plan: Account<'info, Plan>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    /// Foundation Subscriptions program
    /// CHECK: Program ID verified by constraint
    #[account(
        constraint = foundation_program.key() == Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID).unwrap()
            @ SubscriptionError::InvalidFoundationProgram
    )]
    pub foundation_program: AccountInfo<'info>,

    /// Foundation Plan PDA — created here via CPI to Foundation program
    /// Seeds on Foundation program: [b"plan", merchant, plan_id_le_bytes]
    /// CHECK: Seeds verified by Foundation program; key stored on Recuro Plan after CPI
    #[account(
        mut,
        seeds = [b"plan", merchant.key().as_ref(), &params.plan_id.to_le_bytes()],
        bump,
        seeds::program = foundation_program.key(),
    )]
    pub foundation_plan: UncheckedAccount<'info>,
}

// ────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────
pub fn handler(ctx: Context<CreatePlan>, params: CreatePlanParams) -> Result<()> {
    // ---- Input validation ----
    require!(
        params.name.len() <= MAX_PLAN_NAME_LEN,
        SubscriptionError::PlanNameTooLong
    );
    require!(
        params.description.len() <= MAX_PLAN_DESC_LEN,
        SubscriptionError::PlanDescTooLong
    );
    require!(
        params.interval_seconds >= MIN_INTERVAL_SECONDS
            && params.interval_seconds <= MAX_INTERVAL_SECONDS,
        SubscriptionError::InvalidInterval
    );
    require!(
        params.amount_usdc >= MIN_AMOUNT_USDC && params.amount_usdc <= MAX_AMOUNT_USDC,
        SubscriptionError::InvalidAmount
    );
    require!(
        params.trial_seconds <= params.interval_seconds,
        SubscriptionError::TrialExceedsInterval
    );

    let plan = &mut ctx.accounts.plan;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // ---- Populate Plan PDA ----
    plan.merchant = ctx.accounts.merchant.key();
    plan.merchant_token_account = ctx.accounts.merchant_token_account.key();
    plan.usdc_mint = ctx.accounts.usdc_mint.key();
    // merchant_receive_address defaults to the deployer/signer if not provided
    plan.merchant_receive_address = params
        .merchant_receive_address
        .unwrap_or_else(|| ctx.accounts.merchant.key());
    plan.plan_id = params.plan_id;
    plan.name = params.name.clone();
    plan.description = params.description.clone();
    plan.amount_usdc = params.amount_usdc;
    plan.interval_seconds = params.interval_seconds;
    plan.trial_seconds = params.trial_seconds;
    plan.max_subscribers = params.max_subscribers;
    plan.active_subscribers = 0;
    plan.total_subscribers_ever = 0;
    plan.total_revenue = 0;
    plan.created_at = now;
    plan.updated_at = now;
    plan.status = PlanStatus::Active;
    plan.bump = ctx.bumps.plan;

    // ── CPI: Register plan on Foundation Subscriptions program ───────────────
    // Foundation create_plan instruction (discriminator: 7).
    // PlanData layout is repr(C, packed), 456 bytes:
    //   plan_id        u64  ( 8)  — merchant-scoped unique ID
    //   mint           [u8;32]    — SPL token mint
    //   terms.amount   u64  ( 8)  — max pull per period (= plan amount)
    //   terms.period_hours u64(8) — billing period in hours (interval_seconds/3600)
    //   terms.created_at   i64(8) — zero; Foundation sets this at plan creation
    //   end_ts         i64  ( 8)  — zero = no expiry
    //   destinations   [Address;4] (128) — whitelisted receiver owners
    //   pullers        [Address;4] (128) — addresses authorized to pull
    //   metadata_uri   [u8;128]         — zero-padded UTF-8 URI
    {
        let foundation_pid = Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID)
            .map_err(|_| error!(SubscriptionError::InvalidFoundationProgram))?;
        let keeper_key = Pubkey::from_str(RECURO_KEEPER_PUBKEY)
            .map_err(|_| error!(SubscriptionError::InvalidFoundationProgram))?;

        // interval_seconds → period_hours; Foundation minimum is 1 hour
        let period_hours = (params.interval_seconds / 3600).max(1) as u64;

        let mut ix_data: Vec<u8> = Vec::with_capacity(457);
        ix_data.push(7u8); // create_plan discriminator
        ix_data.extend_from_slice(&params.plan_id.to_le_bytes());
        ix_data.extend_from_slice(ctx.accounts.usdc_mint.key().as_ref());
        ix_data.extend_from_slice(&params.amount_usdc.to_le_bytes());
        ix_data.extend_from_slice(&period_hours.to_le_bytes());
        ix_data.extend_from_slice(&0i64.to_le_bytes()); // terms.created_at set by program
        ix_data.extend_from_slice(&0i64.to_le_bytes()); // end_ts = no expiry
        // destinations[0] = merchant_receive_address; [1..3] = zero
        ix_data.extend_from_slice(plan.merchant_receive_address.as_ref());
        ix_data.extend_from_slice(&[0u8; 96]); // destinations[1..3]
        // pullers[0] = Recuro keeper; [1..3] = zero
        ix_data.extend_from_slice(keeper_key.as_ref());
        ix_data.extend_from_slice(&[0u8; 96]); // pullers[1..3]
        ix_data.extend_from_slice(&[0u8; 128]); // metadata_uri

        let foundation_ix = Instruction {
            program_id: foundation_pid,
            accounts: vec![
                AccountMeta::new(ctx.accounts.merchant.key(), true),
                AccountMeta::new(ctx.accounts.foundation_plan.key(), false),
                AccountMeta::new_readonly(ctx.accounts.usdc_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            ],
            data: ix_data,
        };

        invoke(
            &foundation_ix,
            &[
                ctx.accounts.merchant.to_account_info(),
                ctx.accounts.foundation_plan.to_account_info(),
                ctx.accounts.usdc_mint.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        plan.foundation_plan_pubkey = ctx.accounts.foundation_plan.key();
    }

    // ---- Emit structured event (indexed by SDK event listeners) ----
    emit!(PlanCreated {
        plan: plan.key(),
        merchant: ctx.accounts.merchant.key(),
        merchant_receive_address: plan.merchant_receive_address,
        plan_id: params.plan_id,
        name: params.name,
        amount_usdc: params.amount_usdc,
        interval_seconds: params.interval_seconds,
        trial_seconds: params.trial_seconds,
        timestamp: now,
    });

    msg!(
        "[create_plan] plan={} id={} name='{}' amount={}μUSDC interval={}s trial={}s",
        plan.key(),
        params.plan_id,
        plan.name,
        params.amount_usdc,
        params.interval_seconds,
        params.trial_seconds,
    );

    Ok(())
}

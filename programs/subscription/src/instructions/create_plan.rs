use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{Plan, PlanCreated, PlanStatus},
};

// ────────────────────────────────────────────────────────────
// Instruction parameters — passed as a single struct so the
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
    /// Merchant wallet — pays rent, becomes plan authority
    #[account(mut)]
    pub merchant: Signer<'info>,

    /// USDC SPL mint that this plan is denominated in
    pub usdc_mint: Account<'info, Mint>,

    /// Merchant's USDC ATA — must already exist before creating a plan
    #[account(
        associated_token::mint      = usdc_mint,
        associated_token::authority = merchant,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// New Plan PDA — created here, owned by this program
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

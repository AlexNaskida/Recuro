// ============================================================
// solana-subscription — Non-custodial recurring USDC payments
//
// Funds stay in the subscriber's wallet until each billing event.
// An off-chain keeper calls execute_payment when next_payment_at
// is reached. The program enforces all timing and amounts.
// ============================================================

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq");

#[program]
pub mod subscription {
    use super::*;

    // ── Protocol admin ─────────────────────────────────────────────────────
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        args: InitializeConfigArgs,
    ) -> Result<()> {
        instructions::initialize_config::handler(ctx, args)
    }

    // ── Plan lifecycle (merchant) ──────────────────────────────────────────
    pub fn create_plan(
        ctx: Context<CreatePlan>,
        params: CreatePlanParams,
    ) -> Result<()> {
        instructions::create_plan::handler(ctx, params)
    }

    pub fn update_plan(
        ctx: Context<UpdatePlan>,
        args: UpdatePlanArgs,
    ) -> Result<()> {
        instructions::update_plan::handler(ctx, args)
    }

    pub fn pause_plan(ctx: Context<PausePlan>) -> Result<()> {
        instructions::pause_plan::handler(ctx)
    }

    pub fn archive_plan(ctx: Context<ArchivePlan>) -> Result<()> {
        instructions::archive_plan::handler(ctx)
    }

    // ── Subscription lifecycle (subscriber) ───────────────────────────────
    pub fn create_subscription(ctx: Context<CreateSubscription>) -> Result<()> {
        instructions::create_subscription::handler(ctx)
    }

    pub fn pause_subscription(ctx: Context<PauseSubscription>) -> Result<()> {
        instructions::pause_subscription::handler(ctx)
    }

    pub fn resume_subscription(ctx: Context<ResumeSubscription>) -> Result<()> {
        instructions::resume_subscription::handler(ctx)
    }

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        instructions::cancel_subscription::handler(ctx)
    }

    // ── Billing (keeper) ───────────────────────────────────────────────────
    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        instructions::execute_payment::handler(ctx)
    }
}

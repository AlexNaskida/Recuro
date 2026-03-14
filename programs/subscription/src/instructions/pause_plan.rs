use crate::{
    constants::SEED_PLAN,
    errors::SubscriptionError,
    state::{Plan, PlanStatus},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PausePlan<'info> {
    #[account(mut, address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, merchant.key().as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Active @ SubscriptionError::PlanNotActive,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handler(ctx: Context<PausePlan>) -> Result<()> {
    ctx.accounts.plan.status = PlanStatus::Paused;
    ctx.accounts.plan.updated_at = Clock::get()?.unix_timestamp;
    msg!("[pause_plan] plan={}", ctx.accounts.plan.key());
    Ok(())
}

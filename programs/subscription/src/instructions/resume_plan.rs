use anchor_lang::prelude::*;
use crate::{
    constants::SEED_PLAN,
    errors::SubscriptionError,
    state::{Plan, PlanStatus},
};

#[derive(Accounts)]
pub struct ResumePlan<'info> {
    #[account(mut, address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, merchant.key().as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Paused @ SubscriptionError::PlanNotActive,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handler(ctx: Context<ResumePlan>) -> Result<()> {
    ctx.accounts.plan.status     = PlanStatus::Active;
    ctx.accounts.plan.updated_at = Clock::get()?.unix_timestamp;
    msg!("[resume_plan] plan={}", ctx.accounts.plan.key());
    Ok(())
}

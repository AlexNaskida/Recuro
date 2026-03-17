use crate::{
    constants::SEED_PLAN,
    errors::SubscriptionError,
    state::{Plan, PlanStatus},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UnarchivePlan<'info> {
    #[account(mut, address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, merchant.key().as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Archived @ SubscriptionError::PlanNotArchived,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handler(ctx: Context<UnarchivePlan>) -> Result<()> {
    ctx.accounts.plan.status = PlanStatus::Active;
    ctx.accounts.plan.updated_at = Clock::get()?.unix_timestamp;
    msg!("[unarchive_plan] plan={} -> active", ctx.accounts.plan.key());
    Ok(())
}

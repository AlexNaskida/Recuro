use anchor_lang::prelude::*;
use crate::{
    constants::SEED_PLAN,
    errors::SubscriptionError,
    state::{Plan, PlanArchived, PlanStatus},
};

#[derive(Accounts)]
pub struct ArchivePlan<'info> {
    #[account(mut, address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, merchant.key().as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handler(ctx: Context<ArchivePlan>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.plan.status     = PlanStatus::Archived;
    ctx.accounts.plan.updated_at = now;

    emit!(PlanArchived {
        plan:      ctx.accounts.plan.key(),
        merchant:  ctx.accounts.merchant.key(),
        timestamp: now,
    });

    msg!("[archive_plan] plan={}", ctx.accounts.plan.key());
    Ok(())
}

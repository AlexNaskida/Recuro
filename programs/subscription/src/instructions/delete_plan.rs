use crate::{
    constants::SEED_PLAN,
    errors::SubscriptionError,
    state::{Plan, PlanStatus},
};
use anchor_lang::prelude::*;

#[event]
pub struct PlanDeleted {
    pub plan: Pubkey,
    pub merchant: Pubkey,
    pub plan_id: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct DeletePlan<'info> {
    #[account(mut, address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PLAN, merchant.key().as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        close = merchant,
    )]
    pub plan: Account<'info, Plan>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DeletePlan>) -> Result<()> {
    require!(
        ctx.accounts.plan.status == PlanStatus::Archived,
        SubscriptionError::PlanNotArchived
    );
    require!(
        ctx.accounts.plan.active_subscribers == 0,
        SubscriptionError::PlanHasActiveSubscribers
    );

    let now = Clock::get()?.unix_timestamp;

    emit!(PlanDeleted {
        plan: ctx.accounts.plan.key(),
        merchant: ctx.accounts.merchant.key(),
        plan_id: ctx.accounts.plan.plan_id,
        timestamp: now,
    });

    msg!(
        "[delete_plan] plan={} closed, rent returned to merchant",
        ctx.accounts.plan.key()
    );
    Ok(())
}

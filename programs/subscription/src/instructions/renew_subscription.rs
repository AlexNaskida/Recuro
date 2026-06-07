use anchor_lang::prelude::*;

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{Plan, PlanStatus, ProtocolConfig, Subscription, SubscriptionStatus},
};

// Foundation subscription auto-renews via period reset — no Foundation CPI needed here.
// The SubscriptionAuthority PDA retains its u64::MAX delegation indefinitely;
// execute_payment will resume pulling once the Recuro subscription is back to Active.

#[derive(Accounts)]
pub struct RenewSubscription<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, plan.merchant.as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Active @ SubscriptionError::PlanNotActive,
    )]
    pub plan: Account<'info, Plan>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, plan.key().as_ref(), subscriber.key().as_ref()],
        bump  = subscription.bump,
        constraint = subscription.subscriber == subscriber.key() @ SubscriptionError::UnauthorizedActor,
        constraint = subscription.status == SubscriptionStatus::Expired @ SubscriptionError::SubscriptionNotActive,
    )]
    pub subscription: Account<'info, Subscription>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RenewSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    // Reset Recuro subscription state for another 12 cycles.
    // Foundation SA delegation is already u64::MAX and never expires — no re-approve needed.
    subscription.status = SubscriptionStatus::Active;
    subscription.cycles_remaining = 12;
    subscription.billing_cycles = 12;
    subscription.next_payment_at = now;
    subscription.ended_at = 0;
    subscription.failed_payment_count = 0;
    subscription.amount_usdc = plan.amount_usdc;

    plan.active_subscribers = plan
        .active_subscribers
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    msg!(
        "[renew_subscription] sub={} next_at={}",
        subscription.key(),
        now
    );
    Ok(())
}

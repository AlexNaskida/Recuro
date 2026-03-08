use anchor_lang::prelude::*;
use crate::{
    constants::SEED_SUBSCRIPTION,
    errors::SubscriptionError,
    state::{Plan, Subscription, SubscriptionPaused, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct PauseSubscription<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump  = subscription.bump,
        constraint = subscription.is_active() @ SubscriptionError::SubscriptionNotActive,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(address = subscription.plan)]
    pub plan: Account<'info, Plan>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PauseSubscription>) -> Result<()> {
    let sub       = &mut ctx.accounts.subscription;
    let plan      = &ctx.accounts.plan;
    let authority = ctx.accounts.authority.key();
    let now       = Clock::get()?.unix_timestamp;

    require!(
        authority == sub.subscriber || authority == plan.merchant,
        SubscriptionError::UnauthorizedActor
    );

    sub.status = SubscriptionStatus::Paused;

    emit!(SubscriptionPaused {
        subscription: sub.key(),
        plan:         plan.key(),
        subscriber:   sub.subscriber,
        paused_by:    authority,
        timestamp:    now,
    });

    msg!("[pause_subscription] sub={} by={}", sub.key(), authority);
    Ok(())
}

use anchor_lang::prelude::*;
use crate::{
    constants::SEED_SUBSCRIPTION,
    errors::SubscriptionError,
    state::{Plan, Subscription, SubscriptionResumed, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct ResumeSubscription<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump  = subscription.bump,
        constraint = subscription.is_paused() @ SubscriptionError::SubscriptionPaused,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(address = subscription.plan)]
    pub plan: Account<'info, Plan>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResumeSubscription>) -> Result<()> {
    let sub       = &mut ctx.accounts.subscription;
    let plan      = &ctx.accounts.plan;
    let authority = ctx.accounts.authority.key();
    let now       = Clock::get()?.unix_timestamp;

    require!(
        authority == sub.subscriber || authority == plan.merchant,
        SubscriptionError::UnauthorizedActor
    );

    sub.status          = SubscriptionStatus::Active;
    sub.next_payment_at = now
        .checked_add(plan.interval_seconds)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    emit!(SubscriptionResumed {
        subscription:    sub.key(),
        plan:            plan.key(),
        subscriber:      sub.subscriber,
        next_payment_at: sub.next_payment_at,
        timestamp:       now,
    });

    msg!("[resume_subscription] sub={} next_at={}", sub.key(), sub.next_payment_at);
    Ok(())
}

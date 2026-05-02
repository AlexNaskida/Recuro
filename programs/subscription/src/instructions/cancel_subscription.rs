use crate::{
    constants::SEED_SUBSCRIPTION,
    errors::SubscriptionError,
    state::{Plan, Subscription, SubscriptionCancelled, SubscriptionStatus},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Revoke, Token, TokenAccount};

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    /// Must be subscriber or merchant - validated in handler
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump  = subscription.bump,
        constraint = subscription.status != SubscriptionStatus::Cancelled
            @ SubscriptionError::AlreadyCancelled,
        constraint = subscription.status != SubscriptionStatus::Expired
            @ SubscriptionError::AlreadyExpired,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut, address = subscription.plan)]
    pub plan: Account<'info, Plan>,

    #[account(
        mut,
        address = subscription.subscriber_token_account
            @ SubscriptionError::InvalidSubscriberTokenAccount,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelSubscription>) -> Result<()> {
    let sub = &mut ctx.accounts.subscription;
    let plan = &mut ctx.accounts.plan;
    let authority = ctx.accounts.authority.key();
    let now = Clock::get()?.unix_timestamp;

    require!(
        authority == sub.subscriber || authority == plan.merchant,
        SubscriptionError::UnauthorizedActor
    );

    sub.status = SubscriptionStatus::Cancelled;
    sub.ended_at = now;
    plan.active_subscribers = plan.active_subscribers.saturating_sub(1);

    if authority == sub.subscriber {
        token::revoke(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.subscriber_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ))?;
    }

    emit!(SubscriptionCancelled {
        subscription: sub.key(),
        plan: plan.key(),
        subscriber: sub.subscriber,
        cancelled_by: authority,
        total_paid: sub.total_paid,
        payment_count: sub.payment_count,
        timestamp: now,
    });

    msg!("[cancel_subscription] sub={} by={}", sub.key(), authority);
    Ok(())
}

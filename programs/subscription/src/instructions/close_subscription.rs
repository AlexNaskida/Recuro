use anchor_lang::prelude::*;

use crate::{
    constants::SEED_SUBSCRIPTION,
    errors::SubscriptionError,
    state::{Subscription, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct CloseSubscription<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// Closes the Subscription PDA and returns rent to the subscriber.
    /// Requires terminal status (Cancelled or Expired).
    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump = subscription.bump,
        close = subscriber,
        constraint = subscription.subscriber == subscriber.key() @ SubscriptionError::UnauthorizedActor,
    )]
    pub subscription: Account<'info, Subscription>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseSubscription>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;

    require!(
        subscription.status == SubscriptionStatus::Cancelled
            || subscription.status == SubscriptionStatus::Expired,
        SubscriptionError::SubscriptionNotTerminal
    );

    msg!("[close_subscription] sub={} closed", subscription.key());
    Ok(())
}

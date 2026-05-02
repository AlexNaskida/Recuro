use anchor_lang::prelude::*;
use recuro_guard::cpi::accounts::CloseGuard as GuardCloseGuard;
use recuro_guard::program::RecuroGuard;
use recuro_guard::GuardAccount;

use crate::{
    constants::SEED_SUBSCRIPTION,
    errors::SubscriptionError,
    state::{Subscription, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct CloseSubscription<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump = subscription.bump,
        close = subscriber,
        constraint = subscription.subscriber == subscriber.key() @ SubscriptionError::UnauthorizedActor,
    )]
    pub subscription: Account<'info, Subscription>,

    pub guard_program: Program<'info, RecuroGuard>,

    #[account(
        mut,
        seeds = [b"guard", subscription.key().as_ref()],
        bump = guard_account.bump,
        seeds::program = guard_program.key(),
        constraint = guard_account.subscription == subscription.key(),
    )]
    pub guard_account: Account<'info, GuardAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseSubscription>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;

    require!(
        subscription.status == SubscriptionStatus::Cancelled
            || subscription.status == SubscriptionStatus::Expired,
        SubscriptionError::SubscriptionNotTerminal
    );

    let subscription_account_info = subscription.to_account_info();
    let plan_key = subscription.plan;
    let sub_key = subscription.subscriber;
    let sub_bump = subscription.bump;

    let sub_signer_seeds: &[&[u8]] = &[
        SEED_SUBSCRIPTION,
        plan_key.as_ref(),
        sub_key.as_ref(),
        &[sub_bump],
    ];
    let signer_seeds = &[sub_signer_seeds];

    let cpi_accounts = GuardCloseGuard {
        caller: subscription_account_info,
        guard_account: ctx.accounts.guard_account.to_account_info(),
        subscriber: ctx.accounts.subscriber.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.guard_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    recuro_guard::cpi::close_guard(cpi_context)?;

    msg!("[close_subscription] sub={} closed", subscription.key());
    Ok(())
}

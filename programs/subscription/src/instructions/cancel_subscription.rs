use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};
use std::str::FromStr;

use crate::{
    constants::{FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID, SEED_SUBSCRIPTION},
    errors::SubscriptionError,
    state::{Plan, Subscription, SubscriptionCancelled, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    /// Must be subscriber or merchant — validated in handler
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

    // ── Foundation Subscriptions accounts ────────────────────────────────────
    /// Foundation Subscriptions program
    /// CHECK: Program ID verified by constraint
    #[account(
        constraint = foundation_program.key() == Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID).unwrap()
            @ SubscriptionError::InvalidFoundationProgram
    )]
    pub foundation_program: AccountInfo<'info>,

    /// Foundation Plan PDA — must match the one stored on our Plan account
    /// CHECK: Address verified against plan.foundation_plan_pubkey
    #[account(
        constraint = foundation_plan.key() == plan.foundation_plan_pubkey
            @ SubscriptionError::InvalidFoundationProgram
    )]
    pub foundation_plan: AccountInfo<'info>,

    /// Foundation SubscriptionDelegation PDA — must match the one stored on our Subscription
    /// CHECK: Address verified against subscription.foundation_subscription_pubkey
    #[account(
        mut,
        constraint = foundation_subscription.key() == subscription.foundation_subscription_pubkey
            @ SubscriptionError::InvalidFoundationProgram
    )]
    pub foundation_subscription: AccountInfo<'info>,

    /// Foundation event authority PDA — used by Foundation for on-chain event emission
    /// Seeds on Foundation program: [b"event_authority"]
    /// CHECK: PDA seeds verified by Anchor against Foundation program
    #[account(
        seeds = [b"event_authority"],
        bump,
        seeds::program = foundation_program.key(),
    )]
    pub foundation_event_authority: UncheckedAccount<'info>,

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

    // ── Update Recuro state ───────────────────────────────────────────────────
    sub.status = SubscriptionStatus::Cancelled;
    sub.ended_at = now;
    plan.active_subscribers = plan.active_subscribers.saturating_sub(1);

    // ── CPI: Cancel on Foundation program (subscriber-only) ──────────────────
    // Foundation cancel_subscription (discriminator: 12) sets expires_at_ts on the
    // SubscriptionDelegation account, preventing future pulls by keepers.
    // Only the subscriber can be the signer for Foundation's cancel — so merchant
    // cancellations update Recuro state only; Foundation-side expires at next period end.
    if authority == sub.subscriber {
        let foundation_pid = Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID)
            .map_err(|_| error!(SubscriptionError::InvalidFoundationProgram))?;

        // CancelSubscription accounts (5 accounts, fixed order):
        // [0] subscriber  (signer)
        // [1] plan_pda
        // [2] subscription_pda  (writable)
        // [3] event_authority
        // [4] self_program
        let cancel_ix = Instruction {
            program_id: foundation_pid,
            accounts: vec![
                AccountMeta::new_readonly(ctx.accounts.authority.key(), true),
                AccountMeta::new_readonly(ctx.accounts.foundation_plan.key(), false),
                AccountMeta::new(ctx.accounts.foundation_subscription.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_program.key(), false),
            ],
            data: vec![12u8], // cancel_subscription discriminator, no payload
        };

        invoke(
            &cancel_ix,
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.foundation_plan.to_account_info(),
                ctx.accounts.foundation_subscription.to_account_info(),
                ctx.accounts.foundation_event_authority.to_account_info(),
                ctx.accounts.foundation_program.to_account_info(),
            ],
        )?;
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

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{approve, Approve, Mint, Token, TokenAccount},
};

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{Plan, PlanStatus, Subscription, SubscriptionCreated, SubscriptionStatus},
};

// ─────────────────────────────────────────────────────────────────────────────
// Keeper pattern (no Clockwork):
//   Subscriber approves the Subscription PDA as SPL delegate.
//   An off-chain keeper watches the chain and calls execute_payment
//   when next_payment_at is reached. The program validates timing —
//   a keeper calling early simply gets skipped (Ok(())).
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CreateSubscription<'info> {
    /// Subscriber wallet — pays rent, signs once, keeps funds
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// Plan PDA — verified active and has capacity
    #[account(
        mut,
        seeds = [SEED_PLAN, plan.merchant.as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Active @ SubscriptionError::PlanNotActive,
        constraint = plan.has_capacity()              @ SubscriptionError::PlanAtCapacity,
    )]
    pub plan: Account<'info, Plan>,

    /// New Subscription PDA — one per (plan, subscriber) pair
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [SEED_SUBSCRIPTION, plan.key().as_ref(), subscriber.key().as_ref()],
        bump,
    )]
    pub subscription: Account<'info, Subscription>,

    /// Subscriber's USDC ATA — must exist; funds stay here until billing
    #[account(
        mut,
        associated_token::mint      = usdc_mint,
        associated_token::authority = subscriber,
        constraint = subscriber_token_account.mint == plan.usdc_mint
            @ SubscriptionError::InvalidMint,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// USDC mint — must match the plan's registered mint
    #[account(address = plan.usdc_mint @ SubscriptionError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    // ── Calculate timing ──────────────────────────────────────────────────────
    let trial_ends_at = if plan.trial_seconds > 0 {
        now.checked_add(plan.trial_seconds)
            .ok_or(SubscriptionError::ArithmeticOverflow)?
    } else {
        0
    };

    let next_payment_at = if plan.trial_seconds > 0 {
        now.checked_add(plan.trial_seconds)
            .ok_or(SubscriptionError::ArithmeticOverflow)?
    } else {
        now // charge immediately on subscribe
    };

    // ── Populate Subscription PDA ─────────────────────────────────────────────
    // CRITICAL: amount_usdc is copied from the Plan PDA, never from user input.
    subscription.plan = plan.key();
    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.subscriber_token_account = ctx.accounts.subscriber_token_account.key();
    subscription.amount_usdc = plan.amount_usdc;
    subscription.next_payment_at = next_payment_at;
    subscription.started_at = now;
    subscription.trial_ends_at = trial_ends_at;
    subscription.last_paid_at = 0;
    subscription.ended_at = 0;
    subscription.total_paid = 0;
    subscription.payment_count = 0;
    subscription.failed_payment_count = 0;
    subscription.billing_cycles = 12;
    subscription.cycles_remaining = 12;
    subscription.status = SubscriptionStatus::Active;
    subscription.bump = ctx.bumps.subscription;

    // ── Update Plan counters ──────────────────────────────────────────────────
    plan.active_subscribers = plan
        .active_subscribers
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.total_subscribers_ever = plan
        .total_subscribers_ever
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    // ── Approve Subscription PDA as SPL delegate ──────────────────────────────
    // Covers 12 billing cycles. Keeper calls execute_payment; the program
    // signs the transfer via PDA seeds (no private key needed).
    // Note: the fee is included in approval
    let fee_per_cycle = (plan.amount_usdc as u128)
        .saturating_mul(25)
        .saturating_div(10_000) as u64;
    let total_per_cycle = plan
        .amount_usdc
        .checked_add(fee_per_cycle)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    let delegate_amount = total_per_cycle
        .checked_mul(12)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    approve(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.subscriber_token_account.to_account_info(),
                delegate: subscription.to_account_info(),
                authority: ctx.accounts.subscriber.to_account_info(),
            },
        ),
        delegate_amount,
    )?;

    // ── Emit event ────────────────────────────────────────────────────────────
    emit!(SubscriptionCreated {
        subscription: subscription.key(),
        plan: plan.key(),
        subscriber: ctx.accounts.subscriber.key(),
        amount_usdc: subscription.amount_usdc,
        trial_ends_at,
        next_payment_at,
        timestamp: now,
    });

    msg!(
        "[create_subscription] sub={} plan={} subscriber={} amount={} next_at={}",
        subscription.key(),
        plan.key(),
        ctx.accounts.subscriber.key(),
        subscription.amount_usdc,
        next_payment_at,
    );

    Ok(())
}

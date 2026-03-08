use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{
        PaymentExecuted, PaymentFailed, Plan, ProtocolConfig,
        Subscription, SubscriptionExpired, SubscriptionStatus,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fee model: "fee on top"
//   Subscriber pays:  plan_amount + fee
//   Merchant gets:    plan_amount  (full advertised price, always)
//   Treasury gets:    fee
//   fee = plan_amount * fee_bps / 10_000
//
// Caller: any keeper (off-chain bot that watches next_payment_at).
// The program validates timing — early calls are silently skipped.
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// Anyone may call this — timing is enforced by the program, not the signer.
    pub keeper: Signer<'info>,

    /// Protocol config — reads fee_bps and treasury
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump  = subscription.bump,
        constraint = subscription.is_active() @ SubscriptionError::SubscriptionNotActive,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut, address = subscription.plan)]
    pub plan: Account<'info, Plan>,

    /// Subscriber's USDC ATA — source of ALL funds (plan amount + fee)
    #[account(
        mut,
        address = subscription.subscriber_token_account
            @ SubscriptionError::InvalidSubscriberTokenAccount,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// Merchant's USDC ATA — receives the full plan amount
    #[account(
        mut,
        address = plan.merchant_token_account
            @ SubscriptionError::InvalidMerchantTokenAccount,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// Protocol treasury ATA — receives the fee
    #[account(
        mut,
        constraint = treasury_token_account.owner == config.treasury
            @ SubscriptionError::InvalidTreasuryTokenAccount,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// CHECK: read-only reference to the subscriber wallet
    #[account(address = subscription.subscriber)]
    pub subscriber: UncheckedAccount<'info>,

    pub token_program:  Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecutePayment>) -> Result<()> {
    let now          = Clock::get()?.unix_timestamp;
    let config       = &ctx.accounts.config;
    let subscription_account_info = ctx.accounts.subscription.to_account_info();
    let subscription = &mut ctx.accounts.subscription;
    let plan         = &mut ctx.accounts.plan;

    // Guard: still in trial period
    if subscription.is_in_trial(now) {
        msg!("[execute_payment] skipped: trial ends at {}", subscription.trial_ends_at);
        return Ok(());
    }

    // Guard: not due yet
    if !subscription.is_payment_due(now) {
        msg!("[execute_payment] skipped: next_payment_at={} now={}", subscription.next_payment_at, now);
        return Ok(());
    }

    // ── Calculate amounts ──────────────────────────────────────────────────────
    //   plan_amount → merchant   |   fee → treasury   |   subscriber pays both
    let plan_amount: u64 = subscription.amount_usdc;
    let fee: u64 = (plan_amount as u128)
        .saturating_mul(config.fee_bps as u128)
        .saturating_div(10_000) as u64;
    let total_charge: u64 = plan_amount
        .checked_add(fee)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    // Guard: insufficient balance
    let balance = ctx.accounts.subscriber_token_account.amount;
    if balance < total_charge {
        subscription.failed_payment_count = subscription
            .failed_payment_count.checked_add(1).unwrap_or(u8::MAX);
        let will_expire = subscription.should_auto_expire();

        emit!(PaymentFailed {
            subscription: subscription.key(),
            plan:         plan.key(),
            subscriber:   subscription.subscriber,
            reason:       "insufficient_balance".to_string(),
            failed_count: subscription.failed_payment_count,
            will_expire,
            timestamp:    now,
        });

        msg!("[execute_payment] FAILED: need {} ({}+{} fee), have {}. failures={}/{}",
            total_charge, plan_amount, fee, balance,
            subscription.failed_payment_count, MAX_FAILED_PAYMENTS);

        if will_expire {
            subscription.status   = SubscriptionStatus::Expired;
            subscription.ended_at = now;
            plan.active_subscribers = plan.active_subscribers.saturating_sub(1);
            emit!(SubscriptionExpired {
                subscription:  subscription.key(),
                plan:          plan.key(),
                subscriber:    subscription.subscriber,
                total_paid:    subscription.total_paid,
                payment_count: subscription.payment_count,
                timestamp:     now,
            });
        }
        return Ok(());
    }

    // ── PDA signer seeds ──────────────────────────────────────────────────────
    // Save account_info references BEFORE taking mutable borrow of subscription
    let plan_key    = subscription.plan;
    let sub_key     = subscription.subscriber;
    let sub_bump    = subscription.bump;

    let seeds: &[&[u8]] = &[
        SEED_SUBSCRIPTION,
        plan_key.as_ref(),
        sub_key.as_ref(),
        &[sub_bump],
    ];
    let signer_seeds = &[seeds];

    // ── Transfer 1: plan_amount → merchant ────────────────────────────────────
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from:      ctx.accounts.subscriber_token_account.to_account_info(),
                to:        ctx.accounts.merchant_token_account.to_account_info(),
                authority: subscription_account_info.clone(),
            },
            signer_seeds,
        ),
        plan_amount,
    )?;

    // ── Transfer 2: fee → treasury ────────────────────────────────────────────
    if fee > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from:      ctx.accounts.subscriber_token_account.to_account_info(),
                    to:        ctx.accounts.treasury_token_account.to_account_info(),
                    authority: subscription_account_info.clone(),
                },
                signer_seeds,
            ),
            fee,
        )?;
    }


    // ── Update state ──────────────────────────────────────────────────────────
    subscription.failed_payment_count = 0;
    subscription.last_paid_at         = now;
    subscription.total_paid           = subscription.total_paid
        .checked_add(total_charge).ok_or(SubscriptionError::ArithmeticOverflow)?;
    subscription.payment_count        = subscription.payment_count
        .checked_add(1).ok_or(SubscriptionError::ArithmeticOverflow)?;
    subscription.next_payment_at      = now
        .checked_add(plan.interval_seconds).ok_or(SubscriptionError::ArithmeticOverflow)?;

    plan.total_revenue = plan.total_revenue
        .checked_add(plan_amount).ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.fees_paid = plan.fees_paid
        .checked_add(fee).ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.successful_payments = plan.successful_payments
        .checked_add(1).ok_or(SubscriptionError::ArithmeticOverflow)?;

    emit!(PaymentExecuted {
        subscription:  subscription.key(),
        plan:          plan.key(),
        subscriber:    subscription.subscriber,
        merchant:      plan.merchant,
        amount_usdc:   plan_amount,
        fee_usdc:      fee,
        total_charged: total_charge,
        payment_count: subscription.payment_count,
        timestamp:     now,
    });

    msg!("[execute_payment] SUCCESS: {} to merchant + {} fee (total {}). payment #{}",
        plan_amount, fee, total_charge, subscription.payment_count);

    Ok(())
}

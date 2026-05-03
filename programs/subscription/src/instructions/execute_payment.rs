use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};
use recuro_guard::cpi::accounts::AuthorizePayment as GuardAuthorizePayment;
use recuro_guard::program::RecuroGuard;
use recuro_guard::GuardAccount;

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{
        PaymentExecuted, PaymentFailed, Plan, ProtocolConfig, Subscription, SubscriptionExpired,
        SubscriptionStatus,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fee model: "fee on top"
//   Subscriber pays:  plan_amount + fee
//   Merchant gets:    plan_amount  (full advertised price, always)
//   Keeper gets:      60% of fee (incentive for execution)
//   Treasury gets:    40% of fee (protocol revenue)
//   fee = plan_amount * fee_bps / 10_000
//
// Keeper Identity:
//   - Keeper is identified by their public key (the signer of the transaction)
//   - Keeper must provide their own USDC ATA which receives their 60% reward
//   - All keeper accounts are verified via Anchor constraints
//
// Caller: any keeper (off-chain bot that watches next_payment_at).
// The program validates timing - early calls are silently skipped.
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// Anyone may call this - timing is enforced by the program, not the signer.
    pub keeper: Signer<'info>,

    /// Protocol config - reads fee_bps and treasury
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, ProtocolConfig>>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump  = subscription.bump,
        constraint = subscription.is_active() @ SubscriptionError::SubscriptionNotActive,
    )]
    pub subscription: Box<Account<'info, Subscription>>,

    #[account(mut, address = subscription.plan)]
    pub plan: Box<Account<'info, Plan>>,

    /// Subscriber's USDC ATA - source of ALL funds (plan amount + fee)
    #[account(
        mut,
        address = subscription.subscriber_token_account
            @ SubscriptionError::InvalidSubscriberTokenAccount,
    )]
    pub subscriber_token_account: Box<Account<'info, TokenAccount>>,

    /// Merchant's USDC ATA - receives the full plan amount
    #[account(
        mut,
        address = plan.merchant_token_account
            @ SubscriptionError::InvalidMerchantTokenAccount,
    )]
    pub merchant_token_account: Box<Account<'info, TokenAccount>>,

    /// Guard account - validates payment authorization and timing
    #[account(
        mut,
        seeds = [b"guard", subscription.key().as_ref()],
        bump = guard_account.bump,
        constraint = guard_account.subscription == subscription.key(),
    )]
    pub guard_account: Box<Account<'info, GuardAccount>>,

    /// USDC mint for guarded transfer_checked
    #[account(address = plan.usdc_mint @ SubscriptionError::InvalidMint)]
    pub usdc_mint: Box<Account<'info, Mint>>,

    /// Protocol treasury ATA - receives 40% of the fee
    #[account(
        mut,
        constraint = treasury_token_account.owner == config.treasury
            @ SubscriptionError::InvalidTreasuryTokenAccount,
        constraint = treasury_token_account.mint == plan.usdc_mint
            @ SubscriptionError::InvalidTreasuryTokenAccount,
    )]
    pub treasury_token_account: Box<Account<'info, TokenAccount>>,

    /// Keeper's USDC ATA - receives 60% of the fee as reward
    /// Must be owned by the keeper signer to ensure rewards go to the correct address
    #[account(
        mut,
        constraint = keeper_token_account.owner == keeper.key()
            @ SubscriptionError::InvalidMint,
        constraint = keeper_token_account.mint == plan.usdc_mint
            @ SubscriptionError::InvalidMint,
    )]
    pub keeper_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: read-only reference to the subscriber wallet
    #[account(address = subscription.subscriber)]
    pub subscriber: UncheckedAccount<'info>,

    /// Guard program
    pub guard_program: Program<'info, RecuroGuard>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ExecutePayment>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.config;
    let subscription_account_info = ctx.accounts.subscription.to_account_info();
    let subscription = &mut ctx.accounts.subscription;
    let plan = &mut ctx.accounts.plan;

    // Guard: still in trial period
    if subscription.is_in_trial(now) {
        msg!(
            "[execute_payment] skipped: trial ends at {}",
            subscription.trial_ends_at
        );
        return Ok(());
    }

    // Guard: not due yet
    if !subscription.is_payment_due(now) {
        msg!(
            "[execute_payment] skipped: next_payment_at={} now={}",
            subscription.next_payment_at,
            now
        );
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
        subscription.failed_payment_count = subscription.failed_payment_count.saturating_add(1);

        let will_expire = subscription.should_auto_expire();

        emit!(PaymentFailed {
            subscription: subscription.key(),
            plan: plan.key(),
            subscriber: subscription.subscriber,
            reason: "insufficient_balance".to_string(),
            failed_count: subscription.failed_payment_count,
            will_expire,
            timestamp: now,
        });

        msg!(
            "[execute_payment] FAILED: need {} ({}+{} fee), have {}. failures={}/{}",
            total_charge,
            plan_amount,
            fee,
            balance,
            subscription.failed_payment_count,
            MAX_FAILED_PAYMENTS
        );

        if will_expire {
            subscription.status = SubscriptionStatus::Expired;
            subscription.ended_at = now;
            plan.active_subscribers = plan.active_subscribers.saturating_sub(1);
            emit!(SubscriptionExpired {
                subscription: subscription.key(),
                plan: plan.key(),
                subscriber: subscription.subscriber,
                total_paid: subscription.total_paid,
                payment_count: subscription.payment_count,
                timestamp: now,
            });
        }
        return Ok(());
    }

    // ── PDA signer seeds ──────────────────────────────────────────────────────
    // Save account_info references BEFORE taking mutable borrow of subscription
    let plan_key = subscription.plan;
    let sub_key = subscription.subscriber;
    let sub_bump = subscription.bump;

    let seeds: &[&[u8]] = &[
        SEED_SUBSCRIPTION,
        plan_key.as_ref(),
        sub_key.as_ref(),
        &[sub_bump],
    ];
    let signer_seeds = &[seeds];

    // ── Guard: Call authorize_payment via CPI ─────────────────────────────────
    // The Guard account validates timing, authorization, and executes the merchant transfer
    let cpi_accounts = GuardAuthorizePayment {
        caller: subscription_account_info.clone(),
        guard_account: ctx.accounts.guard_account.to_account_info(),
        subscriber_token_account: ctx.accounts.subscriber_token_account.to_account_info(),
        merchant_receive_token_account: ctx.accounts.merchant_token_account.to_account_info(),
        usdc_mint: ctx.accounts.usdc_mint.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        clock: ctx.accounts.clock.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.guard_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    recuro_guard::cpi::authorize_payment(cpi_context)?;

    // ── Transfer 2: Split fee between keeper (60%) and treasury (40%) ─────────
    if fee > 0 {
        // Calculate keeper reward (60% of fee) and treasury portion (40%)
        let keeper_reward: u64 = (fee as u128).saturating_mul(60).saturating_div(100) as u64;
        let treasury_portion: u64 = fee
            .checked_sub(keeper_reward)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;

        // Transfer keeper reward (keeper identity verified via keeper_token_account.owner constraint)
        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.subscriber_token_account.to_account_info(),
                    to: ctx.accounts.keeper_token_account.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    authority: subscription_account_info.clone(),
                },
                signer_seeds,
            ),
            keeper_reward,
            ctx.accounts.usdc_mint.decimals,
        )?;

        // Transfer treasury portion
        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.subscriber_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    authority: subscription_account_info.clone(),
                },
                signer_seeds,
            ),
            treasury_portion,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }

    // ── Update state ──────────────────────────────────────────────────────────
    subscription.failed_payment_count = 0;
    subscription.last_paid_at = now;
    subscription.total_paid = subscription
        .total_paid
        .checked_add(total_charge)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    subscription.payment_count = subscription
        .payment_count
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    plan.total_revenue = plan
        .total_revenue
        .checked_add(plan_amount)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.fees_paid = plan
        .fees_paid
        .checked_add(fee)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.successful_payments = plan
        .successful_payments
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.updated_at = now;

    subscription.cycles_remaining = subscription.cycles_remaining.saturating_sub(1);

    if subscription.cycles_remaining == 0 {
        subscription.status = SubscriptionStatus::Expired;
        subscription.ended_at = now;
        plan.active_subscribers = plan.active_subscribers.saturating_sub(1);
        emit!(SubscriptionExpired {
            subscription: subscription.key(),
            plan: plan.key(),
            subscriber: subscription.subscriber,
            total_paid: subscription.total_paid,
            payment_count: subscription.payment_count,
            timestamp: now,
        });
        msg!("[execute_payment] 12 cycles complete - subscription expired cleanly");
    } else {
        subscription.next_payment_at = now
            .checked_add(plan.interval_seconds)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;
        msg!(
            "[execute_payment] cycles_remaining={}",
            subscription.cycles_remaining
        );
    }

    emit!(PaymentExecuted {
        subscription: subscription.key(),
        plan: plan.key(),
        subscriber: subscription.subscriber,
        merchant: plan.merchant,
        amount_usdc: plan_amount,
        fee_usdc: fee,
        total_charged: total_charge,
        payment_count: subscription.payment_count,
        timestamp: now,
    });

    msg!(
        "[execute_payment] SUCCESS: {} to merchant + {} fee (total {}). payment #{}",
        plan_amount,
        fee,
        total_charge,
        subscription.payment_count
    );

    Ok(())
}

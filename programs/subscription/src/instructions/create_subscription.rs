use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{approve, Approve, Mint, Token, TokenAccount},
};
use recuro_guard::cpi::accounts::InitializeGuard as GuardInitializeGuard;
use recuro_guard::program::RecuroGuard;

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{
        Plan, PlanStatus, ProtocolConfig, Subscription, SubscriptionCreated, SubscriptionStatus,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Keeper pattern (no Clockwork):
//   Subscriber approves the Subscription PDA as SPL delegate.
//   An off-chain keeper watches the chain and calls execute_payment
//   when next_payment_at is reached. The program validates timing -
//   a keeper calling early simply gets skipped (Ok(())).
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CreateSubscription<'info> {
    /// Subscriber wallet - pays rent, signs once, keeps funds
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// Plan PDA - verified active and has capacity
    #[account(
        mut,
        seeds = [SEED_PLAN, plan.merchant.as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Active @ SubscriptionError::PlanNotActive,
        constraint = plan.has_capacity()              @ SubscriptionError::PlanAtCapacity,
    )]
    pub plan: Account<'info, Plan>,

    /// Protocol config - provides the live fee basis points
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    /// Subscription PDA - created on first subscribe, reused on re-subscribe after cancel/expiry
    #[account(
        init_if_needed,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [SEED_SUBSCRIPTION, plan.key().as_ref(), subscriber.key().as_ref()],
        bump,
    )]
    pub subscription: Account<'info, Subscription>,

    /// Subscriber's USDC ATA - must exist; funds stay here until billing
    #[account(
        mut,
        associated_token::mint      = usdc_mint,
        associated_token::authority = subscriber,
        constraint = subscriber_token_account.mint == plan.usdc_mint
            @ SubscriptionError::InvalidMint,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// USDC mint - must match the plan's registered mint
    #[account(address = plan.usdc_mint @ SubscriptionError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,

    /// Merchant receive ATA (from plan) - passed through to guard init
    #[account(
        mut,
        address = plan.merchant_token_account @ SubscriptionError::InvalidMerchantTokenAccount,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// Guard program
    pub guard_program: Program<'info, RecuroGuard>,

    /// Guard PDA - created for this subscription, authorizes payments
    /// CHECK: PDA address is verified by seeds; account is initialized in guard CPI
    #[account(
        mut,
        seeds = [b"guard", subscription.key().as_ref()],
        bump,
        seeds::program = guard_program.key(),
    )]
    pub guard_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let config = &ctx.accounts.config;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    // ── Guard: block re-subscribe if a non-terminal subscription exists ───────
    // started_at == 0 means the account was just created (init_if_needed path).
    if subscription.started_at != 0 {
        require!(
            subscription.status == SubscriptionStatus::Cancelled
                || subscription.status == SubscriptionStatus::Expired,
            SubscriptionError::ActiveSubscriptionExists
        );
    }

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

    // ── Approve Guard PDA as SPL delegate ──────────────────────────────────────
    // The Guard PDA handles payment transfers. We approve it for the full
    // amount across 12 billing cycles (including fees).
    // Note: the fee is included in approval
    let fee_per_cycle = (plan.amount_usdc as u128)
        .saturating_mul(config.fee_bps as u128)
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
                delegate: ctx.accounts.guard_account.to_account_info(),
                authority: ctx.accounts.subscriber.to_account_info(),
            },
        ),
        delegate_amount,
    )?;

    // ── Initialize Guard via CPI ──────────────────────────────────────────────
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

    let cpi_accounts = GuardInitializeGuard {
        recuro_program: subscription_account_info.clone(),
        subscription: subscription_account_info,
        subscriber: ctx.accounts.subscriber.to_account_info(),
        guard_account: ctx.accounts.guard_account.to_account_info(),
        subscriber_token_account: ctx.accounts.subscriber_token_account.to_account_info(),
        merchant_receive_token_account: ctx.accounts.merchant_token_account.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.guard_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    recuro_guard::cpi::initialize_guard(cpi_context, plan.amount_usdc, plan.interval_seconds)?;

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

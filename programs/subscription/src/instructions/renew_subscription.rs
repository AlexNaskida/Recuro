use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{approve, Approve, Mint, Token, TokenAccount},
};

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{Plan, PlanStatus, Subscription, SubscriptionStatus},
};

#[derive(Accounts)]
pub struct RenewSubscription<'info> {
    #[account(mut)]
    pub subscriber: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, plan.merchant.as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status == PlanStatus::Active @ SubscriptionError::PlanNotActive,
    )]
    pub plan: Account<'info, Plan>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, plan.key().as_ref(), subscriber.key().as_ref()],
        bump  = subscription.bump,
        constraint = subscription.subscriber == subscriber.key() @ SubscriptionError::UnauthorizedActor,
        constraint = subscription.status == SubscriptionStatus::Expired @ SubscriptionError::SubscriptionNotActive,
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        associated_token::mint      = usdc_mint,
        associated_token::authority = subscriber,
        constraint = subscriber_token_account.mint == plan.usdc_mint @ SubscriptionError::InvalidMint,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    #[account(address = plan.usdc_mint @ SubscriptionError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RenewSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    let next_payment_at = now
        .checked_add(plan.trial_seconds)
        .ok_or(SubscriptionError::ArithmeticOverflow)?
        .checked_add(plan.interval_seconds)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    // Reset subscription
    subscription.status = SubscriptionStatus::Active;
    subscription.cycles_remaining = 12;
    subscription.billing_cycles = 12;
    subscription.next_payment_at = now; // charge immediately
    subscription.ended_at = 0;
    subscription.failed_payment_count = 0;
    subscription.amount_usdc = plan.amount_usdc; // refresh price

    plan.active_subscribers = plan
        .active_subscribers
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    // Re-approve delegate
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

    msg!(
        "[renew_subscription] sub={} next_at={}",
        subscription.key(),
        now
    );
    Ok(())
}

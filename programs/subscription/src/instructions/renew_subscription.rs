use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{approve, Approve, Mint, Token, TokenAccount},
};
use recuro_guard::cpi::accounts::ResetLastExecuted as GuardResetLastExecuted;
use recuro_guard::program::RecuroGuard;
use recuro_guard::GuardAccount;

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{Plan, PlanStatus, ProtocolConfig, Subscription, SubscriptionStatus},
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

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

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
        seeds = [b"guard", subscription.key().as_ref()],
        bump = guard_account.bump,
        seeds::program = guard_program.key(),
        constraint = guard_account.subscription == subscription.key(),
    )]
    pub guard_account: Account<'info, GuardAccount>,

    #[account(
        mut,
        associated_token::mint      = usdc_mint,
        associated_token::authority = subscriber,
        constraint = subscriber_token_account.mint == plan.usdc_mint @ SubscriptionError::InvalidMint,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    #[account(address = plan.usdc_mint @ SubscriptionError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,
    pub guard_program: Program<'info, RecuroGuard>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RenewSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let config = &ctx.accounts.config;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    subscription.status = SubscriptionStatus::Active;
    subscription.cycles_remaining = 12;
    subscription.billing_cycles = 12;
    subscription.next_payment_at = now;
    subscription.ended_at = 0;
    subscription.failed_payment_count = 0;
    subscription.amount_usdc = plan.amount_usdc;

    plan.active_subscribers = plan
        .active_subscribers
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

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
                delegate: subscription.to_account_info(),
                authority: ctx.accounts.subscriber.to_account_info(),
            },
        ),
        delegate_amount,
    )?;

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

    let reset_accounts = GuardResetLastExecuted {
        caller: subscription_account_info.clone(),
        guard_account: ctx.accounts.guard_account.to_account_info(),
    };
    let reset_context = CpiContext::new_with_signer(
        ctx.accounts.guard_program.to_account_info(),
        reset_accounts,
        signer_seeds,
    );

    recuro_guard::cpi::reset_last_executed(reset_context)?;

    msg!(
        "[renew_subscription] sub={} next_at={}",
        subscription.key(),
        now
    );
    Ok(())
}

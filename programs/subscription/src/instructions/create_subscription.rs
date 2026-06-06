use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use std::str::FromStr;

use crate::{
    constants::*,
    errors::SubscriptionError,
    state::{
        Plan, PlanStatus, ProtocolConfig, Subscription, SubscriptionCreated, SubscriptionStatus,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Keeper pattern (Foundation-backed):
//   Foundation's initialize_subscription_authority sets up a SubscriptionAuthority
//   PDA as the SPL delegate (u64::MAX). The Foundation's subscribe instruction
//   creates a SubscriptionDelegation PDA recording the subscriber's consent.
//   An off-chain keeper calls execute_payment when next_payment_at is reached.
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

    /// Protocol config — retained for ABI/IDL compatibility; fee calc moved to execute_payment
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

    /// Subscriber's USDC ATA - Foundation init_subscription_authority sets this as delegated
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

    /// Merchant receive ATA (from plan) - passed through to Foundation subscribe
    #[account(
        mut,
        address = plan.merchant_token_account @ SubscriptionError::InvalidMerchantTokenAccount,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    /// Merchant wallet — required by Foundation subscribe CPI
    /// CHECK: Address verified to match plan.merchant
    #[account(address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: AccountInfo<'info>,

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

    /// Foundation SubscriptionAuthority PDA — one per (subscriber, mint) pair
    /// Seeds on Foundation program: [b"SubscriptionAuthority", subscriber, mint]
    /// Created (or refreshed) by Foundation init_subscription_authority CPI
    /// CHECK: PDA seeds verified by Anchor against Foundation program
    #[account(
        mut,
        seeds = [b"SubscriptionAuthority", subscriber.key().as_ref(), usdc_mint.key().as_ref()],
        bump,
        seeds::program = foundation_program.key(),
    )]
    pub foundation_subscription_authority: UncheckedAccount<'info>,

    /// Foundation SubscriptionDelegation PDA — created by Foundation subscribe CPI
    /// Seeds on Foundation program: [b"subscription", foundation_plan, subscriber]
    /// CHECK: PDA seeds verified by Anchor against Foundation program
    #[account(
        mut,
        seeds = [b"subscription", foundation_plan.key().as_ref(), subscriber.key().as_ref()],
        bump,
        seeds::program = foundation_program.key(),
    )]
    pub foundation_subscription: UncheckedAccount<'info>,

    /// Foundation event authority PDA — used by Foundation for on-chain event emission
    /// Seeds on Foundation program: [b"event_authority"]
    /// CHECK: PDA seeds verified by Anchor against Foundation program
    #[account(
        seeds = [b"event_authority"],
        bump,
        seeds::program = foundation_program.key(),
    )]
    pub foundation_event_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreateSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    // ── Guard: block re-subscribe if a non-terminal subscription exists ───────
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
    subscription.foundation_subscription_pubkey = ctx.accounts.foundation_subscription.key();

    // ── Update Plan counters ──────────────────────────────────────────────────
    plan.active_subscribers = plan
        .active_subscribers
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    plan.total_subscribers_ever = plan
        .total_subscribers_ever
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    // ── CPI 1: Initialize Foundation SubscriptionAuthority ────────────────────
    // Creates (or refreshes) the SA PDA and sets it as SPL delegate with u64::MAX.
    // Discriminator 0; no instruction data payload beyond the discriminator.
    {
        let foundation_pid = Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID)
            .map_err(|_| error!(SubscriptionError::InvalidFoundationProgram))?;

        let init_sa_ix = Instruction {
            program_id: foundation_pid,
            accounts: vec![
                AccountMeta::new(ctx.accounts.subscriber.key(), true),
                AccountMeta::new(ctx.accounts.foundation_subscription_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.usdc_mint.key(), false),
                AccountMeta::new(ctx.accounts.subscriber_token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            ],
            data: vec![0u8], // discriminator only
        };

        invoke(
            &init_sa_ix,
            &[
                ctx.accounts.subscriber.to_account_info(),
                ctx.accounts.foundation_subscription_authority.to_account_info(),
                ctx.accounts.usdc_mint.to_account_info(),
                ctx.accounts.subscriber_token_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
    }

    // ── CPI 2: Foundation subscribe — creates SubscriptionDelegation PDA ─────
    // SubscribeData layout (repr(C, packed), 73 bytes):
    //   plan_id:                            u64 (8)
    //   plan_bump:                          u8  (1)
    //   expected_mint:                      [u8;32]
    //   expected_amount:                    u64 (8)
    //   expected_period_hours:              u64 (8)
    //   expected_created_at:                i64 (8)
    //   expected_subscription_authority_init_id: i64 (8)
    {
        let foundation_pid = Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID)
            .map_err(|_| error!(SubscriptionError::InvalidFoundationProgram))?;

        // Read Foundation Plan account data to get plan_bump and created_at.
        // Plan layout (repr(C, packed), 491 bytes):
        //   [0]     discriminator (u8)
        //   [1..33] owner (Address)
        //   [33]    bump (u8)             ← plan_bump
        //   [34]    status (u8)
        //   [35..]  PlanData:
        //     [75..83] terms.amount
        //     [83..91] terms.period_hours
        //     [91..99] terms.created_at   ← expected_created_at
        let foundation_plan_data = ctx.accounts.foundation_plan.try_borrow_data()?;
        require!(
            foundation_plan_data.len() >= 99,
            SubscriptionError::InvalidFoundationProgram
        );
        let plan_bump = foundation_plan_data[33];
        let mut created_at_bytes = [0u8; 8];
        created_at_bytes.copy_from_slice(&foundation_plan_data[91..99]);
        let foundation_created_at = i64::from_le_bytes(created_at_bytes);
        drop(foundation_plan_data);

        // Read init_id from the Foundation SA account (just initialized in CPI 1).
        // SA layout (repr(C, packed), 106 bytes):
        //   [97]      bump (u8)
        //   [98..106] init_id (i64)
        let sa_data = ctx.accounts.foundation_subscription_authority.try_borrow_data()?;
        require!(
            sa_data.len() >= 106,
            SubscriptionError::InvalidFoundationProgram
        );
        let mut init_id_bytes = [0u8; 8];
        init_id_bytes.copy_from_slice(&sa_data[98..106]);
        let sa_init_id = i64::from_le_bytes(init_id_bytes);
        drop(sa_data);

        let period_hours = (plan.interval_seconds / 3600).max(1) as u64;

        let mut subscribe_data: Vec<u8> = Vec::with_capacity(74);
        subscribe_data.push(11u8); // subscribe discriminator
        subscribe_data.extend_from_slice(&plan.plan_id.to_le_bytes()); // plan_id
        subscribe_data.push(plan_bump); // plan_bump
        subscribe_data.extend_from_slice(ctx.accounts.usdc_mint.key().as_ref()); // expected_mint
        subscribe_data.extend_from_slice(&plan.amount_usdc.to_le_bytes()); // expected_amount
        subscribe_data.extend_from_slice(&period_hours.to_le_bytes()); // expected_period_hours
        subscribe_data.extend_from_slice(&foundation_created_at.to_le_bytes()); // expected_created_at
        subscribe_data.extend_from_slice(&sa_init_id.to_le_bytes()); // expected_sa_init_id

        let subscribe_ix = Instruction {
            program_id: foundation_pid,
            accounts: vec![
                AccountMeta::new(ctx.accounts.subscriber.key(), true),
                AccountMeta::new_readonly(plan.merchant, false),
                AccountMeta::new_readonly(ctx.accounts.foundation_plan.key(), false),
                AccountMeta::new(ctx.accounts.foundation_subscription.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_subscription_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_program.key(), false),
            ],
            data: subscribe_data,
        };

        invoke(
            &subscribe_ix,
            &[
                ctx.accounts.subscriber.to_account_info(),
                ctx.accounts.merchant.to_account_info(),
                ctx.accounts.foundation_plan.to_account_info(),
                ctx.accounts.foundation_subscription.to_account_info(),
                ctx.accounts.foundation_subscription_authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.foundation_event_authority.to_account_info(),
                ctx.accounts.foundation_program.to_account_info(),
            ],
        )?;
    }

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
        "[create_subscription] sub={} plan={} subscriber={} amount={} next_at={} foundation_sub={}",
        subscription.key(),
        plan.key(),
        ctx.accounts.subscriber.key(),
        subscription.amount_usdc,
        next_payment_at,
        subscription.foundation_subscription_pubkey,
    );

    Ok(())
}

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};
use std::str::FromStr;

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
// Transfer flow:
//   1. Foundation transfer_subscription: subscriber → merchant (plan_amount)
//      Foundation's SubscriptionAuthority PDA acts as the SPL delegate.
//   2. token::transfer_checked: subscriber → keeper ATA (60% of fee)
//   3. token::transfer_checked: subscriber → treasury ATA (40% of fee)
//      Both fee transfers are signed by the Subscription PDA as delegate.
//      NOTE: keeper/treasury fee transfers use the Subscription PDA as authority
//      because the Subscription PDA retains its own u64::MAX delegate slot
//      TODO session 2 — re-route fee transfers through Foundation SA
//
// Caller: any keeper (off-chain bot that watches next_payment_at).
// The program validates timing — early calls are silently skipped.
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    /// Anyone may call this — timing is enforced by the program, not the signer.
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

    /// Subscriber's USDC ATA — source of ALL funds (plan amount + fee)
    #[account(
        mut,
        address = subscription.subscriber_token_account
            @ SubscriptionError::InvalidSubscriberTokenAccount,
    )]
    pub subscriber_token_account: Box<Account<'info, TokenAccount>>,

    /// Merchant's USDC ATA — receives the full plan amount via Foundation CPI
    #[account(
        mut,
        address = plan.merchant_token_account
            @ SubscriptionError::InvalidMerchantTokenAccount,
    )]
    pub merchant_token_account: Box<Account<'info, TokenAccount>>,

    /// USDC mint for transfer_checked fee splits
    #[account(address = plan.usdc_mint @ SubscriptionError::InvalidMint)]
    pub usdc_mint: Box<Account<'info, Mint>>,

    /// Protocol treasury ATA — receives 40% of the fee
    #[account(
        mut,
        constraint = treasury_token_account.owner == config.treasury
            @ SubscriptionError::InvalidTreasuryTokenAccount,
        constraint = treasury_token_account.mint == plan.usdc_mint
            @ SubscriptionError::InvalidTreasuryTokenAccount,
    )]
    pub treasury_token_account: Box<Account<'info, TokenAccount>>,

    /// Keeper's USDC ATA — receives 60% of the fee as reward
    #[account(
        mut,
        constraint = keeper_token_account.owner == keeper.key()
            @ SubscriptionError::InvalidMint,
        constraint = keeper_token_account.mint == plan.usdc_mint
            @ SubscriptionError::InvalidMint,
    )]
    pub keeper_token_account: Box<Account<'info, TokenAccount>>,

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

    /// Foundation SubscriptionAuthority PDA — the SPL delegate (u64::MAX approval)
    /// Seeds on Foundation program: [b"SubscriptionAuthority", subscriber, mint]
    /// CHECK: PDA seeds verified by Anchor against Foundation program
    #[account(
        seeds = [b"SubscriptionAuthority", subscription.subscriber.as_ref(), plan.usdc_mint.as_ref()],
        bump,
        seeds::program = foundation_program.key(),
    )]
    pub foundation_subscription_authority: UncheckedAccount<'info>,

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

    // ── PDA signer seeds for Subscription PDA ─────────────────────────────────
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

    // ── Transfer 1: Foundation transfer_subscription — subscriber → merchant ──
    // TransferData layout (repr(C, packed), 72 bytes):
    //   amount:    u64  (8) — plan_amount to pull
    //   delegator: [u8;32] — subscriber's pubkey (token account owner)
    //   mint:      [u8;32] — USDC mint
    // Foundation validates: puller authorization, period limits, destination whitelist
    {
        let foundation_pid = Pubkey::from_str(FOUNDATION_SUBSCRIPTIONS_PROGRAM_ID)
            .map_err(|_| error!(SubscriptionError::InvalidFoundationProgram))?;

        let mut transfer_data: Vec<u8> = Vec::with_capacity(73);
        transfer_data.push(10u8); // transfer_subscription discriminator
        transfer_data.extend_from_slice(&plan_amount.to_le_bytes()); // amount
        transfer_data.extend_from_slice(subscription.subscriber.as_ref()); // delegator
        transfer_data.extend_from_slice(plan.usdc_mint.as_ref()); // mint

        // Account order for TransferSubscription (10 accounts, fixed):
        // [0] subscription_pda  mut
        // [1] plan_pda
        // [2] subscription_authority
        // [3] delegator_ata    mut  (subscriber's token account)
        // [4] receiver_ata     mut  (merchant's token account)
        // [5] caller           signer (keeper)
        // [6] token_mint
        // [7] token_program
        // [8] event_authority
        // [9] self_program
        let transfer_ix = Instruction {
            program_id: foundation_pid,
            accounts: vec![
                AccountMeta::new(ctx.accounts.foundation_subscription.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_plan.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_subscription_authority.key(), false),
                AccountMeta::new(ctx.accounts.subscriber_token_account.key(), false),
                AccountMeta::new(ctx.accounts.merchant_token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.keeper.key(), true),
                AccountMeta::new_readonly(ctx.accounts.usdc_mint.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_event_authority.key(), false),
                AccountMeta::new_readonly(ctx.accounts.foundation_program.key(), false),
            ],
            data: transfer_data,
        };

        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.foundation_subscription.to_account_info(),
                ctx.accounts.foundation_plan.to_account_info(),
                ctx.accounts.foundation_subscription_authority.to_account_info(),
                ctx.accounts.subscriber_token_account.to_account_info(),
                ctx.accounts.merchant_token_account.to_account_info(),
                ctx.accounts.keeper.to_account_info(),
                ctx.accounts.usdc_mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.foundation_event_authority.to_account_info(),
                ctx.accounts.foundation_program.to_account_info(),
            ],
            signer_seeds,
        )?;
    }

    // ── Transfers 2 & 3: Split fee between keeper (60%) and treasury (40%) ────
    // These use the Subscription PDA as authority (it holds a separate delegation).
    // TODO session 2: re-route fee transfers through Foundation SA once Guard retired
    if fee > 0 {
        let keeper_reward: u64 = (fee as u128).saturating_mul(60).saturating_div(100) as u64;
        let treasury_portion: u64 = fee
            .checked_sub(keeper_reward)
            .ok_or(SubscriptionError::ArithmeticOverflow)?;

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

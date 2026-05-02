// ============================================================
// Recuro Guard - Payment interval and authorization enforcer
//
// Protects subscription payments by:
// - Enforcing minimum interval between payments (period_seconds)
// - Restricting transfer destinations to approved merchant address
// - Ensuring only authorized Recuro program can trigger payments
// - Storing immutable payment configuration (amount, period)
// ============================================================

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("4Fgs3dSAP869uEwsTd1tyh2pTkvLK1ji2BAhmfbBzCDr");

// ─────────────────────────────────────────────────────────────────────────────
// Error enum
// ─────────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum GuardError {
    #[msg("Insufficient time has elapsed since last payment")]
    PeriodNotElapsed,
    #[msg("Only the authorized Recuro program may call this instruction")]
    UnauthorizedCaller,
    #[msg("Destination token account does not match approved merchant address")]
    InvalidDestination,
    #[msg("Payment amount does not match guard's configured amount")]
    InvalidAmount,
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard Account State
// ─────────────────────────────────────────────────────────────────────────────

#[account]
pub struct GuardAccount {
    pub subscription: Pubkey, // The Recuro subscription this guard is bound to
    pub subscriber: Pubkey,   // Whose ATA the guard can pull from
    pub merchant_receive: Pubkey, // Only destination allowed for transfers
    pub recuro_program: Pubkey, // Only this program ID may call authorize_payment
    pub amount_per_period: u64, // Read from plan at creation, never updated by caller
    pub period_seconds: i64,  // Billing interval, never updated by caller
    pub last_executed_at: i64, // Unix timestamp, updated on each successful payment
    pub bump: u8,             // PDA bump seed
}

impl GuardAccount {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Instruction 1: Initialize Guard
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(amount_per_period: u64, period_seconds: i64)]
pub struct InitializeGuard<'info> {
    /// The Recuro subscription program, calling via CPI
    /// Must be a signer so we can store its pubkey
    #[account(mut)]
    pub recuro_program: Signer<'info>,

    /// The subscription PDA from Recuro (passed as account info reference)
    /// We only read its pubkey to use as a seed
    /// CHECK: Recuro program validates this
    #[account()]
    pub subscription: UncheckedAccount<'info>,

    /// Subscriber wallet (payer for guard account creation)
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// The Guard PDA - created by this instruction
    #[account(
        init,
        payer = subscriber,
        space = 8 + GuardAccount::INIT_SPACE,
        seeds = [b"guard", subscription.key().as_ref()],
        bump,
    )]
    pub guard_account: Account<'info, GuardAccount>,

    /// The subscriber's ATA - we only read it to capture its owner
    /// CHECK: Recuro validates this is the correct ATA
    #[account(
        mut,
        constraint = subscriber_token_account.owner == subscriber.key() @ GuardError::UnauthorizedCaller,
    )]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// The merchant's receive ATA
    /// CHECK: Recuro validates this is the correct destination
    #[account(mut)]
    pub merchant_receive_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler_initialize_guard(
    ctx: Context<InitializeGuard>,
    amount_per_period: u64,
    period_seconds: i64,
) -> Result<()> {
    let guard_account = &mut ctx.accounts.guard_account;

    guard_account.subscription = ctx.accounts.subscription.key();
    guard_account.subscriber = ctx.accounts.subscriber.key();
    guard_account.merchant_receive = ctx.accounts.merchant_receive_token_account.key();
    guard_account.recuro_program = ctx.accounts.recuro_program.key();
    guard_account.amount_per_period = amount_per_period;
    guard_account.period_seconds = period_seconds;
    guard_account.last_executed_at = 0; // Never executed yet
    guard_account.bump = ctx.bumps.guard_account;

    msg!(
        "[guard.initialize] subscription={} merchant={} amount={} period={}",
        guard_account.subscription,
        guard_account.merchant_receive,
        amount_per_period,
        period_seconds,
    );

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Instruction 2: Authorize Payment
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct AuthorizePayment<'info> {
    /// The Recuro subscription program, calling via CPI
    /// Must be a signer (signs as the recuro_program PDA)
    pub caller: Signer<'info>,

    /// The Guard account for this subscription
    #[account(
        mut,
        seeds = [b"guard", guard_account.subscription.as_ref()],
        bump = guard_account.bump,
    )]
    pub guard_account: Account<'info, GuardAccount>,

    /// Subscriber's USDC ATA - source of funds
    #[account(mut)]
    pub subscriber_token_account: Account<'info, TokenAccount>,

    /// Merchant's USDC ATA - destination for transfer
    #[account(mut)]
    pub merchant_receive_token_account: Account<'info, TokenAccount>,

    /// USDC mint for transfer_checked
    /// CHECK: Anchor verifies mint matches token accounts
    #[account(
        constraint = usdc_mint.key() == subscriber_token_account.mint @ GuardError::InvalidAmount,
        constraint = usdc_mint.key() == merchant_receive_token_account.mint @ GuardError::InvalidAmount,
    )]
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct ResetLastExecuted<'info> {
    /// The authorized Recuro program, calling via CPI
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The Guard account for this subscription
    #[account(
        mut,
        seeds = [b"guard", guard_account.subscription.as_ref()],
        bump = guard_account.bump,
    )]
    pub guard_account: Account<'info, GuardAccount>,
}

#[derive(Accounts)]
pub struct CloseGuard<'info> {
    /// The authorized Recuro program, calling via CPI
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The Guard account to close
    #[account(
        mut,
        seeds = [b"guard", guard_account.subscription.as_ref()],
        bump = guard_account.bump,
        close = subscriber,
    )]
    pub guard_account: Account<'info, GuardAccount>,

    /// Subscriber receives rent back
    #[account(mut, address = guard_account.subscriber)]
    pub subscriber: SystemAccount<'info>,
}

pub fn handler_authorize_payment(ctx: Context<AuthorizePayment>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let guard = &mut ctx.accounts.guard_account;

    // ── Guard: only the authorized Recuro program may call this ────────────────
    require_eq!(
        ctx.accounts.caller.key(),
        guard.recuro_program,
        GuardError::UnauthorizedCaller
    );

    // ── Guard: sufficient time has elapsed since last payment ──────────────────
    let time_since_last = now.saturating_sub(guard.last_executed_at);
    require!(
        time_since_last >= guard.period_seconds,
        GuardError::PeriodNotElapsed
    );

    // ── Guard: destination matches approved merchant address ──────────────────
    require_eq!(
        ctx.accounts.merchant_receive_token_account.key(),
        guard.merchant_receive,
        GuardError::InvalidDestination
    );

    require!(guard.amount_per_period > 0, GuardError::InvalidAmount);

    require_eq!(
        ctx.accounts.subscriber_token_account.owner,
        guard.subscriber,
        GuardError::UnauthorizedCaller
    );

    let subscription = guard.subscription;
    let bump = guard.bump;
    let guard_seeds: &[&[u8]] = &[b"guard", subscription.as_ref(), &[bump]];
    let signer_seeds = &[guard_seeds];

    // ── Transfer the exact amount specified in the guard ──────────────────────
    // NEVER trust a caller-supplied amount
    token::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.subscriber_token_account.to_account_info(),
                to: ctx
                    .accounts
                    .merchant_receive_token_account
                    .to_account_info(),
                authority: guard.to_account_info(), // Guard PDA signs
                mint: ctx.accounts.usdc_mint.to_account_info(),
            },
            signer_seeds,
        ),
        guard.amount_per_period,
        ctx.accounts.usdc_mint.decimals,
    )?;

    // ── Update guard state ───────────────────────────────────────────────────
    guard.last_executed_at = now;

    msg!(
        "[guard.authorize_payment] subscription={} amount={} timestamp={}",
        guard.subscription,
        guard.amount_per_period,
        now,
    );

    Ok(())
}

pub fn handler_reset_last_executed(ctx: Context<ResetLastExecuted>) -> Result<()> {
    let guard = &mut ctx.accounts.guard_account;

    require_eq!(
        ctx.accounts.caller.key(),
        guard.recuro_program,
        GuardError::UnauthorizedCaller
    );

    guard.last_executed_at = 0;

    msg!(
        "[guard.reset_last_executed] subscription={}",
        guard.subscription
    );

    Ok(())
}

pub fn handler_close_guard(ctx: Context<CloseGuard>) -> Result<()> {
    let guard = &ctx.accounts.guard_account;

    require_eq!(
        ctx.accounts.caller.key(),
        guard.recuro_program,
        GuardError::UnauthorizedCaller
    );

    msg!("[guard.close] subscription={} closed", guard.subscription);
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Program entry point
// ─────────────────────────────────────────────────────────────────────────────

#[program]
pub mod recuro_guard {
    use super::*;

    pub fn initialize_guard(
        ctx: Context<InitializeGuard>,
        amount_per_period: u64,
        period_seconds: i64,
    ) -> Result<()> {
        handler_initialize_guard(ctx, amount_per_period, period_seconds)
    }

    pub fn authorize_payment(ctx: Context<AuthorizePayment>) -> Result<()> {
        handler_authorize_payment(ctx)
    }

    pub fn reset_last_executed(ctx: Context<ResetLastExecuted>) -> Result<()> {
        handler_reset_last_executed(ctx)
    }

    pub fn close_guard(ctx: Context<CloseGuard>) -> Result<()> {
        handler_close_guard(ctx)
    }
}

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    errors::SubscriptionError,
    state::{FeeRouter, ProtocolConfig},
};

#[derive(Accounts)]
pub struct InitializeFeeRouter<'info> {
    /// Admin wallet — must equal config.admin
    #[account(
        mut,
        constraint = admin.key() == config.admin @ SubscriptionError::UnauthorizedMerchant,
    )]
    pub admin: Signer<'info>,

    /// Protocol config — read for admin verification
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    /// FeeRouter PDA — created here
    #[account(
        init,
        payer = admin,
        space = 8 + FeeRouter::INIT_SPACE,
        seeds = [b"fee_router"],
        bump,
    )]
    pub fee_router: Account<'info, FeeRouter>,

    /// FeeRouter USDC ATA — created if it doesn't already exist
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint      = usdc_mint,
        associated_token::authority = fee_router,
    )]
    pub fee_router_token_account: Account<'info, TokenAccount>,

    /// USDC mint
    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeFeeRouter>) -> Result<()> {
    // Anchor's `init` constraint rejects this transaction before the handler runs
    // if the fee_router PDA already exists. This guard is defense-in-depth and
    // surfaces a readable error code on any non-Anchor path (e.g. raw CPI callers).
    require!(
        ctx.accounts.fee_router.bump == 0,
        SubscriptionError::FeeRouterAlreadyInitialized
    );
    ctx.accounts.fee_router.bump = ctx.bumps.fee_router;
    msg!(
        "[initialize_fee_router] fee_router={} ata={}",
        ctx.accounts.fee_router.key(),
        ctx.accounts.fee_router_token_account.key(),
    );
    Ok(())
}

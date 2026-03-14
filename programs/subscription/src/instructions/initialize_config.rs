use crate::{errors::SubscriptionError, state::ProtocolConfig};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeConfigArgs {
    pub fee_bps: u16,
    pub treasury: Pubkey,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init, payer = admin,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [b"config"], bump,
    )]
    pub config: Account<'info, ProtocolConfig>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
    require!(
        args.fee_bps <= ProtocolConfig::MAX_FEE_BPS,
        SubscriptionError::FeeTooHigh
    );
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = args.treasury;
    config.fee_bps = args.fee_bps;
    config.creation_paused = false;
    config.bump = ctx.bumps.config;
    msg!("Protocol config initialised. fee_bps={}", args.fee_bps);
    Ok(())
}

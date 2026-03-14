use crate::state::ProtocolConfig;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(address = config.admin @ anchor_lang::error::ErrorCode::ConstraintHasOne)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
}

pub fn handler(ctx: Context<UpdateConfig>, new_treasury: Pubkey, new_fee_bps: u16) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.treasury = new_treasury;
    config.fee_bps = new_fee_bps;
    msg!(
        "[update_config] treasury={} fee_bps={}",
        new_treasury,
        new_fee_bps
    );
    Ok(())
}

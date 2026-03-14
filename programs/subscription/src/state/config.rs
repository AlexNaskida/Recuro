use anchor_lang::prelude::*;

#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub fee_bps: u16,
    pub creation_paused: bool,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const INIT_SPACE: usize = 32 + 32 + 2 + 1 + 1;
    pub const MAX_FEE_BPS: u16 = 500;

    pub fn fee_amount(&self, payment: u64) -> u64 {
        (payment as u128)
            .checked_mul(self.fee_bps as u128)
            .unwrap_or(0)
            .checked_div(10_000)
            .unwrap_or(0) as u64
    }
}

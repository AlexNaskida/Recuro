use anchor_lang::prelude::*;

/// Protocol-owned PDA that acts as the intermediate recipient for keeper fees.
/// The FeeRouter ATA receives 60% of the protocol fee from Foundation's
/// transfer_subscription, then immediately forwards it to whichever keeper
/// called execute_payment — making the keeper network fully permissionless.
///
/// PDA seeds: ["fee_router"]
#[account]
pub struct FeeRouter {
    pub bump: u8,
}

impl FeeRouter {
    pub const INIT_SPACE: usize = 1; // bump only
}

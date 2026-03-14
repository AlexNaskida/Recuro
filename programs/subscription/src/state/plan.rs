use crate::constants::{MAX_PLAN_DESC_LEN, MAX_PLAN_NAME_LEN};
use anchor_lang::prelude::*;

#[account]
pub struct Plan {
    pub merchant: Pubkey,               // 32
    pub merchant_token_account: Pubkey, // 32
    pub usdc_mint: Pubkey,              // 32
    pub plan_id: u64,                   // 8
    pub name: String,                   // 4 + 64
    pub description: String,            // 4 + 256
    pub amount_usdc: u64,               // 8
    pub interval_seconds: i64,          // 8
    pub trial_seconds: i64,             // 8
    pub max_subscribers: u64,           // 8
    pub active_subscribers: u64,        // 8
    pub total_subscribers_ever: u64,    // 8
    pub total_revenue: u64,             // 8  (merchant received, excludes fees)
    pub fees_paid: u64,                 // 8  (protocol fees collected on top)
    pub successful_payments: u64,       // 8
    pub created_at: i64,                // 8
    pub updated_at: i64,                // 8
    pub status: PlanStatus,             // 1
    pub bump: u8,                       // 1
}

impl Plan {
    pub const INIT_SPACE: usize = 32
        + 32
        + 32
        + 8
        + (4 + MAX_PLAN_NAME_LEN)
        + (4 + MAX_PLAN_DESC_LEN)
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 1
        + 1;

    #[inline]
    pub fn is_active(&self) -> bool {
        self.status == PlanStatus::Active
    }

    #[inline]
    pub fn has_capacity(&self) -> bool {
        self.max_subscribers == 0 || self.active_subscribers < self.max_subscribers
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PlanStatus {
    Active,
    Paused,
    Archived,
}

impl Default for PlanStatus {
    fn default() -> Self {
        PlanStatus::Active
    }
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct PlanCreated {
    pub plan: Pubkey,
    pub merchant: Pubkey,
    pub plan_id: u64,
    pub name: String,
    pub amount_usdc: u64,
    pub interval_seconds: i64,
    pub trial_seconds: i64,
    pub timestamp: i64,
}

#[event]
pub struct PlanUpdated {
    pub plan: Pubkey,
    pub merchant: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PlanArchived {
    pub plan: Pubkey,
    pub merchant: Pubkey,
    pub timestamp: i64,
}

use crate::constants::MAX_FAILED_PAYMENTS;
use anchor_lang::prelude::*;

#[account]
pub struct Subscription {
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub subscriber_token_account: Pubkey,
    pub amount_usdc: u64,
    pub next_payment_at: i64,
    pub started_at: i64,
    pub trial_ends_at: i64,
    pub last_paid_at: i64,
    pub ended_at: i64,
    pub total_paid: u64,
    pub payment_count: u64,
    pub failed_payment_count: u8,
    pub billing_cycles: u8,   // how many cycles were pre-authorized (1/3/6/12)
    pub cycles_remaining: u8, // decrements each payment - when 0, subscription expires
    pub status: SubscriptionStatus,
    pub bump: u8,
}

impl Subscription {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 1;

    #[inline]
    pub fn is_active(&self) -> bool {
        self.status == SubscriptionStatus::Active
    }

    #[inline]
    pub fn is_paused(&self) -> bool {
        self.status == SubscriptionStatus::Paused
    }

    #[inline]
    pub fn is_payment_due(&self, now: i64) -> bool {
        now >= self.next_payment_at
    }

    #[inline]
    pub fn is_in_trial(&self, now: i64) -> bool {
        self.trial_ends_at > 0 && now < self.trial_ends_at
    }

    #[inline]
    pub fn should_auto_expire(&self) -> bool {
        self.failed_payment_count >= MAX_FAILED_PAYMENTS
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Default)]
pub enum SubscriptionStatus {
    #[default]
    Active,
    Paused,
    Cancelled,
    Expired,
}
// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct SubscriptionCreated {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub amount_usdc: u64,
    pub trial_ends_at: i64,
    pub next_payment_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionPaused {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub paused_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionResumed {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub next_payment_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub cancelled_by: Pubkey,
    pub total_paid: u64,
    pub payment_count: u64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionExpired {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub total_paid: u64,
    pub payment_count: u64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentExecuted {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub merchant: Pubkey,
    pub amount_usdc: u64,   // amount merchant received
    pub fee_usdc: u64,      // protocol fee charged on top
    pub total_charged: u64, // amount_usdc + fee_usdc
    pub payment_count: u64,
    pub timestamp: i64,
}

#[event]
pub struct PaymentFailed {
    pub subscription: Pubkey,
    pub plan: Pubkey,
    pub subscriber: Pubkey,
    pub reason: String,
    pub failed_count: u8,
    pub will_expire: bool,
    pub timestamp: i64,
}

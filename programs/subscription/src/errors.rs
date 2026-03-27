use anchor_lang::prelude::*;

#[error_code]
pub enum SubscriptionError {
    // ── Plan validation ───────────────────────────────────────────────────────
    #[msg("Plan is not in Active status")]
    PlanNotActive,
    #[msg("Plan is archived and cannot accept new subscribers")]
    PlanArchived,
    #[msg("Plan has reached its maximum subscriber capacity")]
    PlanAtCapacity,
    #[msg("Plan name exceeds the 64-character limit")]
    PlanNameTooLong,
    #[msg("Plan description exceeds the 256-character limit")]
    PlanDescTooLong,
    #[msg("Billing interval must be between 1 day and 365 days")]
    InvalidInterval,
    #[msg("Amount must be between 0.01 USDC and 10,000 USDC")]
    InvalidAmount,
    #[msg("Trial period cannot exceed the billing interval")]
    TrialExceedsInterval,

    // ── Subscription validation ───────────────────────────────────────────────
    #[msg("An active or paused subscription already exists for this plan")]
    ActiveSubscriptionExists,
    #[msg("Subscription is not in Active status")]
    SubscriptionNotActive,
    #[msg("Subscription is paused - resume before performing this action")]
    SubscriptionPaused,
    #[msg("Subscription has already been cancelled")]
    AlreadyCancelled,
    #[msg("Subscription has already expired due to repeated payment failures")]
    AlreadyExpired,
    #[msg("Subscription is still within its trial period; no payment due yet")]
    InTrialPeriod,
    #[msg("Next payment date has not been reached yet")]
    PaymentNotDue,

    // ── Authorization ─────────────────────────────────────────────────────────
    #[msg("Only the merchant authority may perform this action on the plan")]
    UnauthorizedMerchant,
    #[msg("Only the subscriber or merchant may perform this action")]
    UnauthorizedActor,

    // ── Token / balance ───────────────────────────────────────────────────────
    #[msg("Subscriber token account has insufficient USDC balance")]
    InsufficientBalance,
    #[msg("Subscriber token account does not belong to the expected subscriber")]
    InvalidSubscriberTokenAccount,
    #[msg("Merchant token account does not belong to the plan's merchant")]
    InvalidMerchantTokenAccount,
    #[msg("Treasury token account does not belong to the protocol treasury")]
    InvalidTreasuryTokenAccount,
    #[msg("Token mint does not match the expected USDC mint")]
    InvalidMint,

    // ── Protocol config ───────────────────────────────────────────────────────
    #[msg("Fee basis points exceed the maximum allowed (500 bps = 5%)")]
    FeeTooHigh,

    // ── Arithmetic ────────────────────────────────────────────────────────────
    #[msg("Arithmetic overflow - value exceeds safe bounds")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow - value would go below zero")]
    ArithmeticUnderflow,
    // ── Plan deletion ─────────────────────────────────────────────────────────
    #[msg("Plan must be archived before it can be deleted")]
    PlanNotArchived,
    #[msg("Plan still has active subscribers and cannot be deleted")]
    PlanHasActiveSubscribers,
}

pub fn handler(ctx: Context<RenewSubscription>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    let subscription = &mut ctx.accounts.subscription;
    let now = Clock::get()?.unix_timestamp;

    // Reset subscription — charge immediately on renew
    subscription.status = SubscriptionStatus::Active;
    subscription.cycles_remaining = 12;
    subscription.billing_cycles = 12;
    subscription.next_payment_at = now;
    subscription.ended_at = 0;
    subscription.failed_payment_count = 0;
    subscription.amount_usdc = plan.amount_usdc;

    plan.active_subscribers = plan
        .active_subscribers
        .checked_add(1)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    // Re-approve delegate
    let fee_per_cycle = (plan.amount_usdc as u128)
        .saturating_mul(25)
        .saturating_div(10_000) as u64;
    let total_per_cycle = plan
        .amount_usdc
        .checked_add(fee_per_cycle)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;
    let delegate_amount = total_per_cycle
        .checked_mul(12)
        .ok_or(SubscriptionError::ArithmeticOverflow)?;

    approve(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.subscriber_token_account.to_account_info(),
                delegate: subscription.to_account_info(),
                authority: ctx.accounts.subscriber.to_account_info(),
            },
        ),
        delegate_amount,
    )?;

    msg!(
        "[renew_subscription] sub={} next_at={}",
        subscription.key(),
        now
    );
    Ok(())
}

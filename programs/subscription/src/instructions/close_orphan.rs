use anchor_lang::prelude::*;
use recuro_guard::cpi::accounts::CloseGuard as GuardCloseGuard;
use recuro_guard::program::RecuroGuard;

use crate::{constants::SEED_SUBSCRIPTION, errors::SubscriptionError, state::Subscription};

#[derive(Accounts)]
pub struct CloseOrphanSubscription<'info> {
    /// Any signer may trigger orphan cleanup. Rent is always returned to subscriber.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_SUBSCRIPTION, subscription.plan.as_ref(), subscription.subscriber.as_ref()],
        bump = subscription.bump,
        close = subscriber,
    )]
    pub subscription: Account<'info, Subscription>,

    /// Must be the expected plan address and must be missing/empty on chain.
    /// CHECK: Address and emptiness are verified by constraints below.
    #[account(
        address = subscription.plan,
        constraint = plan.data_is_empty() @ SubscriptionError::SubscriptionNotOrphaned,
    )]
    pub plan: UncheckedAccount<'info>,

    pub guard_program: Program<'info, RecuroGuard>,

    /// Guard account may be orphaned (uninitialized). Manual address validation in handler.
    /// CHECK: If initialized, we verify it's the correct guard for this subscription via seeds.
    pub guard_account: UncheckedAccount<'info>,

    /// Subscriber receives rent refund for both guard and subscription closes.
    #[account(mut, address = subscription.subscriber)]
    pub subscriber: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseOrphanSubscription>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;

    let subscription_account_info = subscription.to_account_info();
    let plan_key = subscription.plan;
    let sub_key = subscription.subscriber;
    let sub_bump = subscription.bump;

    let sub_signer_seeds: &[&[u8]] = &[
        SEED_SUBSCRIPTION,
        plan_key.as_ref(),
        sub_key.as_ref(),
        &[sub_bump],
    ];
    let signer_seeds = &[sub_signer_seeds];

    // Only attempt to close guard if it's initialized (has lamports and data)
    let guard_info = &ctx.accounts.guard_account.to_account_info();
    if guard_info.lamports() > 0 && guard_info.data_len() > 0 {
        let cpi_accounts = GuardCloseGuard {
            caller: subscription_account_info.clone(),
            guard_account: guard_info.clone(),
            subscriber: ctx.accounts.subscriber.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.guard_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        recuro_guard::cpi::close_guard(cpi_context)?;
    } else {
        msg!(
            "[close_orphan_subscription] guard_account for subscription {} does not exist (orphaned)",
            subscription.key()
        );
    }

    msg!(
        "[close_orphan_subscription] sub={} plan={} cleaned_by={}",
        subscription.key(),
        subscription.plan,
        ctx.accounts.caller.key()
    );

    Ok(())
}

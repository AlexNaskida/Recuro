use crate::{
    constants::{MAX_PLAN_DESC_LEN, MAX_PLAN_NAME_LEN, SEED_PLAN},
    errors::SubscriptionError,
    state::{Plan, PlanStatus, PlanUpdated},
};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePlanArgs {
    pub name: Option<String>,
    pub description: Option<String>,
    pub max_subscribers: Option<u64>,
}

#[derive(Accounts)]
pub struct UpdatePlan<'info> {
    #[account(mut, address = plan.merchant @ SubscriptionError::UnauthorizedMerchant)]
    pub merchant: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLAN, merchant.key().as_ref(), &plan.plan_id.to_le_bytes()],
        bump  = plan.bump,
        constraint = plan.status != PlanStatus::Archived @ SubscriptionError::PlanNotActive,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handler(ctx: Context<UpdatePlan>, args: UpdatePlanArgs) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let plan = &mut ctx.accounts.plan;

    if let Some(name) = args.name {
        require!(
            name.len() <= MAX_PLAN_NAME_LEN,
            SubscriptionError::PlanNameTooLong
        );
        plan.name = name;
    }
    if let Some(desc) = args.description {
        require!(
            desc.len() <= MAX_PLAN_DESC_LEN,
            SubscriptionError::PlanDescTooLong
        );
        plan.description = desc;
    }
    if let Some(max) = args.max_subscribers {
        plan.max_subscribers = max;
    }

    plan.updated_at = now;

    emit!(PlanUpdated {
        plan: plan.key(),
        merchant: ctx.accounts.merchant.key(),
        timestamp: now,
    });

    msg!("[update_plan] plan={}", plan.key());
    Ok(())
}

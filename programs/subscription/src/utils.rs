use anchor_lang::prelude::*;
use crate::errors::SubscriptionError;

pub fn interval_to_cron(interval_seconds: i64) -> String {
    match interval_seconds {
        s if s <= 60     => format!("*/{} * * * * *", s.max(1)),
        s if s <= 3_600  => format!("0 */{} * * * *", s / 60),
        s if s <= 86_400 => format!("0 0 */{} * * *", s / 3_600),
        2_592_000        => "0 0 0 1 * *".into(),
        604_800          => "0 0 0 * * 1".into(),
        86_400           => "0 0 0 * * *".into(),
        _                => "0 0 0 1 * *".into(),
    }
}

#[inline]
pub fn checked_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or(SubscriptionError::ArithmeticOverflow.into())
}

#[inline]
pub fn checked_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b).ok_or(SubscriptionError::ArithmeticUnderflow.into())
}

#[inline]
pub fn checked_add_i64(a: i64, b: i64) -> Result<i64> {
    a.checked_add(b).ok_or(SubscriptionError::ArithmeticOverflow.into())
}

#[inline]
pub fn split_payment(gross: u64, fee_bps: u16) -> (u64, u64) {
    let fee = (gross as u128).saturating_mul(fee_bps as u128).saturating_div(10_000) as u64;
    (gross.saturating_sub(fee), fee)
}

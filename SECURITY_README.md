# Security Notes For Client Refactor

## Scope of this change

This refactor moved frontend applications from `apps/` to `client/apps/` and extracted UI code in the merchant dashboard into reusable components.

## Security impact

No security-critical behavior was changed.

- No smart contract authority logic was modified.
- No signer/account constraints were changed in frontend transaction calls.
- No wallet key handling logic was weakened.
- No RPC or program ID trust model was changed.

## Frontend safety invariants preserved

- On-chain writes are still gated by connected wallet checks.
- Destructive operations (plan delete) now require explicit user confirmation.
- Program method calls still use the same account set and signer assumptions.

## Operational reminder

After moving folder layout, update any CI scripts or deployment scripts that referenced old `apps/...` paths to `client/apps/...`.

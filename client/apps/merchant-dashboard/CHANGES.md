# SubPay Hub

All changes made to wire real Solana wallet adapter + on-chain data.

---

## New Files

### `src/lib/config.ts`

Central config. **Update `PROGRAM_ID` after `anchor deploy`.**

```ts
export const PROGRAM_ID = "11111111111111111111111111111111"; // ← CHANGE THIS
export const CLUSTER = "devnet";
export const RPC_URL = "https://api.devnet.solana.com";
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
```

### `src/lib/wallet.tsx`

Wraps the app in `ConnectionProvider` + `WalletProvider` + `WalletModalProvider`.
Registers Phantom and Solflare adapters. Imported in `src/main.tsx`.

### `src/lib/pda.ts`

PDA derivation helpers matching the Rust seed constants:

- `getPlanPDA(merchant, planId)` — seeds: `["plan", merchant, planId_le8]`
- `getSubscriptionPDA(plan, subscriber)` — seeds: `["subscription", plan, subscriber]`
- `getConfigPDA()` — seeds: `["config"]`
- `microToUsdc(bn)` — divides by 1_000_000
- `usdcToMicro(n)` — multiplies by 1_000_000, returns BN

### `src/hooks/useAnchorProgram.ts`

Creates an `AnchorProvider` and `Program` instance from the connected wallet.
Returns `{ provider, program, connected }`.
Attempts to load `src/lib/idl.json` (copy from `target/idl/subscription.json` after anchor build).
Falls back to stub IDL when file not present.

### `src/hooks/usePlans.ts`

Fetches all `Plan` accounts from chain filtered by connected wallet (merchant).
Falls back to `mock-data.ts` when:

- Wallet not connected
- Program not deployed (fetch error)
- No on-chain plans found yet

Returns `{ plans, loading, usingMock, refetch }`.

### `src/hooks/useSubscribers.ts`

Fetches all `Subscription` accounts from chain.
Same mock fallback pattern as `usePlans`.
Returns `{ subscribers, loading, usingMock, refetch }`.

### `src/hooks/useCreatePlan.ts`

Submits a real `createPlan` instruction via Anchor.
Derives `planId` from `Date.now()`.
Fetches merchant's USDC ATA from `getAssociatedTokenAddress`.
Returns `{ createPlan, loading, canCreate }`.

---

## Changed Files

### `package.json`

**Added dependencies:**

```json
"@solana/wallet-adapter-base": "^0.9.23",
"@solana/wallet-adapter-phantom": "^0.9.24",
"@solana/wallet-adapter-react": "^0.15.35",
"@solana/wallet-adapter-react-ui": "^0.9.35",
"@solana/wallet-adapter-wallets": "^0.19.32",
"@solana/web3.js": "^1.98.0",
"@coral-xyz/anchor": "^0.29.0",
"@solana/spl-token": "^0.4.9",
"bn.js": "^5.2.1"
```

### `src/main.tsx`

**Before:**

```tsx
createRoot(document.getElementById("root")!).render(<App />);
```

**After:**

```tsx
import { SolanaWalletProvider } from "./lib/wallet.tsx";
createRoot(document.getElementById("root")!).render(
  <SolanaWalletProvider>
    <App />
  </SolanaWalletProvider>,
);
```

### `src/components/DashboardLayout.tsx`

**Before:** Hardcoded `const WALLET = "7xKX..."` and `const CONNECTED = true`.
Connect Wallet button was a no-op. Disconnect was a no-op.

**After:**

- Imports `useWallet` from `@solana/wallet-adapter-react`
- Imports `useWalletModal` from `@solana/wallet-adapter-react-ui`
- `connected`, `publicKey`, `disconnect` from real wallet state
- "Connect Wallet" button calls `setVisible(true)` → opens Phantom/Solflare modal
- Wallet address shown in header is the real connected public key
- `WalletIdenticon` generates identicon from real address
- Disconnect button calls real `disconnect()`
- Network badge reads from `CLUSTER` constant (Devnet=amber, Mainnet=teal)
- Copy address copies real public key

### `src/pages/Plans.tsx`

**Before:** Form submit was a fake `setTimeout` that showed a toast.

**After:**

- Uses `usePlans()` hook — shows real on-chain plans or mock with banner
- Uses `useCreatePlan()` hook — submits real Anchor transaction on form submit
- Shows `Alert` banner when displaying demo data
- Loading skeleton while fetching
- Form fields wired to state: name, description, price, interval, trialDays, maxSubscribers
- Deploy button disabled + spinner while tx is pending
- Success toast shows truncated tx signature
- Error toast shows error message from wallet/program

### `src/pages/Subscribers.tsx`

**Before:** Used hardcoded `subscribers` array from `mock-data.ts`.

**After:**

- Uses `useSubscribers()` hook — shows real on-chain data or mock with banner
- Loading skeleton rows while fetching
- Status filter now includes "expired" and "paused" (matching real on-chain statuses)
- Plan filter dynamically populated from actual subscriber data

---

## After anchor deploy — Final wiring steps

1. Copy IDL:

   ```bash
   cp target/idl/subscription.json client/apps/merchant-dashboard/src/lib/idl.json
   # or for this standalone project:
   cp target/idl/subscription.json src/lib/idl.json
   ```

2. Update program ID in `src/lib/config.ts`:

   ```ts
   export const PROGRAM_ID = "YOUR_REAL_PROGRAM_ID_HERE";
   ```

3. Reinstall and run:

   ```bash
   npm install
   npm run dev
   ```

4. Connect Phantom wallet (set to Devnet in Phantom settings).

---

## What still uses mock data

- `src/pages/Analytics.tsx` — charts still use `mock-data.ts`. Wire to `usePlans` + `useSubscribers` for real analytics.
- `src/pages/Dashboard.tsx` — KPI cards and charts use mock data. Wire to `usePlans` + `useSubscribers`.
- `src/lib/mock-data.ts` — kept as fallback, no changes needed.

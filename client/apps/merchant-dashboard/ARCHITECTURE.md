# Merchant Dashboard Architecture

## Overview

This dashboard provides a management interface for Solana subscription programs. It enables merchants to create plans, manage subscribers, and track revenue metrics.

#### Key Design Principles:

- **Single Source of Truth**: Anchor program state is always the source of truth
- **Context-Based State**: Wallet and program state is centralized in `MerchantProgramContext`
- **Minimal Duplication**: Hooks shield component layers from implementation details
- **Security Preserved**: No privilege model changes; signatures follow Anchor specifications

---

## Application Structure

```
src/
├── context/
│   └── MerchantProgramContext.tsx   # Single-source Anchor provider + program
├── hooks/
│   ├── useAnchorProgram.ts          # Delegates to context (maintains API)
│   ├── usePlans.ts                  # Plan fetching
│   ├── useSubscribers.ts            # Subscriber fetching
│   ├── useCreatePlan.ts             # Plan creation
│   ├── useDashboard.ts              # Aggregated dashboard metrics
│   └── ...
├── components/
│   ├── plans/
│   │   ├── PlanActionsMenu.tsx      # Extracted menu for plan actions
│   │   └── DeletePlanConfirmDialog.tsx
│   ├── DashboardLayout.tsx
│   └── ui/                          # shadcn/ui based components
├── pages/
│   ├── Dashboard.tsx
│   ├── Plans.tsx
│   ├── Subscribers.tsx
│   └── ...
└── App.tsx                          # MerchantProgramProvider wrapper
```

---

## Context Layer: MerchantProgramContext

### Purpose

Centralizes Anchor provider and program initialization to avoid duplicate instantiation across hooks and pages.

### Implementation

**File**: `src/context/MerchantProgramContext.tsx`

```typescript
// Provider wraps app and exposes shared context
<MerchantProgramProvider>
  <App />
</MerchantProgramProvider>

// Internal hook delegates to context
function useAnchorProgram() {
  return useMerchantProgramContext();
}
```

### Benefits

1. **No Duplicate Initialization**: Provider and program are created once and memoized
2. **Consistent API**: Existing hooks continue using `useAnchorProgram()` unchanged
3. **Easy to Test**: Context can be mocked in tests
4. **Dependency Transparency**: Data dependencies are explicit via context

---

## Hook Patterns

### useAnchorProgram

Provides `{ provider, program, connected }` from the shared context.

### usePlans, useSubscribers

- Fetch and cache on-chain data using Anchor program
- Fall back to mock data if wallet disconnected
- Sorted/normalized to stable interface

### useDashboard

Aggregates data from `usePlans` + `useSubscribers` to compute dashboard metrics (revenue, sparklines, plan distribution, etc.).

---

## Components

### Extracted Components

**PlanActionsMenu.tsx**: Dropdown menu for plan actions (archive, unarchive, delete)

**DeletePlanConfirmDialog.tsx**: Confirmation dialog for destructive delete action

### Layout & Pages

- **DashboardLayout**: Sidebar, header, routing context
- **Pages**: Dashboard, Plans, Subscribers, Analytics, Settings, Logs
- **UI Library**: shadcn/ui with Tailwind CSS

---

## State Management

- **Wallet State**: Managed by `@solana/wallet-adapter-react`
- **Program State**: Centralized in `MerchantProgramContext`
- **Query Cache**: Managed by `@tanstack/react-query` (configured in App.tsx)
- **Fetch Cache**: Hooks maintain local state with `useState` + `useCallback`

---

## Security & On-Chain Interaction

### Non-Breaking Optimization

- Only initialization pattern changed (context layer added)
- All signatures and transaction auth remain unchanged
- Anchor IDL and instruction logic preserved

### Plan Lifecycle

1. **Create**: Merchant signs `createPlan` instruction with plan data
2. **Archive**: Merchant signs `archivePlan` instruction (plan.status → Archived)
3. **Unarchive**: Merchant signs `unarchivePlan` instruction (plan.status → Active)
4. **Delete**: Merchant signs `deletePlan` instruction (closes and refunds account)

### Subscription Lifecycle

1. **Subscribe**: User signs `createSubscription` instruction
2. **Pause**: User/Merchant signs `pauseSubscription` instruction
3. **Resume**: User/Merchant signs `resumeSubscription` instruction (if not expired)
4. **Cancel**: User/Merchant signs `cancelSubscription` instruction
5. **Expire**: Keeper auto-expires if no payment in `nextPaymentAt` window

---

## Development Guidelines

### Adding New Hooks

1. Use `const { program } = useAnchorProgram()` to get shared instance
2. Handle `null` program (wallet not connected)
3. Fall back to mock data gracefully

### Adding New Pages

1. Wrap in `<DashboardLayout>`
2. Use existing hooks for wallet + program state
3. Keep UI components in `components/` folder

### Testing

- Mock `MerchantProgramContext` in test setup
- Use mock data for unit tests
- Integration tests can use real program if devnet available

---

## Performance Notes

- Anchor provider and program are memoized and reused across all hooks
- IDL is imported once at module load
- On-chain fetches are cached by React Query
- Large chunks (1.5 MB) due to Solana/Anchor dependencies; consider code-splitting for future optimization

# Recuro Merchant Dashboard

Merchant-facing dashboard for managing recurring USDC subscriptions on Solana.

## Features

- **Wallet connection** for Solana-compatible wallets
- **Plan management** (create and manage subscription plans)
- **Subscription visibility** with status indicators (active, paused, canceled)
- **Merchant analytics UI** for tracking subscription activity
- **React + TypeScript** frontend with reusable UI components
- **Tailwind CSS** design system with semantic theme tokens
- **Vite** development workflow with fast HMR

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Solana Web3 tooling

## Getting Started

From the monorepo root:

```sh
pnpm install
pnpm --filter ./client/apps/merchant-dashboard dev
```

Then open the local URL printed in the terminal.

## Build

```sh
pnpm --filter ./client/apps/merchant-dashboard build
```

## Preview Production Build

```sh
pnpm --filter ./client/apps/merchant-dashboard preview
```

## Project Structure

- `src/pages` – top-level pages/views
- `src/components` – reusable UI components
- `src/lib` – wallet/provider and utility modules
- `src/hooks` – data and state hooks

## Notes

- This app is part of the `recuro-sdk` workspace.
- Ensure the SDK package is installed/built in the workspace before running the dashboard if local package linking is used.

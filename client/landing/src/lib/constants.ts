import type {
  BlogPost,
  ComparisonRow,
  FeatureRowData,
  NavLink,
  StatItem,
} from "@/types";

export const NAV_LINKS: NavLink[] = [
  {
    label: "Why Recuro",
    href: "https://recuro.gitbook.io/recuro-sdk/why-recuro",
  },
  { label: "Features", href: "#features" },
  { label: "Docs", href: "https://recuro.gitbook.io/recuro-sdk" },
  { label: "Blog", href: "/blog" },
];

export const PARTNER_LOGOS = [
  "Solana Labs",
  "Phantom",
  "Helius",
  "Drift",
  "Jupiter",
];

export const INSTALL_COMMANDS = [
  "yarn add @recuro/sdk",
  "npm i @recuro/sdk",
  "pnpm add @recuro/sdk",
];

export const STATS: StatItem[] = [
  { value: "0%", label: "custody risk" },
  { value: "1 tx", label: "to start billing" },
  { value: "3", label: "missed cycles to expire" },
  { value: "0.25%", label: "protocol fee cap" },
];

export const POWERED_STATS: StatItem[] = [
  { value: "$100M+", label: "subscription volume modeled" },
  { value: "24/7", label: "keeper execution coverage" },
  { value: "1", label: "price source per plan" },
];

export const FEATURE_ROWS: FeatureRowData[] = [
  {
    tag: "Subscriptions",
    title: "A new subscription primitive",
    description:
      "Launch subscription billing with Solana's on-chain price immutability and a user experience that rivals Web2 in minutes, not months.",
    checklist: [
      "SaaS platforms with monthly or annual billing",
      "Membership programs with cancellation anytime",
      "Content platforms with subscription-gated access",
      "Service marketplaces with recurring billing",
      "Plan price locked forever in the on-chain Plan account",
    ],
    ctaLabel: "Integration guide →",
    ctaHref:
      "https://recuro.gitbook.io/recuro-sdk/getting-started/integration-guide",
    imageSrc: "/images/subscribe-flow.png",
    imageAlt: "Subscribe flow UI",
    tint: "teal",
    reverse: false,
  },
  {
    tag: "Non-custodial",
    title: "Funds never leave the subscriber's wallet",
    description:
      "Subscribers approve a delegate scoped to exactly one plan amount per cycle. Cancel instantly by revoking approval in Phantom. Zero future exposure.",
    checklist: [
      "Scoped approval — one amount, one merchant, one cycle",
      "Price locked forever in the on-chain Plan account",
      "Cancel anytime, no support ticket required",
      "Blast radius limited to one cycle if delegate is compromised",
    ],
    ctaLabel: "Why Recuro →",
    ctaHref: "https://recuro.gitbook.io/recuro-sdk/why-recuro",
    imageSrc: "/images/wallet-approval.png",
    imageAlt: "Wallet approval UI",
    tint: "purple",
    reverse: true,
  },
  {
    tag: "Reliability",
    title: "Reliable revenue with open keeper architecture",
    description:
      "Any keeper can execute payments — no single point of failure. Run your own keeper, use a paid service, or run multiples in parallel.",
    checklist: [
      "Multiple keepers ensure reliable payment execution",
      "Keepers rewarded from the protocol — no perverse incentives",
      "Graceful failure with auto-expiry after 3 missed cycles",
      "Rent returned to subscriber on expiry — no zombie accounts",
    ],
    ctaLabel: "Learn more →",
    ctaHref: "https://recuro.gitbook.io/recuro-sdk",
    imageSrc: "/images/keeper-network.png",
    imageAlt: "Keeper network diagram",
    tint: "blue",
    reverse: false,
  },
];

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Price locked",
    recuro: "✓ Immutable on-chain",
    competitors: "✗ Merchant can raise anytime",
  },
  {
    feature: "Custody",
    recuro: "✓ Non-custodial",
    competitors: "✗ Third-party holds funds",
  },
  {
    feature: "Delegate scope",
    recuro: "✓ One amount per cycle",
    competitors: "✗ Often unlimited SPL approval",
  },
  {
    feature: "Cancel protection",
    recuro: "✓ Instant SPL revoke in Phantom",
    competitors: "✗ Must contact support",
  },
  {
    feature: "Keeper model",
    recuro: "✓ Open & redundant",
    competitors: "✗ Single centralized service",
  },
  {
    feature: "Fee",
    recuro: "✓ 0.25%",
    competitors: "✗ 1-2% per transaction",
  },
  {
    feature: "Keeper rewards",
    recuro: "✓ Protocol-funded",
    competitors: "✗ Keeper absorbs gas cost",
  },
];
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "on-chain-price-immutability",
    tag: "Protocol design",
    title: "Why subscription billing needs on-chain price immutability",
    date: "Apr 25, 2026",
    readTime: "4 min read",
    excerpt:
      "Most recurring billing systems let the merchant change the price at will. Recuro locks the price in a Plan account at creation time — the number written to the blockchain is the number that gets pulled every cycle, forever.",
    body: `Most subscription systems make one critical promise and then quietly break it in practice: “you will be charged the price you agreed to.” In a traditional setup, the price lives in a private database controlled by the merchant or billing vendor. That means the value can be changed unilaterally, retroactively, or accidentally through internal tooling. Even honest teams can introduce drift between checkout, invoicing, and payment execution when multiple services update plan metadata independently.

  Recuro treats this as a protocol problem, not a UX problem. The amount, interval, and merchant identity are committed to an on-chain Plan account at creation time. Once the plan is created, the amount cannot be edited in place. There is no “silent update” endpoint, no mutable row, and no admin override hidden behind internal permissions. Billing automation always reads from that same account, so execution and agreement remain cryptographically coupled.

  This changes the trust model for subscribers. A subscriber is not granting open-ended permission to a merchant’s backend. They are approving one explicit cycle amount tied to one explicit plan definition. If the merchant wants to charge a different amount, they must publish a new plan and ask users to opt in. That creates a clean migration boundary: old price remains old price, new price is visibly new price, and consent is explicit.

  It also benefits merchants who care about long-term retention. Price immutability is a signal of discipline and predictability. If you sell fixed-rate memberships, annual support plans, or loyalty tiers, committing price rules on-chain can increase conversion because customers understand the rules cannot be changed in the dark. The guarantee is enforceable by code, not policy text.

  Of course, immutable pricing introduces constraints. It is not a natural fit for fully dynamic metered billing where every cycle depends on variable consumption. In those cases, teams can run a hybrid model: Recuro for the base recurring component and a separate settlement path for usage deltas. But for the majority of recurring products where predictability is the product promise, immutable plan pricing is not just safer. It is operationally cleaner, easier to audit, and easier to explain to users and regulators.

  The practical outcome is simple: the price the customer approved is the price the protocol can execute. Nothing else has authority over that number.`,
  },
  {
    slug: "delegate-approval-one-cycle",
    tag: "Security",
    title: "Delegate approvals that stop at exactly one cycle",
    date: "Apr 14, 2026",
    readTime: "6 min read",
    excerpt:
      "Most Solana protocols ask for an unlimited SPL token approval. Recuro scopes the delegate to exactly one cycle amount, so the blast radius of a compromised keeper is a single payment — not your entire wallet.",
    body: `Recurring payments are convenient only when users feel safe leaving them on. The biggest security mistake in many crypto billing flows is requesting a very large token approval up front and treating that as “good UX.” It is easy for protocol operators, but it creates an unacceptable worst-case outcome for users: if execution keys are compromised, if monitoring fails, or if a contract path is abused, the effective loss ceiling can become the subscriber’s entire token balance.

  Recuro takes the opposite approach. Delegate approvals are scoped to one cycle amount. The protocol reads the amount from the on-chain plan and approves exactly that number, not an arbitrary maximum. Execution consumes that allowance. A future cycle requires a new allowance event through the subscription flow. Security posture is therefore cycle-bounded by design.

  This is important because it shifts risk from catastrophic to tolerable. Under unlimited approvals, one exploit can become account-level extraction. Under one-cycle approvals, the theoretical maximum loss is one cycle payment per affected subscription before controls engage. That difference is not academic. It materially changes incident response, customer trust recovery, and legal exposure.

  Scoped approvals also align with user sovereignty. Subscribers can revoke at any time using standard wallet tooling such as Phantom’s token approval controls. They do not need protocol support intervention, cooldown windows, or opaque off-chain cancellation queues. Revocation is a native token-program operation that settles on-chain quickly and transparently.

  From an engineering perspective, this model does require more careful lifecycle handling than “approve once forever.” You need robust renewal logic, clear expiration semantics, and state checks that avoid accidental over-pulls. But that complexity is where it belongs: inside protocol guarantees, not pushed onto end users.

  The result is a recurring-payment system with explicit bounds. Every cycle is authorized, every pull is constrained, and every subscriber retains direct control over exit. In Web3 infrastructure, that is the right default. Convenience cannot justify unlimited authority over user funds, especially for long-lived payment relationships that may run for months or years.

  If recurring payments are going to become mainstream in crypto, blast radius minimization must be a baseline requirement. Scoped delegate approvals are one of the simplest and strongest ways to enforce that principle.`,
  },
  {
    slug: "open-keepers-resilience",
    tag: "Operations",
    title: "How open keepers make recurring payments resilient",
    date: "Apr 10, 2026",
    readTime: "5 min read",
    excerpt:
      "Centralized keeper services are a single point of failure. Recuro's open keeper architecture lets anyone execute payments — removing operational risk from your revenue stream.",
    body: `Recurring billing systems do not fail only because of bad logic. They fail because of operations. Even with perfect plan math and strong authorization checks, someone still has to trigger the payment transaction at the right time. In traditional stacks this is a scheduler inside your infrastructure. In on-chain systems, it is a keeper network. If that execution layer is centralized, your protocol quietly inherits a single point of failure.

  Recuro removes that dependency by making execution permissionless. Any keeper can submit a payment transaction for a due subscription. On-chain checks determine whether execution is valid based on timestamp, plan state, and subscription status. Identity is irrelevant. The chain enforces correctness, and the fastest valid transaction wins.

  This has two major benefits. First, reliability increases because execution can come from multiple independent operators: merchant-run nodes, third-party keeper providers, and public operators all at once. Second, protocol governance can avoid privileged execution keys that become high-value attack targets. Redundancy and neutrality are built into the runtime model.

  A common concern is duplicate charges when many keepers race the same opportunity. Recuro handles this at the state transition layer. Once one transaction updates the subscription’s next-payment timestamp and cycle counter, follow-up attempts fail the due-check condition. Concurrency is harmless because payment eligibility is single-use per interval.

  Incentives matter too. Keepers are compensated through a bounded slice of protocol fees, which creates a real market for uptime and performance. Merchants do not need bilateral contracts with every operator; they rely on open competition. If one operator degrades, others continue execution without manual intervention.

  The protocol also includes cleanup semantics for inactivity. If execution is missed for three consecutive cycles, subscriptions can expire automatically, delegate approval is no longer useful, and account lifecycle can complete cleanly. That prevents zombie state from accumulating and reduces long-tail risk from abandoned subscriptions.

  A practical production posture is layered: run your own keeper as primary, subscribe to a managed provider as backup, and allow public keepers as tertiary coverage. Because execution is permissionless and state-guarded, these layers do not conflict. They reinforce each other.

  For recurring revenue, resilience is not just “the contract compiles.” Resilience means payments continue when one server fails, one provider degrades, or one team makes a bad deploy. Open keepers turn that resilience from an operational aspiration into protocol behavior.`,
  },
];

export const INVESTOR_NAMES = [
  "Variant",
  "Placeholder Capital",
  "North Star",
  "Arcadia",
];

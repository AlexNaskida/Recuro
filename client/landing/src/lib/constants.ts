import type {
  BlogPost,
  ComparisonRow,
  FeatureRowData,
  NavLink,
  StatItem,
} from "@/types";

export const NAV_LINKS: NavLink[] = [
  { label: "Why Recuro", href: "#why-recuro" },
  { label: "Features", href: "#features" },
  { label: "Docs", href: "https://recuro.gitbook.io/recuro-sdk" },
  { label: "Blog", href: "https://recuro.gitbook.io/recuro-sdk" },
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
  { value: "5%", label: "protocol fee cap" },
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
    tag: "Protocol design",
    title: "Why subscription billing needs on-chain price immutability",
    date: "Apr 10, 2026",
    readTime: "4 min read",
    imageSrc: "/images/blog-1.png",
  },
  {
    tag: "Security",
    title: "Delegate approvals that stop at exactly one cycle",
    date: "Apr 10, 2026",
    readTime: "6 min read",
    imageSrc: "/images/blog-2.png",
  },
  {
    tag: "Operations",
    title: "How open keepers make recurring payments resilient",
    date: "Apr 10, 2026",
    readTime: "5 min read",
    imageSrc: "/images/blog-3.png",
  },
];

export const INVESTOR_NAMES = [
  "Variant",
  "Placeholder Capital",
  "North Star",
  "Arcadia",
];

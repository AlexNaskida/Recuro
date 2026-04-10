const groups = [
  {
    title: "Product",
    links: ["Why Recuro", "Features", "Pricing", "Security"],
  },
  {
    title: "Developers",
    links: ["Docs", "Integration guide", "SDK reference", "API status"],
  },
  {
    title: "Community",
    links: ["Blog", "X / Twitter", "GitHub", "Discord"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Cookies", "Licenses"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-dark text-white">
      <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-10 px-4 py-16 sm:px-6 md:grid-cols-5 lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <a
            href="/"
            className="font-display text-2xl font-extrabold tracking-tight"
          >
            Recur<span className="text-accent-light">o</span>
          </a>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
            Non-custodial recurring stablecoin subscriptions on Solana.
          </p>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
              {group.title}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {group.links.map((link) => (
                <li key={link}>
                  <a href="#" className="transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-5 text-sm text-white/25 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 Recuro</p>
          <p>
            Built for teams that want recurring revenue without custody
            tradeoffs.
          </p>
        </div>
      </div>
    </footer>
  );
}

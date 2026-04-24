import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const ROADMAP_COLUMNS = [
  {
    id: "q2-2026",
    quarter: "Q2 2026",
    status: "In progress",
    outcomes: [
      "Merchant dashboard beta for plan and subscription management",
      "Webhook delivery retries with configurable backoff windows",
      "Exportable billing data in CSV for finance reconciliation",
      "Improved subscription lifecycle events in SDK",
    ],
  },
  {
    id: "q3-2026",
    quarter: "Q3 2026",
    status: "Planned",
    outcomes: [
      "Multi-wallet checkout flow for smoother subscriber onboarding",
      "Policy controls for failed payment retries and grace periods",
      "Role-based team access in merchant dashboard",
      "Public status page for protocol and keeper health",
    ],
  },
  {
    id: "q4-2026",
    quarter: "Q4 2026",
    status: "Planned",
    outcomes: [
      "Usage-based billing primitives for metered products",
      "Automated dunning journeys for payment recovery",
      "Billing API v2 for advanced integrations",
      "Faster subscription indexing for high-volume merchants",
    ],
  },
  {
    id: "q1-2027",
    quarter: "Q1 2027",
    status: "Exploring",
    outcomes: [
      "Enterprise-grade audit log exports",
      "Cohort-level subscription analytics",
      "Embedded billing widgets for partner platforms",
      "Regional treasury routing options",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Roadmap
          </p>
          <h1 className="mt-3 font-display text-[clamp(32px,4.8vw,52px)] font-extrabold tracking-tight text-text-primary">
            Recuro product roadmap
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            Four planning tracks focused on merchant operations, protocol
            reliability, and developer velocity.
          </p>
        </div>

        <section className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_COLUMNS.map((column) => (
            <article
              id={column.id}
              key={column.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {column.quarter}
              </p>
              <p className="mt-2 inline-flex rounded-full border border-border bg-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                {column.status}
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-text-secondary">
                {column.outcomes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}

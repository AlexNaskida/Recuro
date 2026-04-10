import { STATS } from "@/lib/constants";

export default function StatsBanner() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto flex max-w-[1100px] flex-wrap justify-around gap-8 px-4 py-10 sm:px-6 lg:px-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-display text-4xl font-extrabold tracking-tight text-accent sm:text-5xl">
              {stat.value}
            </div>
            <p className="mt-2 text-sm text-text-tertiary">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

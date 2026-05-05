import { POWERED_STATS } from "@/lib/constants";
import {
  ProtocolPreview,
  WalletPreview,
  KeeperPreview,
} from "@/components/sections/PoweredByVisuals";

export default function PoweredBy() {
  return (
    <section className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
          Powered by Recuro
        </p>
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          Subscriptions with 24/7 on-chain thread coverage
        </h2>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-10 text-center">
        {POWERED_STATS.map((stat) => (
          <div key={stat.label} className="min-w-[160px]">
            <div className="font-display text-4xl font-extrabold tracking-tight text-accent">
              {stat.value}
            </div>
            <p className="mt-2 text-sm text-text-tertiary">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProtocolPreview />
        <WalletPreview />
        <KeeperPreview />
      </div>
    </section>
  );
}

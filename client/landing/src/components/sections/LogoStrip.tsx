import { PARTNER_LOGOS } from "@/lib/constants";

export default function LogoStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium tracking-[0.24em] text-text-tertiary">
          Trusted by teams building on Solana
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {PARTNER_LOGOS.map((logo) => (
            <div
              key={logo}
              className="flex h-14 items-center justify-center rounded-md border border-border bg-bg text-sm font-medium text-text-secondary shadow-sm"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

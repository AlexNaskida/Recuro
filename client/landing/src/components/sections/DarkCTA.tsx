import Button from "@/components/ui/Button";

export default function DarkCTA() {
  return (
    <section className="relative overflow-hidden bg-dark text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_35%),radial-gradient(circle_at_bottom,rgba(22,163,74,0.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1100px] px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.24em] text-white/45">
          Ready to ship
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
          Launch recurring billing without giving up custody.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
          Build a clean subscription experience that feels familiar to users and still
          preserves the security guarantees that matter most.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            href="https://recuro.gitbook.io/recuro-sdk/getting-started/quick-start"
            variant="white"
            size="lg"
          >
            Read quick start
          </Button>
          <Button
            href="https://github.com/recuro"
            variant="outline-white"
            size="lg"
          >
            View GitHub
          </Button>
        </div>
      </div>
    </section>
  );
}
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

export default function Hero() {
  return (
    <section
      id="why-recuro"
      className="mx-auto max-w-[1100px] px-4 pb-16 pt-14 text-center sm:px-6 lg:px-8 lg:pb-20 lg:pt-20"
    >
      <div className="mx-auto max-w-3xl">
        <Badge>Non-custodial recurring payments on Solana</Badge>
        <h1 className="mt-6 font-display text-[clamp(36px,5.5vw,62px)] font-extrabold tracking-tight text-text-primary">
          Recuro gives you a subscription stack built for on-chain billing.
        </h1>
        <p className="mx-auto mt-5 max-w-[480px] text-base leading-7 text-text-secondary sm:text-lg">
          Create recurring USDC subscriptions without touching subscriber funds.
          Keep price immutability, delegate safety, and keeper redundancy from
          day one.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            href="https://recuro.gitbook.io/recuro-sdk/getting-started/integration-guide"
            size="lg"
          >
            Start integrating
          </Button>
          <Button href="#features" variant="white" size="lg">
            Explore features
          </Button>
        </div>
      </div>

      <div className="mt-14">
        <ImagePlaceholder
          tint="neutral"
          imageSrc="/images/hero-dashboard.png"
          imageAlt="Recuro dashboard mockup"
          className="mx-auto max-w-[900px] shadow-float"
        />
      </div>
    </section>
  );
}

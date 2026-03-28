import { Wallet, FileCheck, Clock, CreditCard } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Wallet,
    title: "Connect Wallet",
    description:
      "Subscriber connects their Solana wallet and browses available subscription plans.",
  },
  {
    number: "02",
    icon: FileCheck,
    title: "Approve Delegate",
    description:
      "One-time approval grants a limited SPL delegate - only for the exact plan amount, only to your merchant address.",
  },
  {
    number: "03",
    icon: Clock,
    title: "Automatic Billing",
    description:
      "Keeper bots monitor subscriptions and execute payments on schedule. No manual intervention needed.",
  },
  {
    number: "04",
    icon: CreditCard,
    title: "Receive USDC",
    description:
      "Payments are transferred directly to your merchant wallet. Instant settlement, no delays.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
            How It Works
          </h2>
          <h3 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Simple integration, powerful results
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get started in minutes with our SDK. Four simple steps to recurring
            revenue.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-teal-500/50 to-transparent" />
              )}

              <div className="relative">
                {/* Step number */}
                <div className="text-6xl font-bold text-teal-500/10 absolute -top-4 -left-2">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
                  <step.icon className="w-7 h-7 text-teal-400" />
                </div>

                {/* Content */}
                <h4 className="text-xl font-semibold text-white mb-2">
                  {step.title}
                </h4>
                <p className="text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Code example */}
        <div className="mt-20 rounded-2xl bg-[#0d0d0d] border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-4 text-sm text-gray-500">integration.tsx</span>
          </div>
          <pre className="p-6 text-sm overflow-x-auto">
            <code className="text-gray-300">
              <span className="text-purple-400">import</span>
              {" { SubscriptionSdk } "}
              <span className="text-purple-400">from</span>{" "}
              <span className="text-green-400">&quot;@recuro/sdk&quot;</span>;
              {"\n\n"}
              <span className="text-gray-500">// Initialize the SDK</span>
              {"\n"}
              <span className="text-purple-400">const</span> sdk ={" "}
              <span className="text-purple-400">new</span>{" "}
              <span className="text-yellow-400">SubscriptionSdk</span>(provider,
              {"{ "}
              <span className="text-blue-400">cluster</span>:{" "}
              <span className="text-green-400">&quot;mainnet-beta&quot;</span>
              {" }"});{"\n\n"}
              <span className="text-gray-500">
                // Subscribe to a plan - that&apos;s it!
              </span>
              {"\n"}
              <span className="text-purple-400">const</span>
              {" { subscriptionPubkey } = "}
              <span className="text-purple-400">await</span>
              {" sdk."}
              <span className="text-yellow-400">createSubscription</span>
              {"({\n"}
              {"  "}
              <span className="text-blue-400">planPubkey</span>: planAddress,
              {"\n})"};
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

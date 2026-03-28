import { Shield, Lock, RefreshCw, Zap, DollarSign, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Non-Custodial by Design",
    description:
      "Subscriber funds stay in their wallet until payment time. You never touch their money - the Solana program handles transfers securely.",
  },
  {
    icon: Lock,
    title: "Immutable Pricing",
    description:
      "Plan prices are locked on-chain when created. Subscribers are protected from surprise price increases - the price they sign up for is the price they pay.",
  },
  {
    icon: RefreshCw,
    title: "Automatic Payments",
    description:
      "Once subscribers approve, payments execute automatically on schedule. No manual invoicing, no chasing payments, no failed renewals.",
  },
  {
    icon: Zap,
    title: "Instant Cancellation",
    description:
      "Subscribers can cancel anytime with one click. The SPL delegate is immediately revoked - zero future payment exposure.",
  },
  {
    icon: DollarSign,
    title: "Low Fees",
    description:
      "Only 0.25% protocol fee per transaction. No hidden charges, no monthly minimums. Just simple, transparent pricing.",
  },
  {
    icon: Users,
    title: "Open Keeper Network",
    description:
      "Anyone can run a keeper to execute payments. No single point of failure, no centralized dependency. Your subscriptions always execute.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0d1210] to-[#0a0a0a]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
            Features
          </h2>
          <h3 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built for Web3 subscriptions
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to accept recurring payments on Solana, without
            the complexity of traditional payment processors.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 transition-all duration-300 hover:bg-white/[0.04]"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4 group-hover:bg-teal-500/20 transition-colors">
                <feature.icon className="w-6 h-6 text-teal-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h4>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Feature showcase */}
        <div className="mt-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Powerful merchant dashboard
            </h3>
            <p className="text-lg text-gray-400 mb-8">
              Track your subscriptions, monitor revenue, and manage plans - all
              from a single dashboard. Real-time analytics help you understand
              your business.
            </p>
            <ul className="space-y-4">
              {[
                "Real-time subscription analytics",
                "Revenue and churn tracking",
                "Plan management interface",
                "Payment history and logs",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                  </div>
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
            {/* ==PASTE [screenshot of merchant-dashboard analytics/charts section] in HERE== */}
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
              <span className="text-gray-500 text-sm text-center">
                ==PASTE [screenshot of merchant-dashboard analytics/charts
                section] in HERE==
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

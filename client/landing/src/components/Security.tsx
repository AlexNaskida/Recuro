import { ShieldCheck, KeyRound, Eye, AlertTriangle } from "lucide-react";

const securityFeatures = [
  {
    icon: ShieldCheck,
    title: "Limited Delegate Scope",
    description:
      "SPL delegate can only transfer the exact plan amount to the specified merchant. No unlimited approvals, no blank checks.",
  },
  {
    icon: KeyRound,
    title: "On-Chain Validation",
    description:
      "All payment logic is enforced by the Solana program. Keepers can't manipulate amounts, destinations, or timing.",
  },
  {
    icon: Eye,
    title: "Fully Transparent",
    description:
      "Every transaction is visible on-chain. Open-source SDK and program code. Audit the security yourself.",
  },
  {
    icon: AlertTriangle,
    title: "Automatic Expiry",
    description:
      "Three consecutive payment failures auto-expire the subscription. No zombie accounts draining wallets.",
  },
];

export default function Security() {
  return (
    <section id="security" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Content */}
          <div>
            <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
              Security
            </h2>
            <h3 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Security you can verify
            </h3>
            <p className="text-xl text-gray-400 mb-10">
              Built with defense in depth. Every layer of the protocol is
              designed to minimize risk and protect subscriber funds.
            </p>

            <div className="space-y-6">
              {securityFeatures.map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-radial from-teal-500/10 via-transparent to-transparent" />
            <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] p-8">
              {/* Security diagram */}
              <div className="space-y-4">
                {/* Subscriber wallet */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-2xl">👛</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      Subscriber Wallet
                    </div>
                    <div className="text-sm text-gray-500">
                      Funds stay here until payment
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-teal-500/50 to-transparent" />
                </div>

                {/* Solana Program */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      Recuro Protocol
                    </div>
                    <div className="text-sm text-teal-400">
                      Validates & executes payments
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-teal-500/50 to-transparent" />
                </div>

                {/* Merchant wallet */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      Merchant Wallet
                    </div>
                    <div className="text-sm text-gray-500">
                      Receives exact plan amount
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

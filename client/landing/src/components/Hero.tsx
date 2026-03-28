import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-[#0a0a0a]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center px-4 py-1.5 mb-8 border border-teal-500/30 rounded-full bg-teal-500/5">
          <span className="w-2 h-2 bg-teal-400 rounded-full mr-2 animate-pulse" />
          <span className="text-sm text-teal-400">
            Built on Solana for speed and low fees
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          <span className="text-white">Non-Custodial</span>
          <br />
          <span className="text-gradient">Recurring Payments</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-10">
          Accept automated USDC subscription payments without ever touching
          subscriber funds. Subscribers approve once, payments execute
          automatically.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="group px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-teal-500/25"
          >
            Start Building
            <ArrowRight
              className="group-hover:translate-x-1 transition-transform"
              size={20}
            />
          </Link>
          <Link
            href="https://github.com/AlexNaskida/recuro-sdk"
            target="_blank"
            className="px-8 py-4 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all duration-200 bg-white/5 hover:bg-white/10"
          >
            View Documentation
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/[0.02] border border-white/5">
            <Shield className="w-5 h-5 text-teal-400" />
            <span className="text-gray-300">Non-Custodial</span>
          </div>
          <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/[0.02] border border-white/5">
            <Zap className="w-5 h-5 text-teal-400" />
            <span className="text-gray-300">Instant Settlement</span>
          </div>
          <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/[0.02] border border-white/5">
            <Globe className="w-5 h-5 text-teal-400" />
            <span className="text-gray-300">Global Payments</span>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] glow">
            {/* ==PASTE [screenshot of merchant-dashboard main overview page] in HERE== */}
            <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
              <span className="text-gray-500 text-sm">
                ==PASTE [screenshot of merchant-dashboard main overview page] in
                HERE==
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

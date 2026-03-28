import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-teal-950/20 to-[#0a0a0a]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Glow effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 bg-teal-500/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to accept
            <br />
            <span className="text-gradient">recurring payments?</span>
          </h2>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join merchants building the future of subscriptions on Solana. Get
            started in minutes with our SDK.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-teal-500/25"
            >
              Launch Dashboard
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
              Read the Docs
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Open Source
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Non-Custodial
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Built on Solana
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Github, Twitter } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Security", href: "#security" },
    { name: "Pricing", href: "#pricing" },
  ],
  Developers: [
    {
      name: "Documentation",
      href: "https://github.com/AlexNaskida/recuro-sdk",
    },
    {
      name: "SDK Reference",
      href: "https://github.com/AlexNaskida/recuro-sdk",
    },
    { name: "GitHub", href: "https://github.com/AlexNaskida/recuro-sdk" },
    { name: "Examples", href: "https://github.com/AlexNaskida/recuro-sdk" },
  ],
  Resources: [
    { name: "Merchant Guide", href: "#" },
    { name: "Keeper Setup", href: "#" },
    { name: "FAQ", href: "#" },
    { name: "Support", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-semibold text-white">Recuro</span>
            </Link>
            <p className="text-gray-500 text-sm mb-6">
              Non-custodial recurring payments on Solana. Accept subscriptions
              without touching subscriber funds.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="https://github.com/AlexNaskida/recuro-sdk"
                target="_blank"
                className="text-gray-500 hover:text-white transition-colors"
              >
                <Github size={20} />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                className="text-gray-500 hover:text-white transition-colors"
              >
                <Twitter size={20} />
              </Link>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-500 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Recuro. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="#"
              className="text-gray-500 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-gray-500 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

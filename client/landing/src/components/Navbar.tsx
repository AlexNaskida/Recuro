"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="text-xl font-semibold text-white">Recuro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              How It Works
            </Link>
            <Link
              href="#security"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Security
            </Link>
            <Link
              href="https://github.com/AlexNaskida/recuro-sdk"
              target="_blank"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Docs
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/5">
            <div className="flex flex-col space-y-4">
              <Link
                href="#features"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                How It Works
              </Link>
              <Link
                href="#security"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Security
              </Link>
              <Link
                href="https://github.com/AlexNaskida/recuro-sdk"
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Docs
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

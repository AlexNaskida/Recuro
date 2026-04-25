"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-[1100px] items-center px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-text-primary"
        >
          {/*<span className="size-8 items-center justify-center">
           <Image
              src="/Recuro.svg"
              alt="Recuro Logo"
              width={35}
              height={35}
            /> 
          </span>*/}
          <span className="inline-flex items-baseline leading-none">
            Recur<span className="-ml-[0.02em] text-primary">o</span>
          </span>
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={
                link.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {/* <Button href="https://github.com/AlexNaskida/recuro" variant="ghost" size="sm">
            GitHub
          </Button> */}
          <Button href="https://recuro.gitbook.io/" variant="ghost" size="sm">
            Docs
          </Button>
          <Button
            href="https://recuro-app.pages.dev"
            variant="primary"
            size="sm"
          >
            Start integrating
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text-primary md:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border bg-bg md:hidden",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 py-4 sm:px-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={
                link.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="text-sm font-medium text-text-secondary"
            >
              {link.label}
            </a>
          ))}
          <Button
            href="https://recuro.gitbook.io/recuro-sdk/getting-started/integration-guide"
            variant="primary"
            size="sm"
            className="w-full"
          >
            Start integrating
          </Button>
        </div>
      </div>
    </header>
  );
}

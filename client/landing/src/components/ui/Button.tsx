import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "white" | "outline-white";

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-[0_18px_40px_-22px_rgba(126,58,242,0.92)] ring-1 ring-inset ring-white/10 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_24px_50px_-24px_rgba(126,58,242,0.96)]",
  ghost:
    "bg-transparent text-text-primary ring-1 ring-inset ring-border/80 hover:bg-black/[0.03] hover:text-text-primary",
  white:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,248,0.98)_100%)] text-text-primary shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)] ring-1 ring-inset ring-border hover:-translate-y-0.5",
  "outline-white":
    "bg-white/[0.04] text-white ring-1 ring-inset ring-white/20 hover:bg-white/[0.08] hover:-translate-y-0.5",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  const classes = cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:pointer-events-none disabled:opacity-50",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:opacity-0 before:transition-opacity before:duration-200 before:content-[''] hover:before:opacity-100",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if (href) {
    const external = /^https?:\/\//.test(href);

    return (
      <a
        href={href}
        className={classes}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        <span className="relative z-10">{children}</span>
      </a>
    );
  }

  return (
    <button
      className={classes}
      type={buttonProps.type ?? "button"}
      {...buttonProps}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

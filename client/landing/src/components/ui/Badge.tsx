import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  className?: string;
};

export default function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#d2efe8] bg-[linear-gradient(180deg,rgba(241,250,247,0.95)_0%,rgba(230,246,241,0.95)_100%)] px-4 py-2 text-[11px] font-semibold tracking-[0.15em] text-[#0f6b5d] shadow-[0_12px_28px_-24px_rgba(12,144,128,0.85)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

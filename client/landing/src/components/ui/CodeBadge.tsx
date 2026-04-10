import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type CodeBadgeProps = {
  children: ReactNode;
  className?: string;
};

export default function CodeBadge({ children, className }: CodeBadgeProps) {
  return (
    <code
      className={cn(
        "inline-flex items-center gap-2 rounded-[14px] border border-[#1e1f1e] bg-[linear-gradient(180deg,#131513_0%,#0c0d0c_100%)] px-4 py-2 font-mono text-xs text-white/90 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.85)]",
        className,
      )}
    >
      <span className="text-[#67f0d4]">$</span>
      {children}
    </code>
  );
}

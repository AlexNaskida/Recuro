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
        "inline-flex items-center rounded-md border border-border bg-[#111110] px-3 py-2 font-mono text-xs text-white/90 shadow-card",
        className,
      )}
    >
      {children}
    </code>
  );
}

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
        "inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tracking-wide text-text-secondary shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ── Button ────────────────────────────────────────────────────────────────────
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand:       "bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 active:scale-[0.98]",
        destructive: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20",
        outline:     "border border-surface-4 bg-transparent hover:bg-surface-3 text-foreground",
        ghost:       "hover:bg-surface-3 text-muted-foreground hover:text-foreground",
        surface:     "bg-surface-3 border border-surface-4 text-foreground hover:border-brand-500/60",
        emerald:     "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:scale-[0.98]",
      },
      size: {
        sm:   "h-8 px-3 text-xs",
        md:   "h-10 px-4",
        lg:   "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "brand", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} disabled={loading || props.disabled} {...props}>
        {loading
          ? (<><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{children}</>)
          : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

// ── Badge ─────────────────────────────────────────────────────────────────────
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border", {
  variants: {
    variant: {
      active:    "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      cancelled: "bg-red-500/15    border-red-500/30    text-red-400",
      expired:   "bg-surface-3     border-surface-4     text-muted-foreground",
      past_due:  "bg-amber-500/15  border-amber-500/30  text-amber-400",
      default:   "bg-brand-500/15  border-brand-500/30  text-brand-400",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-2xl border border-surface-4 bg-surface-2 text-foreground", className)} {...props} />
  )
);
Card.displayName = "Card";

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "flex h-10 w-full rounded-xl border border-surface-4 bg-surface-3 px-3 py-2 text-sm",
      "placeholder:text-muted-foreground transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:border-brand-500",
      "disabled:cursor-not-allowed disabled:opacity-50", className
    )} {...props} />
  )
);
Input.displayName = "Input";

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton h-4 rounded", className)} {...props} />;
}

// ── Separator ─────────────────────────────────────────────────────────────────
export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-surface-4", className)} />;
}

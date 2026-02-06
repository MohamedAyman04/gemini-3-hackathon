import * as React from "react";
import { cn } from "@/lib/utils";

// Needs class-variance-authority, but I can just manually do it for now if I don't want to install it.
// I'll manually handle it since I didn't verify if cva is installed (it often comes with shadcn).
// Actually, `cva` is super useful. I'll just write it manually for now to save an install/import error risk.

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
    secondary:
      "border-secondary/20 bg-secondary/10 text-secondary hover:bg-secondary/20",
    destructive:
      "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",
    outline: "border-border text-foreground hover:bg-white/5",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

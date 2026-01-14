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
    default:
      "border-transparent bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20",
    secondary:
      "border-transparent bg-slate-800 text-slate-300 hover:bg-slate-700",
    destructive:
      "border-transparent bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    outline: "text-foreground",
    success:
      "border-transparent bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20",
    warning:
      "border-transparent bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };

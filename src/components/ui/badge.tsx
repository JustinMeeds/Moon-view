import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "muted" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variant === "default" && "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30",
        variant === "success" && "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30",
        variant === "muted" && "bg-white/10 text-white/50 border border-white/10",
        variant === "warning" && "bg-amber-600/30 text-amber-300 border border-amber-500/30",
        className
      )}
      {...props}
    />
  );
}

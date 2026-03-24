import React from "react";
import { Badge } from "@/components/ui/badge";
import type { SeasonStatus } from "@/lib/regulations";

interface SeasonBadgeProps {
  status: SeasonStatus;
  className?: string;
}

export function SeasonBadge({ status, className }: SeasonBadgeProps) {
  if (status === "IN_SEASON") {
    return <Badge variant="success" className={className}>IN SEASON</Badge>;
  }
  if (status === "CATCH_AND_RELEASE") {
    return <Badge variant="warning" className={className}>CATCH &amp; RELEASE</Badge>;
  }
  return <Badge variant="default" className={`bg-red-500/20 text-red-300 border-red-500/30 ${className ?? ""}`}>CLOSED</Badge>;
}

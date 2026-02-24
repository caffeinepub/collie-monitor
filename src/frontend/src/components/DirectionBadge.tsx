import { Badge } from "@/components/ui/badge";
import type { TradeDirection } from "@/backend.d";

interface DirectionBadgeProps {
  direction: TradeDirection;
  className?: string;
}

export function DirectionBadge({ direction, className }: DirectionBadgeProps) {
  const isLong = direction === "LONG";

  return (
    <Badge
      variant={isLong ? "default" : "destructive"}
      className={className}
    >
      {direction}
    </Badge>
  );
}

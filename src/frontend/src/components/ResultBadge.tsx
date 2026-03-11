import type { TradeResult } from "@/backend.d";
import { Badge } from "@/components/ui/badge";

interface ResultBadgeProps {
  result: TradeResult;
  className?: string;
}

export function ResultBadge({ result, className }: ResultBadgeProps) {
  const isWin = result === "WIN";

  return (
    <Badge variant={isWin ? "default" : "destructive"} className={className}>
      {result}
    </Badge>
  );
}

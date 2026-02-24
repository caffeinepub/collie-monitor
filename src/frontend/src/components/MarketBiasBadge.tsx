import { Badge } from "@/components/ui/badge";

export type MarketBias = "BULLISH" | "BEARISH" | "NEUTRAL";

interface MarketBiasBadgeProps {
  bias: MarketBias;
  className?: string;
}

export function MarketBiasBadge({ bias, className }: MarketBiasBadgeProps) {
  const variants = {
    BULLISH: "default" as const,
    BEARISH: "destructive" as const,
    NEUTRAL: "secondary" as const,
  };

  return (
    <Badge variant={variants[bias]} className={className}>
      {bias}
    </Badge>
  );
}

import { useStrategyModules, useEnrichedActiveTrades } from "@/hooks/useStrategies";
import { useCloseTrade } from "@/hooks/useQueries";
import { calculateProgressToTP1 } from "@/utils/calculations";
import { formatUSD, formatPercent } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DirectionBadge } from "@/components/DirectionBadge";
import { toast } from "sonner";
import { Loader2, TrendingUp } from "lucide-react";

export function StrategyModules() {
  const { data: strategies, isLoading: strategiesLoading } = useStrategyModules();
  const enrichedTrades = useEnrichedActiveTrades();
  const { mutate: closeTrade, isPending: isClosing } = useCloseTrade();

  const handleCloseTrade = (tradeId: bigint, currentPrice: number, entryPrice: number) => {
    const finalPnl = ((currentPrice - entryPrice) / entryPrice) * 100;

    closeTrade(
      { tradeId, finalPnl },
      {
        onSuccess: () => {
          toast.success("Trade closed successfully");
        },
        onError: (error) => {
          toast.error(`Failed to close trade: ${error.message}`);
        },
      }
    );
  };

  if (strategiesLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const activeTradesMap = new Map(
    enrichedTrades.map((trade) => [trade.moduleName, trade])
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Strategy Modules</h1>
        <p className="text-muted-foreground">
          {activeTradesMap.size} active trade{activeTradesMap.size !== 1 ? "s" : ""} across 5 strategies
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => {
          const activeTrade = activeTradesMap.get(strategy.name);

          const progressToTP1 = activeTrade
            ? calculateProgressToTP1(
                activeTrade.entryPrice,
                activeTrade.currentPrice,
                activeTrade.tp1,
                activeTrade.direction === "LONG" ? "LONG" : "SHORT"
              )
            : 0;

          const statusColors = {
            Scanning: "bg-secondary text-secondary-foreground",
            TradeOpen: "bg-success text-success-foreground",
            Closing: "bg-destructive text-destructive-foreground",
          };

          return (
            <Card
              key={strategy.name}
              className="card-glow border-primary/20"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{strategy.name}</span>
                  <Badge
                    className={statusColors[strategy.status]}
                  >
                    {strategy.status === "TradeOpen" ? "Trade Open" : strategy.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {strategy.description}
                </p>

                {/* Active Trade Info */}
                {activeTrade ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">
                        {activeTrade.symbol}
                      </span>
                      <DirectionBadge direction={activeTrade.direction} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Entry</p>
                        <p className="font-mono font-medium">
                          {formatUSD(activeTrade.entryPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current</p>
                        <p className="font-mono font-medium">
                          {formatUSD(activeTrade.currentPrice)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Current PnL
                      </p>
                      <p
                        className={`font-mono text-2xl font-bold ${
                          activeTrade.currentPnlPercent >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatPercent(activeTrade.currentPnlPercent)}
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Progress to TP1
                        </span>
                        <span className="font-mono font-medium">
                          {progressToTP1.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={Math.max(0, Math.min(100, progressToTP1))} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">TP1</p>
                        <p className="font-mono text-success">
                          {formatUSD(activeTrade.tp1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">TP2</p>
                        <p className="font-mono text-success">
                          {formatUSD(activeTrade.tp2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SL</p>
                        <p className="font-mono text-destructive">
                          {formatUSD(activeTrade.stopLoss)}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        handleCloseTrade(
                          activeTrade.tradeId,
                          activeTrade.currentPrice,
                          activeTrade.entryPrice
                        )
                      }
                      disabled={isClosing}
                    >
                      {isClosing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Closing...
                        </>
                      ) : (
                        "Close Trade Manually"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
                    <TrendingUp className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Scanning for opportunity...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

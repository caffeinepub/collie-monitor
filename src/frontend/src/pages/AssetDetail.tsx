import { useParams, useNavigate } from "@tanstack/react-router";
import { useMarketData, useOpenInterest } from "@/hooks/useBinanceApi";
import {
  calculateEntryZone,
  calculateTakeProfits,
  calculateStopLoss,
  getMarketBias,
  calculateLongShortRatio,
} from "@/utils/calculations";
import { formatUSD, formatPercent, formatCompact } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketBiasBadge } from "@/components/MarketBiasBadge";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

export function AssetDetail() {
  const navigate = useNavigate();
  const { symbol } = useParams({ strict: false });
  const { data: marketData, isLoading } = useMarketData();
  const { data: openInterest, isLoading: oiLoading } = useOpenInterest(symbol || "");

  const assetData = marketData?.find((item) => item.symbol === symbol);

  if (isLoading || oiLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!assetData) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Asset not found</p>
      </div>
    );
  }

  const entryZone = calculateEntryZone(assetData.price);
  const tps = calculateTakeProfits(assetData.price, "LONG");
  const stopLoss = calculateStopLoss(assetData.price, "LONG");
  const marketBias = getMarketBias(assetData.change24h);
  const longShortRatio = calculateLongShortRatio(assetData.fundingRate);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono text-foreground">
              {symbol}
            </h1>
            <p className="text-muted-foreground">Perpetual USDT-M</p>
          </div>
          <MarketBiasBadge bias={marketBias} />
        </div>
      </div>

      {/* Price Overview */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle>Price Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="font-mono text-4xl font-bold text-primary">
                {formatUSD(assetData.price)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">24h High</p>
              <p className="font-mono text-2xl font-bold text-success">
                {formatUSD(assetData.high24h)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">24h Low</p>
              <p className="font-mono text-2xl font-bold text-destructive">
                {formatUSD(assetData.low24h)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">24h Change</p>
              <p
                className={`font-mono text-lg font-medium ${
                  assetData.change24h >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {assetData.change24h >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatPercent(assetData.change24h)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume (24h)</p>
              <p className="font-mono text-lg font-medium">
                {formatCompact(assetData.volume)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Funding Rate</p>
              <p
                className={`font-mono text-lg font-medium ${
                  assetData.fundingRate >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatPercent(assetData.fundingRate * 100, 4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Interest</p>
              <p className="font-mono text-lg font-medium">
                {openInterest ? formatCompact(openInterest) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Long/Short Ratio */}
        <Card>
          <CardHeader>
            <CardTitle>Long/Short Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-success">Long</span>
                <span className="font-mono font-medium">
                  {(longShortRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-destructive">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${longShortRatio * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-destructive">Short</span>
                <span className="font-mono font-medium">
                  {((1 - longShortRatio) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entry Zone */}
        <Card>
          <CardHeader>
            <CardTitle>Suggested Entry Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lower Bound</span>
                <span className="font-mono font-medium text-success">
                  {formatUSD(entryZone.min)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Upper Bound</span>
                <span className="font-mono font-medium text-destructive">
                  {formatUSD(entryZone.max)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ±2% from current price
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Take Profit & Stop Loss */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Take Profit & Stop Loss Levels (LONG)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">TP1 (+3%)</p>
              <p className="font-mono text-xl font-bold text-success">
                {formatUSD(tps.tp1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TP2 (+6%)</p>
              <p className="font-mono text-xl font-bold text-success">
                {formatUSD(tps.tp2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TP3 (+10%)</p>
              <p className="font-mono text-xl font-bold text-success">
                {formatUSD(tps.tp3)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stop Loss (-2%)</p>
              <p className="font-mono text-xl font-bold text-destructive">
                {formatUSD(stopLoss)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

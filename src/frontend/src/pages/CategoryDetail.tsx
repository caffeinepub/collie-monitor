import { useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMarketData } from "@/hooks/useBinanceApi";
import { getCategoryName, categorizeSymbol } from "@/utils/categories";
import { calculateMomentumScore } from "@/utils/calculations";
import { formatUSD, formatPercent } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import type { SymbolCategory } from "@/types/market";

export function CategoryDetail() {
  const navigate = useNavigate();
  const { categoryName } = useParams({ strict: false });
  const { data: marketData, isLoading } = useMarketData();

  const categorySymbols = useMemo(() => {
    if (!marketData || !categoryName) return [];

    return marketData
      .filter((item) => item.category === categoryName)
      .map((item) => ({
        symbol: item.symbol,
        price: item.price,
        change24h: item.change24h,
        fundingRate: item.fundingRate,
        momentum: item.momentum,
      }))
      .sort((a, b) => b.momentum - a.momentum);
  }, [marketData, categoryName]);

  const topPicks = categorySymbols.slice(0, 3);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!categoryName) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Category not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/categories" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {getCategoryName(categoryName as SymbolCategory)}
          </h1>
          <p className="text-muted-foreground">
            {categorySymbols.length} symbols in this category
          </p>
        </div>
      </div>

      {topPicks.length > 0 && (
        <Card className="card-glow border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top 3 Picks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topPicks.map((symbol, index) => (
                <div
                  key={symbol.symbol}
                  className="cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                  onClick={() => navigate({ to: `/asset/${symbol.symbol}` })}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-lg font-bold">
                        {symbol.symbol}
                      </p>
                      <p className="font-mono text-2xl font-bold text-primary">
                        {formatUSD(symbol.price)}
                      </p>
                    </div>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">24h Change</span>
                    <span
                      className={`font-mono font-medium ${
                        symbol.change24h >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPercent(symbol.change24h)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Momentum</span>
                    <span className="font-mono font-medium text-primary">
                      {symbol.momentum.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categorySymbols.map((symbol) => (
              <div
                key={symbol.symbol}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                onClick={() => navigate({ to: `/asset/${symbol.symbol}` })}
              >
                <div className="flex items-center gap-6">
                  <div>
                    <p className="font-mono font-medium">{symbol.symbol}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {formatUSD(symbol.price)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">24h Change</p>
                    <p
                      className={`font-mono text-sm font-medium ${
                        symbol.change24h >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {symbol.change24h >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatPercent(symbol.change24h)}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Funding</p>
                    <p
                      className={`font-mono text-sm font-medium ${
                        symbol.fundingRate >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatPercent(symbol.fundingRate * 100, 4)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Momentum</p>
                    <p className="font-mono text-sm font-medium text-primary">
                      {symbol.momentum.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {categorySymbols.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                No symbols in this category
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

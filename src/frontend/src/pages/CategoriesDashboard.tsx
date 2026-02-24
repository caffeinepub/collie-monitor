import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMarketData } from "@/hooks/useBinanceApi";
import { getAllCategories, getCategoryName, categorizeSymbol } from "@/utils/categories";
import { calculateMomentumScore } from "@/utils/calculations";
import { formatPercent } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/Sparkline";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { SymbolCategory } from "@/types/market";

interface CategoryData {
  category: SymbolCategory;
  symbols: Array<{
    symbol: string;
    change24h: number;
    momentum: number;
  }>;
  avgFunding: number;
  avgChange: number;
  topPerformer: string;
  topPerformerChange: number;
  momentumHistory: number[];
}

export function CategoriesDashboard() {
  const navigate = useNavigate();
  const { data: marketData, isLoading } = useMarketData();

  const categoryData = useMemo(() => {
    if (!marketData) return [];

    const categories = getAllCategories();
    
    return categories.map((category): CategoryData => {
      const categorySymbols = marketData
        .filter((item) => item.category === category)
        .map((item) => ({
          symbol: item.symbol,
          change24h: item.change24h,
          fundingRate: item.fundingRate,
          momentum: item.momentum,
        }));

      if (categorySymbols.length === 0) {
        return {
          category,
          symbols: [],
          avgFunding: 0,
          avgChange: 0,
          topPerformer: "-",
          topPerformerChange: 0,
          momentumHistory: [],
        };
      }

      const avgFunding =
        categorySymbols.reduce((sum, s) => sum + s.fundingRate, 0) /
        categorySymbols.length;
      
      const avgChange =
        categorySymbols.reduce((sum, s) => sum + s.change24h, 0) /
        categorySymbols.length;

      const sortedByChange = [...categorySymbols].sort(
        (a, b) => b.change24h - a.change24h
      );
      const topPerformer = sortedByChange[0];

      // Generate sparkline data (last 7 momentum snapshots - simulated)
      const momentumHistory = categorySymbols
        .slice(0, 7)
        .map((s) => s.momentum);

      return {
        category,
        symbols: categorySymbols,
        avgFunding,
        avgChange,
        topPerformer: topPerformer.symbol,
        topPerformerChange: topPerformer.change24h,
        momentumHistory,
      };
    });
  }, [marketData]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Categories</h1>
        <p className="text-muted-foreground">
          Market overview by asset category
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categoryData.map((cat) => (
          <Card
            key={cat.category}
            className="card-glow cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate({ to: `/category/${cat.category}` })}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{getCategoryName(cat.category)}</span>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    cat.avgChange >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {cat.avgChange >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatPercent(cat.avgChange)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top Performer */}
              <div>
                <p className="text-xs text-muted-foreground">Top Performer</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-medium">{cat.topPerformer}</p>
                  <p
                    className={`font-mono text-sm ${
                      cat.topPerformerChange >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {formatPercent(cat.topPerformerChange)}
                  </p>
                </div>
              </div>

              {/* Avg Funding Rate */}
              <div>
                <p className="text-xs text-muted-foreground">Avg Funding Rate</p>
                <p
                  className={`font-mono font-medium ${
                    cat.avgFunding >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatPercent(cat.avgFunding * 100, 4)}
                </p>
              </div>

              {/* Momentum Sparkline */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Momentum Trend
                </p>
                {cat.momentumHistory.length > 1 ? (
                  <Sparkline
                    data={cat.momentumHistory}
                    width={180}
                    height={32}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </div>

              {/* Symbol Count */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {cat.symbols.length} symbols
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

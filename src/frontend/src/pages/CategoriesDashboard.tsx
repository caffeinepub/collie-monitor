import { Sparkline } from "@/components/Sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketData } from "@/hooks/useBinanceApi";
import type { SymbolCategory } from "@/types/market";
import { getAllCategories, getCategoryName } from "@/utils/categories";
import { formatPercent } from "@/utils/formatters";
import { useNavigate } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

const SKELETON_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6"];

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
        (a, b) => b.change24h - a.change24h,
      );
      const topPerformer = sortedByChange[0];

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
          {SKELETON_KEYS.map((key) => (
            <Skeleton key={key} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Categories</h1>
        <p className="text-muted-foreground">
          Market overview by asset category
        </p>
      </div>

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

              <div>
                <p className="text-xs text-muted-foreground">
                  Avg Funding Rate
                </p>
                <p
                  className={`font-mono font-medium ${
                    cat.avgFunding >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatPercent(cat.avgFunding * 100, 4)}
                </p>
              </div>

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

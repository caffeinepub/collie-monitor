import { useMemo } from "react";
import { useMarketData } from "./useBinanceApi";
import { useActiveTrades, useAddActiveTrade, useCloseTrade } from "./useQueries";
import type { TradeDirection } from "@/backend.d.ts";
import { calculateTakeProfits, calculateStopLoss, calculatePnLPercent } from "@/utils/calculations";
import type { StrategyModule } from "@/types/market";

// Strategy definitions
const STRATEGY_DEFINITIONS: StrategyModule[] = [
  {
    name: "Trend Following",
    description: "Enters LONG/SHORT based on 24h change + funding rate",
    status: "Scanning",
  },
  {
    name: "Breakout",
    description: "Enters when price near 24h high/low with high volume",
    status: "Scanning",
  },
  {
    name: "Mean Reversion",
    description: "Counter-trades extreme moves with high OI",
    status: "Scanning",
  },
  {
    name: "Funding Rate Arbitrage",
    description: "Trades based on anomalous funding rates",
    status: "Scanning",
  },
  {
    name: "Momentum Scalp",
    description: "Selects top 3 assets by absolute change",
    status: "Scanning",
  },
];

/**
 * Hook to manage strategy modules with their active trades
 */
export function useStrategyModules() {
  const { data: marketData, isLoading: marketLoading } = useMarketData();
  const { data: activeTrades, isLoading: tradesLoading } = useActiveTrades();

  const strategiesWithTrades = useMemo(() => {
    if (!activeTrades || !marketData) return STRATEGY_DEFINITIONS;

    return STRATEGY_DEFINITIONS.map((strategy) => {
      const activeTrade = activeTrades.find((t) => t.moduleName === strategy.name);
      
      if (activeTrade) {
        return {
          ...strategy,
          status: "TradeOpen" as const,
        };
      }

      return strategy;
    });
  }, [activeTrades, marketData]);

  return {
    data: strategiesWithTrades,
    isLoading: marketLoading || tradesLoading,
  };
}

/**
 * Hook to get enriched active trade details with current market prices
 */
export function useEnrichedActiveTrades() {
  const { data: marketData } = useMarketData();
  const { data: activeTrades } = useActiveTrades();

  const enrichedTrades = useMemo(() => {
    if (!activeTrades || !marketData) return [];

    return activeTrades.map((trade) => {
      const market = marketData.find((m) => m.symbol === trade.symbol);
      const currentPrice = market?.price || trade.entryPrice;

      const { tp1, tp2, tp3 } = calculateTakeProfits(
        trade.entryPrice,
        trade.direction === "LONG" ? "LONG" : "SHORT"
      );
      const stopLoss = calculateStopLoss(
        trade.entryPrice,
        trade.direction === "LONG" ? "LONG" : "SHORT"
      );

      const currentPnlPercent = calculatePnLPercent(
        trade.entryPrice,
        currentPrice,
        trade.direction === "LONG" ? "LONG" : "SHORT"
      );

      return {
        ...trade,
        currentPrice,
        tp1,
        tp2,
        tp3,
        stopLoss,
        currentPnlPercent,
      };
    });
  }, [activeTrades, marketData]);

  return enrichedTrades;
}

/**
 * Strategy evaluation logic (runs every 60s via market data refresh)
 * Returns a trade signal if conditions are met
 */
export function evaluateStrategy(
  strategyName: string,
  marketData: ReturnType<typeof useMarketData>["data"]
): {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
} | null {
  if (!marketData || marketData.length === 0) return null;

  switch (strategyName) {
    case "Trend Following": {
      // Enter LONG if change > 5% and funding > 0.01%
      // Enter SHORT if change < -5% and funding < -0.01%
      const candidates = marketData.filter(
        (m) =>
          (m.change24h > 5 && m.fundingRate > 0.0001) ||
          (m.change24h < -5 && m.fundingRate < -0.0001)
      );
      
      if (candidates.length === 0) return null;

      const best = candidates.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];
      return {
        symbol: best.symbol,
        direction: best.change24h > 0 ? ("LONG" as TradeDirection) : ("SHORT" as TradeDirection),
        entryPrice: best.price,
      };
    }

    case "Breakout": {
      // Enter when price is within 1% of 24h high (LONG) or low (SHORT) with volume > avg
      const avgVolume =
        marketData.reduce((sum, m) => sum + m.volume, 0) / marketData.length;

      const candidates = marketData.filter((m) => {
        const nearHigh = m.price >= m.high24h * 0.99;
        const nearLow = m.price <= m.low24h * 1.01;
        const highVolume = m.volume > avgVolume * 1.5;
        return (nearHigh || nearLow) && highVolume;
      });

      if (candidates.length === 0) return null;

      const best = candidates[0];
      const nearHigh = best.price >= best.high24h * 0.99;

      return {
        symbol: best.symbol,
        direction: nearHigh ? ("LONG" as TradeDirection) : ("SHORT" as TradeDirection),
        entryPrice: best.price,
      };
    }

    case "Mean Reversion": {
      // Enter opposite direction when change is extreme (> ±8%)
      const candidates = marketData.filter((m) => Math.abs(m.change24h) > 8);

      if (candidates.length === 0) return null;

      const best = candidates.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];

      return {
        symbol: best.symbol,
        direction: best.change24h > 0 ? ("SHORT" as TradeDirection) : ("LONG" as TradeDirection),
        entryPrice: best.price,
      };
    }

    case "Funding Rate Arbitrage": {
      // Enter SHORT if funding > 0.1% (high positive)
      // Enter LONG if funding < -0.05% (negative)
      const candidates = marketData.filter(
        (m) => m.fundingRate > 0.001 || m.fundingRate < -0.0005
      );

      if (candidates.length === 0) return null;

      const best = candidates.sort(
        (a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate)
      )[0];

      return {
        symbol: best.symbol,
        direction: best.fundingRate > 0 ? ("SHORT" as TradeDirection) : ("LONG" as TradeDirection),
        entryPrice: best.price,
      };
    }

    case "Momentum Scalp": {
      // Select top asset by absolute change and enter in direction of movement
      const sorted = [...marketData].sort(
        (a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)
      );

      if (sorted.length === 0 || Math.abs(sorted[0].change24h) < 3) return null;

      const best = sorted[0];

      return {
        symbol: best.symbol,
        direction: best.change24h > 0 ? ("LONG" as TradeDirection) : ("SHORT" as TradeDirection),
        entryPrice: best.price,
      };
    }

    default:
      return null;
  }
}

/**
 * Calculate momentum score based on change, volume, and funding rate
 */
export function calculateMomentumScore(
  change24h: number,
  volume: number,
  fundingRate: number
): number {
  const changeScore = Math.abs(change24h) * 0.4;
  const volumeScore = (volume / 1_000_000) * 0.3;
  const fundingScore = Math.abs(fundingRate) * 1000 * 0.3;
  return changeScore + volumeScore + fundingScore;
}

/**
 * Calculate suggested entry zone (±2% from current price)
 */
export function calculateEntryZone(price: number): { min: number; max: number } {
  return {
    min: price * 0.98,
    max: price * 1.02,
  };
}

/**
 * Calculate take profit levels
 */
export function calculateTakeProfits(
  entryPrice: number,
  direction: "LONG" | "SHORT"
): { tp1: number; tp2: number; tp3: number } {
  if (direction === "LONG") {
    return {
      tp1: entryPrice * 1.03, // +3%
      tp2: entryPrice * 1.06, // +6%
      tp3: entryPrice * 1.10, // +10%
    };
  } else {
    return {
      tp1: entryPrice * 0.97, // -3%
      tp2: entryPrice * 0.94, // -6%
      tp3: entryPrice * 0.90, // -10%
    };
  }
}

/**
 * Calculate stop loss (2% from entry)
 */
export function calculateStopLoss(
  entryPrice: number,
  direction: "LONG" | "SHORT"
): number {
  return direction === "LONG" ? entryPrice * 0.98 : entryPrice * 1.02;
}

/**
 * Calculate current PnL percentage
 */
export function calculatePnLPercent(
  entryPrice: number,
  currentPrice: number,
  direction: "LONG" | "SHORT"
): number {
  if (direction === "LONG") {
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    return ((entryPrice - currentPrice) / entryPrice) * 100;
  }
}

/**
 * Calculate progress to TP1 (0-100%)
 */
export function calculateProgressToTP1(
  entryPrice: number,
  currentPrice: number,
  tp1: number,
  direction: "LONG" | "SHORT"
): number {
  if (direction === "LONG") {
    const totalDistance = tp1 - entryPrice;
    const currentDistance = currentPrice - entryPrice;
    return Math.min(100, Math.max(0, (currentDistance / totalDistance) * 100));
  } else {
    const totalDistance = entryPrice - tp1;
    const currentDistance = entryPrice - currentPrice;
    return Math.min(100, Math.max(0, (currentDistance / totalDistance) * 100));
  }
}

/**
 * Determine market bias based on 24h change
 */
export function getMarketBias(change24h: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
  if (change24h > 5) return "BULLISH";
  if (change24h < -5) return "BEARISH";
  return "NEUTRAL";
}

/**
 * Simulate long/short ratio based on funding rate
 * (Higher funding = more longs, negative funding = more shorts)
 */
export function calculateLongShortRatio(fundingRate: number): number {
  // Normalize funding rate to ratio (0.5 = 50/50, > 0.5 = more longs)
  const baseRatio = 0.5;
  const adjustment = fundingRate * 1000; // Scale funding rate
  return Math.min(0.95, Math.max(0.05, baseRatio + adjustment));
}

/**
 * Calculate RSI (Relative Strength Index) from an array of closing prices.
 * @param closes Array of closing prices (oldest to newest)
 * @param period RSI period (default 14)
 * @returns RSI value (0-100) or null if insufficient data
 */
export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed RSI (Wilder's method)
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Check if RSI is above threshold or crossing it from below.
 * @param currentRSI Current RSI value
 * @param previousRSI Previous RSI value (one candle back)
 * @param threshold Threshold to check (default 40)
 */
export function isRSIBullish(
  currentRSI: number | null,
  previousRSI: number | null,
  threshold = 40,
): boolean {
  if (currentRSI === null) return false;
  // Above threshold OR crossing from below
  if (currentRSI >= threshold) return true;
  if (
    previousRSI !== null &&
    previousRSI < threshold &&
    currentRSI >= threshold - 3
  )
    return true;
  return false;
}

/**
 * Calculate RSI for multiple timeframes from klines data.
 * Returns RSI value for current and previous candle.
 */
export function calculateRSIFromKlines(klines: number[][]): {
  current: number | null;
  previous: number | null;
} {
  if (klines.length < 16) return { current: null, previous: null };

  const closes = klines.map((k) => Number.parseFloat(String(k[4])));
  const current = calculateRSI(closes, 14);
  const previous = calculateRSI(closes.slice(0, -1), 14);

  return { current, previous };
}

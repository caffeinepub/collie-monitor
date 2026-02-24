/**
 * Format a number as USD currency
 */
export function formatUSD(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number with commas and specified decimal places
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? "+" : ""}${formatNumber(value, decimals)}%`;
}

/**
 * Format timestamp to readable date/time
 */
export function formatDateTime(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp) / 1_000_000); // Convert nanoseconds to milliseconds
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `${formatNumber(value / 1_000_000_000, 2)}B`;
  }
  if (value >= 1_000_000) {
    return `${formatNumber(value / 1_000_000, 2)}M`;
  }
  if (value >= 1_000) {
    return `${formatNumber(value / 1_000, 2)}K`;
  }
  return formatNumber(value, 2);
}

/**
 * Format funding rate as percentage
 */
export function formatFundingRate(rate: number): string {
  return formatPercent(rate * 100, 4);
}

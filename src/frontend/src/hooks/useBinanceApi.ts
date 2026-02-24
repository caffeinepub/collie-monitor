import { useQuery } from "@tanstack/react-query";
import { categorizeSymbol } from "@/utils/categories";
import { calculateMomentumScore } from "@/utils/calculations";
import type { CategorizedMarketData } from "@/types/market";

const BINANCE_BASE_URL = "https://fapi.binance.com";
const REFRESH_INTERVAL = 60_000; // 60 seconds

// Types for Binance API responses
export interface BinanceSymbol {
  symbol: string;
  pair: string;
  contractType: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

export interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  openTime: number;
  closeTime: number;
  count: number;
}

export interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export interface BinanceOpenInterest {
  symbol: string;
  openInterest: string;
  time: number;
}

/**
 * Fetch all perpetual USDT symbols
 */
export function useBinanceSymbols() {
  return useQuery({
    queryKey: ["binance", "symbols"],
    queryFn: async () => {
      const response = await fetch(`${BINANCE_BASE_URL}/fapi/v1/exchangeInfo`);
      if (!response.ok) throw new Error("Failed to fetch symbols");
      const data = await response.json();
      
      // Filter for perpetual USDT contracts
      const perpetualSymbols = (data.symbols as BinanceSymbol[]).filter(
        (s) =>
          s.contractType === "PERPETUAL" &&
          s.quoteAsset === "USDT" &&
          s.status === "TRADING"
      );
      
      return perpetualSymbols;
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 30_000,
  });
}

/**
 * Fetch 24h ticker data for all symbols
 */
export function useBinanceTicker() {
  return useQuery({
    queryKey: ["binance", "ticker"],
    queryFn: async () => {
      const response = await fetch(`${BINANCE_BASE_URL}/fapi/v1/ticker/24hr`);
      if (!response.ok) throw new Error("Failed to fetch ticker data");
      const data: BinanceTicker[] = await response.json();
      
      // Convert to map for easy lookup
      const tickerMap = new Map<string, BinanceTicker>();
      data.forEach((ticker) => {
        tickerMap.set(ticker.symbol, ticker);
      });
      
      return tickerMap;
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 30_000,
  });
}

/**
 * Fetch funding rates for all symbols
 */
export function useFundingRates() {
  return useQuery({
    queryKey: ["binance", "fundingRates"],
    queryFn: async () => {
      const response = await fetch(`${BINANCE_BASE_URL}/fapi/v1/premiumIndex`);
      if (!response.ok) throw new Error("Failed to fetch funding rates");
      const data: BinanceFundingRate[] = await response.json();
      
      // Convert to map for easy lookup
      const fundingMap = new Map<string, number>();
      data.forEach((rate) => {
        fundingMap.set(rate.symbol, parseFloat(rate.fundingRate));
      });
      
      return fundingMap;
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 30_000,
  });
}

/**
 * Fetch open interest for a specific symbol
 */
export function useOpenInterest(symbol: string) {
  return useQuery({
    queryKey: ["binance", "openInterest", symbol],
    queryFn: async () => {
      const response = await fetch(
        `${BINANCE_BASE_URL}/fapi/v1/openInterest?symbol=${symbol}`
      );
      if (!response.ok) throw new Error("Failed to fetch open interest");
      const data: BinanceOpenInterest = await response.json();
      return parseFloat(data.openInterest);
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 30_000,
    enabled: !!symbol,
  });
}

/**
 * Combined market data hook - merges ticker and funding rate data with categorization
 */
export function useMarketData() {
  const { data: symbols } = useBinanceSymbols();
  const { data: tickerMap, isLoading: tickerLoading } = useBinanceTicker();
  const { data: fundingMap, isLoading: fundingLoading } = useFundingRates();

  const isLoading = tickerLoading || fundingLoading;

  const marketData: CategorizedMarketData[] = symbols?.map((symbol) => {
    const ticker = tickerMap?.get(symbol.symbol);
    const fundingRate = fundingMap?.get(symbol.symbol) || 0;

    if (!ticker) return null;

    const price = parseFloat(ticker.lastPrice);
    const change24h = parseFloat(ticker.priceChangePercent);
    const volume = parseFloat(ticker.quoteVolume);
    const high24h = parseFloat(ticker.highPrice);
    const low24h = parseFloat(ticker.lowPrice);

    const category = categorizeSymbol(symbol.symbol);
    const momentum = calculateMomentumScore(change24h, volume, fundingRate);

    return {
      symbol: symbol.symbol,
      price,
      change24h,
      volume,
      high24h,
      low24h,
      fundingRate,
      openInterest: 0, // Will be fetched individually when needed
      category,
      momentum,
    };
  }).filter((item): item is CategorizedMarketData => item !== null) || [];

  return {
    data: marketData,
    isLoading,
    symbols: symbols || [],
  };
}

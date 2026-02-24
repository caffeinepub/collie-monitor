/**
 * Local types for market data and trading
 * These are frontend-only types since backend.d.ts has minimal API surface
 */

export type SymbolCategory = "L1" | "L2" | "AI" | "DeFi" | "Meme" | "Gaming" | "Infrastructure";

export type MarketBias = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  high24h: number;
  low24h: number;
  fundingRate: number;
  openInterest: number;
}

export interface CategorizedMarketData extends MarketData {
  category: SymbolCategory;
  momentum: number;
}

export interface StrategyModule {
  name: string;
  description: string;
  status: "Scanning" | "TradeOpen" | "Closing";
}

export interface ActiveTradeWithDetails {
  tradeId: bigint;
  moduleName: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  currentPnl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  stopLoss: number;
  currentPrice: number;
}

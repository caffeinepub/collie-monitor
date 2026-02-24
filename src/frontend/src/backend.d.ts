import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ActiveTrade {
    direction: TradeDirection;
    moduleName: string;
    tradeId: bigint;
    entryPrice: number;
    currentPnl: number;
    symbol: string;
}
export interface ClosedTrade {
    result: TradeResult;
    moduleName: string;
    tradeId: bigint;
    symbol: string;
    finalPnl: number;
}
export enum TradeDirection {
    LONG = "LONG",
    SHORT = "SHORT"
}
export enum TradeResult {
    WIN = "WIN",
    LOSS = "LOSS"
}
export interface backendInterface {
    addActiveTrade(moduleName: string, symbol: string, direction: TradeDirection, entryPrice: number): Promise<bigint>;
    closeTrade(tradeId: bigint, finalPnl: number): Promise<void>;
    getActiveTrades(): Promise<Array<ActiveTrade>>;
    getClosedTrades(): Promise<Array<ClosedTrade>>;
    getClosedTradesByModule(moduleName: string): Promise<Array<ClosedTrade>>;
    getClosedTradesByResult(result: TradeResult): Promise<Array<ClosedTrade>>;
}

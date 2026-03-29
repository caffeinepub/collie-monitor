import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Zone {
    zoneLabel: string;
    zoneType: ZoneType;
    price: number;
}
export type Time = bigint;
export type PaperTradeState = {
    __kind__: "closed";
    closed: {
        stoppedOut: boolean;
        closedAt: Time;
        tradeNotes: string;
        entryPrice: number;
        exitPrice: number;
        openedAt: Time;
    };
} | {
    __kind__: "open";
    open: {
        behavioralChecklist: string;
        positionManagementNotes: string;
        side: TradeSide;
        setupDescription: string;
        style: TradeStyle;
        target: number;
        contextFilter: string;
        stopLoss: number;
        entryPrice: number;
        riskManagementNotes: string;
        symbol: string;
        openedAt: Time;
    };
};
export interface MarketCacheEntry {
    data: string;
    timestamp: Time;
    symbol: string;
}
export enum TradeSide {
    long_ = "long",
    short_ = "short"
}
export enum TradeStyle {
    scalping = "scalping",
    dayTrade = "dayTrade",
    positionTrade = "positionTrade",
    swingTrade = "swingTrade"
}
export enum ZoneType {
    support = "support",
    resistance = "resistance"
}
export interface backendInterface {
    /**
     * / Add a new support/resistance zone
     */
    addZone(price: number, zoneLabel: string, zoneType: ZoneType): Promise<bigint>;
    /**
     * / Close a paper trade
     */
    closePaperTrade(id: bigint, exitPrice: number, stoppedOut: boolean, tradeNotes: string): Promise<boolean>;
    /**
     * / Delete a zone by id
     */
    deleteZone(id: bigint): Promise<boolean>;
    /**
     * / Get all market cache data
     */
    getAllMarketCache(): Promise<Array<MarketCacheEntry>>;
    /**
     * / Get all paper trades
     */
    getAllTrades(): Promise<Array<PaperTradeState>>;
    /**
     * / Get all closed trades
     */
    getClosedTrades(): Promise<Array<{
        trade: PaperTradeState;
        tradeId: bigint;
    }>>;
    /**
     * / Get market cache data by id
     */
    getMarketCache(id: bigint): Promise<MarketCacheEntry | null>;
    /**
     * / Get all market cache data for a symbol
     */
    getMarketCacheForSymbol(symbol: string): Promise<Array<MarketCacheEntry>>;
    /**
     * / Get all open trades
     */
    getOpenTrades(): Promise<Array<{
        trade: PaperTradeState;
        tradeId: bigint;
    }>>;
    /**
     * / Get trade by id
     */
    getTrade(id: bigint): Promise<PaperTradeState | null>;
    /**
     * / Get trades for a symbol
     */
    getTradesForSymbol(symbol: string): Promise<Array<PaperTradeState>>;
    /**
     * / Get all zones
     */
    getZones(): Promise<Array<Zone>>;
    /**
     * / Open a new paper trade
     */
    openPaperTrade(symbol: string, side: TradeSide, entryPrice: number, stopLoss: number, target: number, style: TradeStyle, setupDescription: string, contextFilter: string, riskManagementNotes: string, positionManagementNotes: string, behavioralChecklist: string): Promise<bigint>;
    /**
     * / Store market data cache entry
     */
    storeMarketCache(symbol: string, data: string): Promise<bigint>;
}

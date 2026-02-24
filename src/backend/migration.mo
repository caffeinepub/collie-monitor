import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";

module {
  type OldTradeDirection = {
    #LONG;
    #SHORT;
  };

  type OldActiveTrade = {
    tradeId : Nat;
    moduleName : Text;
    symbol : Text;
    direction : OldTradeDirection;
    entryPrice : Float;
  };

  type OldTradeResult = { #WIN; #LOSS };

  module OldTradeResult {
    public func compare(result1 : OldTradeResult, result2 : OldTradeResult) : Order.Order {
      switch (result1, result2) {
        case (#WIN, #WIN) { #equal };
        case (#WIN, #LOSS) { #less };
        case (#LOSS, #WIN) { #greater };
        case (#LOSS, #LOSS) { #equal };
      };
    };
  };

  type OldClosedTrade = {
    tradeId : Nat;
    moduleName : Text;
    symbol : Text;
    finalPnl : Float;
    result : OldTradeResult;
  };

  type SymbolCategory = {
    #L1;
    #L2;
    #AI;
    #DeFi;
    #Meme;
    #Gaming;
    #Infrastructure;
  };

  type MarketData = {
    symbol : Text;
    price : Float;
    change24h : Float;
    fundingRate : Float;
    openInterest : Float;
    volume : Float;
    lastUpdate : Time.Time;
  };

  type StrategyStatus = {
    #Scanning;
    #TradeOpen;
    #Closing;
  };

  type StrategyModule = {
    name : Text;
    description : Text;
    status : StrategyStatus;
  };

  type TradeDirection = {
    #LONG;
    #SHORT;
  };

  type ActiveTrade = {
    tradeId : Nat;
    strategyModule : Text;
    symbol : Text;
    direction : TradeDirection;
    entryPrice : Float;
    entryTimestamp : Time.Time;
    tp1 : Float;
    tp2 : Float;
    tp3 : Float;
    stopLoss : Float;
    currentPnl : Float;
  };

  type TradeResult = {
    #Win;
    #Loss;
  };

  type ClosedTrade = {
    tradeId : Nat;
    strategyModule : Text;
    symbol : Text;
    direction : TradeDirection;
    entryPrice : Float;
    exitPrice : Float;
    entryTimestamp : Time.Time;
    exitTimestamp : Time.Time;
    pnlAmount : Float;
    pnlPercent : Float;
    result : TradeResult;
  };

  module ClosedTrade {
    public func compare(left : ClosedTrade, right : ClosedTrade) : Order.Order {
      Text.compare(left.strategyModule, right.strategyModule);
    };
  };

  type OldActor = {
    symbols : List.List<(Text, SymbolCategory)>;
    nextTradeId : Nat;
    marketDataCache : Map.Map<Text, MarketData>;
    strategyModules : Map.Map<Text, StrategyModule>;
    activeTrades : Map.Map<Text, ActiveTrade>;
    tradeHistory : List.List<ClosedTrade>;
  };

  type NewTradeDirection = {
    #LONG;
    #SHORT;
  };

  type NewActiveTrade = {
    tradeId : Nat;
    moduleName : Text;
    symbol : Text;
    direction : NewTradeDirection;
    entryPrice : Float;
    currentPnl : Float;
  };

  type NewTradeResult = { #WIN; #LOSS };
  type NewClosedTrade = {
    tradeId : Nat;
    moduleName : Text;
    symbol : Text;
    finalPnl : Float;
    result : NewTradeResult;
  };

  type NewActor = {
    activeTrades : [NewActiveTrade];
    closedTrades : [NewClosedTrade];
    tradeIdCounter : Nat;
  };

  public func run(_old : OldActor) : NewActor {
    {
      activeTrades = [];
      closedTrades = [];
      tradeIdCounter = 0;
    };
  };
};

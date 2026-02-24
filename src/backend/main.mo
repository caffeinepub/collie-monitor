import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";

import Nat "mo:core/Nat";
import Order "mo:core/Order";


actor {
  type TradeDirection = {
    #LONG;
    #SHORT;
  };

  type ActiveTrade = {
    tradeId : Nat;
    moduleName : Text;
    symbol : Text;
    direction : TradeDirection;
    entryPrice : Float;
    currentPnl : Float;
  };

  type TradeResult = {
    #WIN;
    #LOSS;
  };

  module TradeResult {
    public func compare(result1 : TradeResult, result2 : TradeResult) : Order.Order {
      switch (result1, result2) {
        case (#WIN, #WIN) { #equal };
        case (#WIN, #LOSS) { #less };
        case (#LOSS, #WIN) { #greater };
        case (#LOSS, #LOSS) { #equal };
      };
    };
  };

  type ClosedTrade = {
    tradeId : Nat;
    moduleName : Text;
    symbol : Text;
    finalPnl : Float;
    result : TradeResult;
  };

  var tradeIdCounter = 0;
  var activeTrades : [ActiveTrade] = [];
  var closedTrades : [ClosedTrade] = [];

  public shared ({ caller }) func addActiveTrade(
    moduleName : Text,
    symbol : Text,
    direction : TradeDirection,
    entryPrice : Float,
  ) : async Nat {
    let newTrade : ActiveTrade = {
      tradeId = tradeIdCounter;
      moduleName;
      symbol;
      direction;
      entryPrice;
      currentPnl = 0.0;
    };

    activeTrades := activeTrades.concat([newTrade]);
    tradeIdCounter += 1;
    newTrade.tradeId;
  };

  public shared ({ caller }) func closeTrade(tradeId : Nat, finalPnl : Float) : async () {
    let activeTradeOpt = activeTrades.find(func(t) { t.tradeId == tradeId });

    switch (activeTradeOpt) {
      case (null) {
        Runtime.trap("Trade not found");
      };
      case (?trade) {
        let tradeResult : TradeResult = if (finalPnl >= 0.0) {
          #WIN;
        } else {
          #LOSS;
        };

        let closedTrade : ClosedTrade = {
          tradeId = trade.tradeId;
          moduleName = trade.moduleName;
          symbol = trade.symbol;
          finalPnl;
          result = tradeResult;
        };

        closedTrades := closedTrades.concat([closedTrade]);
        activeTrades := activeTrades.filter(func(t) { t.tradeId != tradeId });
      };
    };
  };

  public query ({ caller }) func getActiveTrades() : async [ActiveTrade] {
    activeTrades;
  };

  public query ({ caller }) func getClosedTrades() : async [ClosedTrade] {
    closedTrades;
  };

  public query ({ caller }) func getClosedTradesByResult(result : TradeResult) : async [ClosedTrade] {
    closedTrades.filter(func(trade) { trade.result == result });
  };

  public query ({ caller }) func getClosedTradesByModule(moduleName : Text) : async [ClosedTrade] {
    closedTrades.filter(func(trade) { trade.moduleName == moduleName });
  };
};

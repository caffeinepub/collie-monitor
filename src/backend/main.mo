import Map "mo:core/Map";
import Nat "mo:core/Nat";

import Float "mo:core/Float";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Time "mo:core/Time";


actor {
  type ZoneType = {
    #support;
    #resistance;
  };

  type Zone = {
    price : Float;
    zoneLabel : Text;
    zoneType : ZoneType;
  };

  type MarketCacheEntry = {
    symbol : Text;
    data : Text;
    timestamp : Time.Time;
  };

  type TradeSide = {
    #long;
    #short;
  };

  type TradeStyle = {
    #scalping;
    #dayTrade;
    #swingTrade;
    #positionTrade;
  };

  type PaperTradeState = {
    #open : {
      symbol : Text;
      side : TradeSide;
      entryPrice : Float;
      stopLoss : Float;
      target : Float;
      style : TradeStyle;
      setupDescription : Text;
      contextFilter : Text;
      riskManagementNotes : Text;
      positionManagementNotes : Text;
      behavioralChecklist : Text;
      openedAt : Time.Time;
    };
    #closed : {
      entryPrice : Float;
      exitPrice : Float;
      stoppedOut : Bool;
      tradeNotes : Text;
      openedAt : Time.Time;
      closedAt : Time.Time;
    };
  };

  let zones = Map.empty<Nat, Zone>();
  let marketCache = Map.empty<Nat, MarketCacheEntry>();
  var nextMarketCacheId = 0;
  let paperTrades = Map.empty<Nat, PaperTradeState>();
  var nextPaperTradeId = 0;
  var nextZoneId = 0;

  /// Add a new support/resistance zone
  public shared ({ caller }) func addZone(price : Float, zoneLabel : Text, zoneType : ZoneType) : async Nat {
    let id = nextZoneId;
    nextZoneId += 1;

    let zone : Zone = {
      price;
      zoneLabel;
      zoneType;
    };

    zones.add(id, zone);
    id;
  };

  /// Get all zones
  public query ({ caller }) func getZones() : async [Zone] {
    zones.values().toArray();
  };

  /// Delete a zone by id
  public shared ({ caller }) func deleteZone(id : Nat) : async Bool {
    if (not zones.containsKey(id)) {
      Runtime.trap("Zone not found");
    };
    zones.remove(id);
    true;
  };

  /// Store market data cache entry
  public shared ({ caller }) func storeMarketCache(symbol : Text, data : Text) : async Nat {
    let id = nextMarketCacheId;
    nextMarketCacheId += 1;

    let entry : MarketCacheEntry = {
      symbol;
      data;
      timestamp = Time.now();
    };

    marketCache.add(id, entry);
    id;
  };

  /// Get market cache data by id
  public query ({ caller }) func getMarketCache(id : Nat) : async ?MarketCacheEntry {
    marketCache.get(id);
  };

  /// Get all market cache data for a symbol
  public query ({ caller }) func getMarketCacheForSymbol(symbol : Text) : async [MarketCacheEntry] {
    marketCache.values().toArray().filter(func(entry) { entry.symbol == symbol });
  };

  /// Get all market cache data
  public query ({ caller }) func getAllMarketCache() : async [MarketCacheEntry] {
    marketCache.values().toArray();
  };

  /// Open a new paper trade
  public shared ({ caller }) func openPaperTrade(symbol : Text, side : TradeSide, entryPrice : Float, stopLoss : Float, target : Float, style : TradeStyle, setupDescription : Text, contextFilter : Text, riskManagementNotes : Text, positionManagementNotes : Text, behavioralChecklist : Text) : async Nat {
    let id = nextPaperTradeId;
    nextPaperTradeId += 1;

    let initialState : PaperTradeState = #open({
      symbol;
      side;
      entryPrice;
      stopLoss;
      target;
      style;
      setupDescription;
      contextFilter;
      riskManagementNotes;
      positionManagementNotes;
      behavioralChecklist;
      openedAt = Time.now();
    });

    paperTrades.add(id, initialState);
    id;
  };

  /// Close a paper trade
  public shared ({ caller }) func closePaperTrade(id : Nat, exitPrice : Float, stoppedOut : Bool, tradeNotes : Text) : async Bool {
    switch (paperTrades.get(id)) {
      case (null) {
        Runtime.trap("Trade not found");
      };
      case (?state) {
        switch (state) {
          case (#open(trade)) {
            let closedTrade : PaperTradeState = #closed({
              entryPrice = trade.entryPrice;
              exitPrice;
              stoppedOut;
              tradeNotes;
              openedAt = trade.openedAt;
              closedAt = Time.now();
            });

            paperTrades.add(id, closedTrade);
            true;
          };
          case (#closed(_closedTrade)) {
            Runtime.trap("Trade already closed");
          };
        };
      };
    };
  };

  /// Get trade by id
  public query ({ caller }) func getTrade(id : Nat) : async ?PaperTradeState {
    paperTrades.get(id);
  };

  /// Get all paper trades
  public query ({ caller }) func getAllTrades() : async [PaperTradeState] {
    paperTrades.values().toArray();
  };

  /// Get all open trades
  public query ({ caller }) func getOpenTrades() : async [({ tradeId : Nat; trade : PaperTradeState })] {
    let iter = paperTrades.entries().filter(
      func((k, v)) {
        switch (v) {
          case (#open(_trade)) { true };
          case (#closed(_trade)) { false };
        };
      }
    );
    iter.toArray().map(
      func((k, v)) {
        { tradeId = k; trade = v };
      }
    );
  };

  /// Get all closed trades
  public query ({ caller }) func getClosedTrades() : async [({ tradeId : Nat; trade : PaperTradeState })] {
    let iter = paperTrades.entries().filter(
      func((k, v)) {
        switch (v) {
          case (#open(_trade)) { false };
          case (#closed(_trade)) { true };
        };
      }
    );
    iter.toArray().map(
      func((k, v)) {
        { tradeId = k; trade = v };
      }
    );
  };

  /// Get trades for a symbol
  public query ({ caller }) func getTradesForSymbol(symbol : Text) : async [PaperTradeState] {
    let allTrades = paperTrades.values().toArray();
    allTrades.filter(
      func(trade) {
        switch (trade) {
          case (#open(data)) { data.symbol == symbol };
          case (#closed(_data)) { false };
        };
      }
    );
  };
};

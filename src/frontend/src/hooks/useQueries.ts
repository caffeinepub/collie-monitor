import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type { ActiveTrade, ClosedTrade, TradeDirection, TradeResult } from "@/backend.d.ts";

/**
 * Get all active trades from backend
 */
export function useActiveTrades() {
  const { actor, isFetching } = useActor();

  return useQuery<ActiveTrade[]>({
    queryKey: ["trades", "active"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveTrades();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

/**
 * Get all closed trades (trade history)
 */
export function useTradeHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<ClosedTrade[]>({
    queryKey: ["trades", "history"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getClosedTrades();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Get trade history filtered by module name
 */
export function useTradeHistoryByModule(moduleName: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ClosedTrade[]>({
    queryKey: ["trades", "history", "module", moduleName],
    queryFn: async () => {
      if (!actor || !moduleName) return [];
      return actor.getClosedTradesByModule(moduleName);
    },
    enabled: !!actor && !isFetching && !!moduleName,
  });
}

/**
 * Get trade history filtered by result (WIN/LOSS)
 */
export function useTradeHistoryByResult(result: TradeResult | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ClosedTrade[]>({
    queryKey: ["trades", "history", "result", result],
    queryFn: async () => {
      if (!actor || !result) return [];
      return actor.getClosedTradesByResult(result);
    },
    enabled: !!actor && !isFetching && !!result,
  });
}

/**
 * Mutation: Add a new active trade
 */
export function useAddActiveTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleName,
      symbol,
      direction,
      entryPrice,
    }: {
      moduleName: string;
      symbol: string;
      direction: TradeDirection;
      entryPrice: number;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.addActiveTrade(moduleName, symbol, direction, entryPrice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades", "active"] });
    },
  });
}

/**
 * Mutation: Close a trade
 */
export function useCloseTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tradeId, finalPnl }: { tradeId: bigint; finalPnl: number }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.closeTrade(tradeId, finalPnl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

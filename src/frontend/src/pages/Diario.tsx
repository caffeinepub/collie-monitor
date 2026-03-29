import { TradeSide, TradeStyle } from "@/backend";
import type { PaperTradeState } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface TradeEntry {
  trade: PaperTradeState;
  tradeId: bigint;
}

const STYLE_LABEL: Record<TradeStyle, string> = {
  [TradeStyle.scalping]: "Scalping",
  [TradeStyle.dayTrade]: "Day Trade",
  [TradeStyle.swingTrade]: "Swing",
  [TradeStyle.positionTrade]: "Position",
};

type StyleFilter = "all" | TradeStyle;
type StatusFilter = "all" | "open" | "closed" | "stopped";

function fmtDate(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("pt-BR");
}

export function Diario() {
  const { actor } = useActor();
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [styleFilter, setStyleFilter] = useState<StyleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadTrades = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [open, closed] = await Promise.all([
        actor.getOpenTrades(),
        actor.getClosedTrades(),
      ]);
      setTrades([...open, ...closed]);
    } catch {}
    setLoading(false);
  }, [actor]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const filtered = useMemo(() => {
    return trades.filter((entry) => {
      const isOpen = entry.trade.__kind__ === "open";
      const isStopped = !isOpen && (entry.trade as any).closed?.stoppedOut;

      if (statusFilter === "open" && !isOpen) return false;
      if (statusFilter === "closed" && (isOpen || isStopped)) return false;
      if (statusFilter === "stopped" && !isStopped) return false;

      if (styleFilter !== "all") {
        if (isOpen) {
          const style = (entry.trade as any).open?.style;
          if (style !== styleFilter) return false;
        } else {
          return false; // closed trades don't have style in closed state
        }
      }

      return true;
    });
  }, [trades, styleFilter, statusFilter]);

  // Stats from closed trades
  const stats = useMemo(() => {
    const closedEntries = trades.filter((t) => t.trade.__kind__ === "closed");
    const openEntries = trades.filter((t) => t.trade.__kind__ === "open");

    let wins = 0;
    let totalPnl = 0;
    let best = Number.NEGATIVE_INFINITY;
    let worst = Number.POSITIVE_INFINITY;

    for (const entry of closedEntries) {
      if (entry.trade.__kind__ !== "closed") continue;
      const c = entry.trade.closed;
      // We don't have side in closed state directly
      const pnl = ((c.exitPrice - c.entryPrice) / c.entryPrice) * 100;
      const pnlAdj = c.stoppedOut ? -Math.abs(pnl) : pnl;
      totalPnl += pnlAdj;
      if (pnlAdj > 0) wins++;
      if (pnlAdj > best) best = pnlAdj;
      if (pnlAdj < worst) worst = pnlAdj;
    }

    return {
      total: trades.length,
      open: openEntries.length,
      closed: closedEntries.length,
      winRate:
        closedEntries.length > 0
          ? ((wins / closedEntries.length) * 100).toFixed(1)
          : "--",
      totalPnl: totalPnl.toFixed(2),
      best: best === Number.NEGATIVE_INFINITY ? "--" : `+${best.toFixed(2)}%`,
      worst: worst === Number.POSITIVE_INFINITY ? "--" : `${worst.toFixed(2)}%`,
    };
  }, [trades]);

  const styleFilters: { val: StyleFilter; label: string }[] = [
    { val: "all", label: "Todos" },
    { val: TradeStyle.scalping, label: "Scalping" },
    { val: TradeStyle.dayTrade, label: "Day Trade" },
    { val: TradeStyle.swingTrade, label: "Swing" },
    { val: TradeStyle.positionTrade, label: "Position" },
  ];

  const statusFilters: { val: StatusFilter; label: string }[] = [
    { val: "all", label: "Todos" },
    { val: "open", label: "Abertos" },
    { val: "closed", label: "Fechados" },
    { val: "stopped", label: "Stop" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6" style={{ color: "var(--orange)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Diário de Trades
        </h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Total Trades",
            value: String(stats.total),
            color: "var(--text)",
          },
          {
            label: "Abertos",
            value: String(stats.open),
            color: "var(--orange)",
          },
          {
            label: "Win Rate",
            value: stats.winRate === "--" ? "--" : `${stats.winRate}%`,
            color:
              stats.winRate === "--"
                ? "var(--muted-clr)"
                : Number.parseFloat(stats.winRate) >= 50
                  ? "var(--green)"
                  : "var(--red)",
          },
          {
            label: "P&L Total",
            value: `${stats.totalPnl}%`,
            color:
              Number.parseFloat(stats.totalPnl) >= 0
                ? "var(--green)"
                : "var(--red)",
          },
          { label: "Melhor Trade", value: stats.best, color: "var(--green)" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-4 border flex flex-col gap-1"
            style={{
              background: "var(--surface)",
              borderColor: "var(--clr-border)",
            }}
            data-ocid={`diario.${label.toLowerCase().replace(/[^a-z0-9]/g, "")}.card`}
          >
            <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
              {label}
            </p>
            <p className="text-xl font-bold font-mono" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-1.5 flex-wrap">
          {styleFilters.map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => setStyleFilter(val)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background:
                  styleFilter === val
                    ? "rgba(245,124,31,0.2)"
                    : "var(--surface)",
                borderColor:
                  styleFilter === val ? "var(--orange)" : "var(--clr-border)",
                color:
                  styleFilter === val ? "var(--orange)" : "var(--muted-clr)",
              }}
              data-ocid={`diario.style${val}.tab`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background:
                  statusFilter === val
                    ? "rgba(245,124,31,0.15)"
                    : "var(--surface)",
                borderColor:
                  statusFilter === val ? "var(--orange)" : "var(--clr-border)",
                color:
                  statusFilter === val ? "var(--orange)" : "var(--muted-clr)",
              }}
              data-ocid={`diario.status${val}.tab`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        {loading ? (
          <div
            className="text-center py-12"
            style={{ color: "var(--muted-clr)" }}
            data-ocid="diario.table.loading_state"
          >
            Carregando trades...
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16 space-y-2"
            style={{ color: "var(--muted-clr)" }}
            data-ocid="diario.table.empty_state"
          >
            <BookOpen className="h-12 w-12 mx-auto opacity-30" />
            <p className="text-lg">Nenhum trade registrado ainda</p>
            <p className="text-sm">
              Abra um trade na aba Estratégias para começar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--clr-border)" }}>
                  {[
                    "Símbolo",
                    "Estilo",
                    "Lado",
                    "Entrada",
                    "Saída",
                    "P&L",
                    "Status",
                    "Data",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide"
                      style={{ color: "var(--muted-clr)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const isOpen = entry.trade.__kind__ === "open";

                  if (isOpen && entry.trade.__kind__ === "open") {
                    const t = entry.trade.open;
                    return (
                      <tr
                        key={String(entry.tradeId)}
                        style={{ borderBottom: "1px solid var(--clr-border)" }}
                        data-ocid={`diario.table.item.${i + 1}`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="font-mono font-semibold"
                            style={{ color: "var(--text)" }}
                          >
                            {t.symbol}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              background: "var(--surface2)",
                              color: "var(--orange)",
                              border: "1px solid var(--clr-border)",
                            }}
                          >
                            {STYLE_LABEL[t.style]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-semibold"
                            style={{
                              color:
                                t.side === TradeSide.long_
                                  ? "var(--green)"
                                  : "var(--red)",
                            }}
                          >
                            {t.side === TradeSide.long_ ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono"
                            style={{ color: "var(--text)" }}
                          >
                            ${t.entryPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "var(--muted-clr)" }}>—</span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "var(--muted-clr)" }}>—</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{
                              background: "rgba(57,255,20,0.15)",
                              color: "var(--green)",
                            }}
                          >
                            ABERTO
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted-clr)" }}
                          >
                            {fmtDate(t.openedAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  if (!isOpen && entry.trade.__kind__ === "closed") {
                    const c = entry.trade.closed;
                    const pnl =
                      ((c.exitPrice - c.entryPrice) / c.entryPrice) * 100;
                    const pnlAdj = c.stoppedOut ? -Math.abs(pnl) : pnl;
                    return (
                      <tr
                        key={String(entry.tradeId)}
                        style={{ borderBottom: "1px solid var(--clr-border)" }}
                        data-ocid={`diario.table.item.${i + 1}`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="font-mono font-semibold"
                            style={{ color: "var(--text)" }}
                          >
                            —
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "var(--muted-clr)" }}>—</span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "var(--muted-clr)" }}>—</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono"
                            style={{ color: "var(--text)" }}
                          >
                            ${c.entryPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono"
                            style={{ color: "var(--text)" }}
                          >
                            ${c.exitPrice.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono font-semibold"
                            style={{
                              color:
                                pnlAdj >= 0 ? "var(--green)" : "var(--red)",
                            }}
                          >
                            {`${pnlAdj >= 0 ? "+" : ""}${pnlAdj.toFixed(2)}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{
                              background: c.stoppedOut
                                ? "rgba(224,75,75,0.15)"
                                : pnlAdj >= 0
                                  ? "rgba(57,255,20,0.15)"
                                  : "rgba(224,75,75,0.15)",
                              color: c.stoppedOut
                                ? "var(--red)"
                                : pnlAdj >= 0
                                  ? "var(--green)"
                                  : "var(--red)",
                            }}
                          >
                            {c.stoppedOut
                              ? "STOP"
                              : pnlAdj >= 0
                                ? "WIN"
                                : "LOSS"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted-clr)" }}
                          >
                            {fmtDate(c.closedAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  return null;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

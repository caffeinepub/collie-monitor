import { Input } from "@/components/ui/input";
import { useScannerData } from "@/hooks/useScannerData";
import { Radar, RefreshCw } from "lucide-react";
import { useState } from "react";

function ScoreBadge({ score }: { score: number }) {
  let bg = "var(--surface2)";
  let color = "var(--muted-clr)";
  let glow = "none";

  if (score === 1) {
    bg = "rgba(245,200,0,0.15)";
    color = "#f5c800";
  } else if (score === 2) {
    bg = "rgba(245,124,31,0.15)";
    color = "var(--orange)";
  } else if (score >= 3) {
    bg = "rgba(57,255,20,0.15)";
    color = "var(--green)";
    glow = "0 0 8px rgba(57,255,20,0.4)";
  }

  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold font-mono"
      style={{ background: bg, color, boxShadow: glow }}
    >
      {score}
    </span>
  );
}

export function Scanner() {
  const { rows, loading, lastUpdate, doScan } = useScannerData();
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) =>
    r.symbol.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="h-6 w-6" style={{ color: "var(--orange)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Scanner de Ativos
          </h1>
          {loading && (
            <span
              className="text-xs px-2 py-0.5 rounded-full animate-pulse"
              style={{
                background: "rgba(245,124,31,0.2)",
                color: "var(--orange)",
              }}
              data-ocid="scanner.loading_state"
            >
              Escaneando...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs" style={{ color: "var(--muted-clr)" }}>
              {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
          <button
            type="button"
            onClick={() => doScan(true)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium"
            style={{
              background: "var(--surface2)",
              color: "var(--orange)",
              border: "1px solid var(--clr-border)",
            }}
            data-ocid="scanner.refresh.button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Escanear
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filtrar símbolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64 h-9"
          style={{
            background: "var(--surface)",
            borderColor: "var(--clr-border)",
            color: "var(--text)",
          }}
          data-ocid="scanner.search_input"
        />
        <span className="text-sm" style={{ color: "var(--muted-clr)" }}>
          {filtered.length} ativos
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--clr-border)" }}>
                {["Símbolo", "Preço", "24h %", "Volume", "Score", "Sinais"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide"
                      style={{ color: "var(--muted-clr)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12"
                    style={{ color: "var(--muted-clr)" }}
                    data-ocid="scanner.table.empty_state"
                  >
                    {rows.length === 0
                      ? "Clique em Escanear para carregar ativos"
                      : "Nenhum ativo encontrado"}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.symbol}
                    style={{
                      borderBottom: "1px solid var(--clr-border)",
                      background:
                        row.score >= 3
                          ? "rgba(57,255,20,0.04)"
                          : row.score === 2
                            ? "rgba(245,124,31,0.03)"
                            : "transparent",
                      boxShadow:
                        row.score >= 3
                          ? "inset 0 0 0 1px rgba(57,255,20,0.2)"
                          : row.score === 2
                            ? "inset 0 0 0 1px rgba(245,124,31,0.2)"
                            : "none",
                    }}
                    data-ocid={`scanner.table.item.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: "var(--text)" }}
                      >
                        {row.symbol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono"
                        style={{ color: "var(--text)" }}
                      >
                        $
                        {row.price < 1
                          ? row.price.toFixed(5)
                          : row.price.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono font-semibold"
                        style={{
                          color:
                            row.change24h >= 0 ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {(row.change24h >= 0 ? "+" : "") +
                          row.change24h.toFixed(2)}
                        %
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--muted-clr)" }}
                      >
                        ${(row.quoteVolume / 1e6).toFixed(1)}M
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={row.score} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.signals.map((s) => (
                          <span
                            key={s}
                            className="text-xs px-1.5 py-0.5 rounded font-mono"
                            style={{
                              background: "var(--surface2)",
                              color: "var(--orange)",
                              border: "1px solid var(--clr-border)",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

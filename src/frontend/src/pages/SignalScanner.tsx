import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type SignalResult, useSignalScanner } from "@/hooks/useSignalScanner";
import { formatPercent, formatUSD } from "@/utils/formatters";
import { useNavigate } from "@tanstack/react-router";
import { Radar, RefreshCw, TrendingDown, TrendingUp, Zap } from "lucide-react";

const TIMEFRAMES = ["3m", "5m", "15m", "1h", "4h", "1d"] as const;
const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h"];

const SIGNAL_DEFS = [
  {
    key: "btcCorrelation" as const,
    label: "BTC\u2191",
    title: "Beta crescente com BTC",
  },
  {
    key: "oiIncreasing" as const,
    label: "OI\u2191",
    title: "Open Interest subindo",
  },
  {
    key: "volumeIncreasing" as const,
    label: "VOL\u2191",
    title: "Volume acima da m\u00e9dia",
  },
  {
    key: "fundingNegative" as const,
    label: "FR-",
    title: "Funding rate negativo",
  },
  { key: "shortsIncreasing" as const, label: "SHORT", title: "Shorts abrindo" },
  { key: "rsiBullish" as const, label: "RSI", title: "RSI bullish em 4+ TFs" },
];

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 5
      ? "bg-green-900/60 text-green-400 border border-green-600/40"
      : score >= 3
        ? "bg-yellow-900/60 text-yellow-400 border border-yellow-600/40"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold font-mono ${cls}`}
    >
      {score}/6
    </span>
  );
}

function SignalBadges({ signals }: { signals: SignalResult["signals"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SIGNAL_DEFS.map((def) => {
        const active = signals[def.key];
        return (
          <span
            key={def.key}
            title={def.title}
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono transition-colors ${
              active
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "bg-muted/40 text-muted-foreground/50 border border-border/30"
            }`}
          >
            {def.label}
          </span>
        );
      })}
    </div>
  );
}

function RSIChips({ rsiByTf }: { rsiByTf: SignalResult["rsiByTf"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {TIMEFRAMES.map((tf) => {
        const val = rsiByTf[tf];
        if (val === undefined || val === null) {
          return (
            <span
              key={tf}
              className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono bg-muted/30 text-muted-foreground/40"
            >
              {tf}:\u2014
            </span>
          );
        }
        const bullish = val >= 40;
        return (
          <span
            key={tf}
            className={`inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono ${
              bullish
                ? "bg-green-900/40 text-green-400"
                : "bg-red-900/40 text-red-400"
            }`}
          >
            {tf}:{val.toFixed(0)}
          </span>
        );
      })}
    </div>
  );
}

export function SignalScanner() {
  const navigate = useNavigate();
  const {
    results,
    isScanning,
    minutesSinceFullScan,
    nextRefreshIn,
    scanProgress,
  } = useSignalScanner();

  const highQuality = results.filter((r) => r.score >= 5).length;
  const goodQuality = results.filter((r) => r.score >= 4).length;

  const signalCounts = SIGNAL_DEFS.reduce(
    (acc, def) => {
      acc[def.key] = results.filter((r) => r.signals[def.key]).length;
      return acc;
    },
    {} as Record<keyof SignalResult["signals"], number>,
  );

  const isFirstLoad = isScanning && results.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-foreground">
              Signal Scanner
            </h2>
            {isScanning && (
              <span className="flex items-center gap-1 text-xs text-cyan-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Varrendo...
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detecta ativos antes de uma alta significativa
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-3">
            <span>
              \u00daltima varredura:{" "}
              <span className="text-foreground font-mono">
                {minutesSinceFullScan === null
                  ? "\u2014"
                  : minutesSinceFullScan === 0
                    ? "agora"
                    : `${minutesSinceFullScan}min atr\u00e1s`}
              </span>
            </span>
            <span>
              Pr\u00f3ximo refresh:{" "}
              <span className="text-cyan-400 font-mono">{nextRefreshIn}s</span>
            </span>
          </div>
          {isScanning && (
            <div className="w-48">
              <Progress value={scanProgress} className="h-1.5" />
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[120px] border-border/50">
          <CardContent className="p-3">
            <div className="text-2xl font-bold font-mono text-foreground">
              {results.length}
            </div>
            <div className="text-xs text-muted-foreground">
              Ativos monitorados
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px] border-yellow-600/30">
          <CardContent className="p-3">
            <div className="text-2xl font-bold font-mono text-yellow-400">
              {goodQuality}
            </div>
            <div className="text-xs text-muted-foreground">
              Score \u2265 4/6
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px] border-green-600/30">
          <CardContent className="p-3">
            <div className="text-2xl font-bold font-mono text-green-400">
              {highQuality}
            </div>
            <div className="text-xs text-muted-foreground">
              Score \u2265 5/6
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signal legend */}
      <div className="flex flex-wrap gap-2">
        {SIGNAL_DEFS.map((def) => (
          <div
            key={def.key}
            title={def.title}
            className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/60 px-3 py-1.5"
          >
            <span className="text-xs font-bold font-mono text-cyan-400">
              {def.label}
            </span>
            <span className="text-xs text-muted-foreground">{def.title}</span>
            <span className="ml-1 rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400">
              {signalCounts[def.key]}
            </span>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {isFirstLoad && (
        <Card data-ocid="scanner.loading_state">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-cyan-400 animate-pulse" />
              <span className="text-sm text-cyan-400 font-mono">
                Varrendo mercado... {scanProgress}%
              </span>
            </div>
            <Progress value={scanProgress} className="h-2" />
            <div className="space-y-2">
              {SKELETON_ROWS.map((key) => (
                <Skeleton key={key} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {!isFirstLoad && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Ranking \u2014 Melhores Sinais de Pr\u00e9-Alta
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {results.length === 0 ? (
              <div
                data-ocid="scanner.empty_state"
                className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              >
                <Radar className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhum ativo encontrado</p>
                <p className="text-xs mt-1">Aguarde a varredura completar</p>
              </div>
            ) : (
              <div className="overflow-x-auto" data-ocid="scanner.table">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>Sinais</TableHead>
                      <TableHead>RSI por TF</TableHead>
                      <TableHead className="text-right">Funding</TableHead>
                      <TableHead className="text-right">Pre\u00e7o</TableHead>
                      <TableHead className="text-right">24h</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, idx) => {
                      const isTop = result.score >= 5;
                      const ocid = `scanner.row.${idx + 1}`;
                      return (
                        <TableRow
                          key={result.symbol}
                          data-ocid={ocid}
                          onClick={() =>
                            navigate({ to: `/asset/${result.symbol}` })
                          }
                          className={`cursor-pointer transition-colors ${
                            isTop
                              ? "border-l-2 border-l-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10"
                              : "border-l-2 border-l-transparent hover:bg-muted/40"
                          }`}
                        >
                          <TableCell className="text-center">
                            <span
                              className={`text-xs font-mono ${
                                isTop
                                  ? "text-cyan-400 font-bold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold font-mono text-sm text-foreground">
                              {result.symbol.replace("USDT", "")}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <ScorePill score={result.score} />
                          </TableCell>
                          <TableCell>
                            <SignalBadges signals={result.signals} />
                          </TableCell>
                          <TableCell>
                            <RSIChips rsiByTf={result.rsiByTf} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`text-xs font-mono ${
                                result.fundingRate < 0
                                  ? "text-red-400"
                                  : "text-green-400"
                              }`}
                            >
                              {(result.fundingRate * 100).toFixed(4)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatUSD(result.price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`flex items-center justify-end gap-1 text-xs font-mono ${
                                result.change24h >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {result.change24h >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {formatPercent(result.change24h)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

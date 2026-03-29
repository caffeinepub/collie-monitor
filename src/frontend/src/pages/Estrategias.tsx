import { TradeSide, TradeStyle } from "@/backend";
import type { PaperTradeState } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import type { AssetRow } from "@/hooks/useScannerData";
import { scanMarket } from "@/hooks/useScannerData";
import { ActivitySquare, Loader2, TrendingUp, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface OpenTradeEntry {
  trade: PaperTradeState;
  tradeId: bigint;
}

interface StrategyCard {
  style: TradeStyle;
  name: string;
  icon: string;
  timeframe: string;
  tools: string[];
  description: string;
}

const STRATEGIES: StrategyCard[] = [
  {
    style: TradeStyle.scalping,
    name: "Scalping",
    icon: "🎯",
    timeframe: "1m — 5m",
    tools: ["VWAP", "Order Flow", "Liquidez"],
    description:
      "Operações rápidas de segundos a minutos. Foco em microestrutura e execução precisa.",
  },
  {
    style: TradeStyle.dayTrade,
    name: "Day Trade",
    icon: "📈",
    timeframe: "15m — 1h",
    tools: ["VWAP", "EMA 20/50", "Volume"],
    description:
      "Operações intraday. Volatilidade, zonas de liquidez e tendência diária.",
  },
  {
    style: TradeStyle.swingTrade,
    name: "Swing Trade",
    icon: "🔭",
    timeframe: "4h — 1d",
    tools: ["FVG", "Supply/Demand", "EMA 200"],
    description: "Dias a semanas. Estrutura macro e zonas institucionais.",
  },
  {
    style: TradeStyle.positionTrade,
    name: "Position Trade",
    icon: "⚓",
    timeframe: "1w +",
    tools: ["Ciclos BTC", "Halving", "On-chain"],
    description:
      "Semanas a meses. Ciclos, análise macroeconômica e narrativas.",
  },
];

const STYLE_LABEL: Record<TradeStyle, string> = {
  [TradeStyle.scalping]: "Scalping",
  [TradeStyle.dayTrade]: "Day Trade",
  [TradeStyle.swingTrade]: "Swing Trade",
  [TradeStyle.positionTrade]: "Position Trade",
};

interface OpenForm {
  symbol: string;
  side: TradeSide;
  entryPrice: string;
  stopLoss: string;
  target: string;
  setup: string;
  context: string;
  risk: string;
  position: string;
  behavior: string;
}

interface SignalData {
  asset: AssetRow;
  style: TradeStyle;
  side: TradeSide;
  entry: number;
  stopLoss: number;
  target: number;
  rrr: number;
  riskPct: number;
  setupText: string;
  contextText: string;
  riskText: string;
  probabilityText: string;
  probabilityColor: string;
}

const emptyForm = (): OpenForm => ({
  symbol: "",
  side: TradeSide.long_,
  entryPrice: "",
  stopLoss: "",
  target: "",
  setup: "",
  context: "",
  risk: "",
  position: "",
  behavior: "",
});

function calcRRR(entry: string, stop: string, target: string): string {
  const e = Number.parseFloat(entry);
  const s = Number.parseFloat(stop);
  const t = Number.parseFloat(target);
  if (!e || !s || !t || e === s) return "--";
  const rrr = Math.abs(t - e) / Math.abs(e - s);
  return rrr.toFixed(2);
}

function fmtPrice(n: number): string {
  if (n < 0.01) return n.toFixed(6);
  if (n < 1) return n.toFixed(5);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

function pickBestAsset(rows: AssetRow[], style: TradeStyle): AssetRow | null {
  if (rows.length === 0) return null;

  let candidates: AssetRow[];

  switch (style) {
    case TradeStyle.scalping: {
      // Highest score, high volume, recent sharp move
      candidates = rows.filter(
        (r) => r.score >= 1 && Math.abs(r.change24h) > 1,
      );
      candidates.sort(
        (a, b) => b.score - a.score || b.quoteVolume - a.quoteVolume,
      );
      break;
    }
    case TradeStyle.dayTrade: {
      // Oversold potential reversal: fell > 3%, high volume
      candidates = rows.filter(
        (r) => r.change24h < -3 && r.signals.includes("Vol↑"),
      );
      candidates.sort(
        (a, b) => b.score - a.score || b.quoteVolume - a.quoteVolume,
      );
      break;
    }
    case TradeStyle.swingTrade: {
      // Accumulation zone: between -5% and -15%, score >= 2
      candidates = rows.filter(
        (r) => r.score >= 2 && r.change24h <= -5 && r.change24h >= -15,
      );
      candidates.sort((a, b) => b.score - a.score);
      break;
    }
    case TradeStyle.positionTrade: {
      // High volume, consistent signals
      candidates = rows.filter(
        (r) => r.score >= 2 && r.signals.includes("Top25%"),
      );
      candidates.sort(
        (a, b) => b.quoteVolume - a.quoteVolume || b.score - a.score,
      );
      break;
    }
    default:
      candidates = [];
  }

  // fallback to top-scored if no strict candidates
  if (candidates.length === 0) {
    const fallback = [...rows].sort(
      (a, b) => b.score - a.score || b.quoteVolume - a.quoteVolume,
    );
    return fallback[0] ?? null;
  }

  return candidates[0];
}

const STOP_MULTIPLIERS: Record<TradeStyle, number> = {
  [TradeStyle.scalping]: 0.97,
  [TradeStyle.dayTrade]: 0.95,
  [TradeStyle.swingTrade]: 0.92,
  [TradeStyle.positionTrade]: 0.85,
};

const RRR_MAP: Record<TradeStyle, number> = {
  [TradeStyle.scalping]: 1.5,
  [TradeStyle.dayTrade]: 2.0,
  [TradeStyle.swingTrade]: 2.5,
  [TradeStyle.positionTrade]: 3.0,
};

function buildSignal(asset: AssetRow, style: TradeStyle): SignalData {
  const entry = asset.price;
  const isLong = asset.change24h < -3 || asset.change24h <= 0;
  const side = isLong ? TradeSide.long_ : TradeSide.short_;
  const stopMult = STOP_MULTIPLIERS[style];
  const rrr = RRR_MAP[style];

  let stopLoss: number;
  let target: number;

  if (side === TradeSide.long_) {
    stopLoss = entry * stopMult;
    target = entry + (entry - stopLoss) * rrr;
  } else {
    stopLoss = entry * (2 - stopMult);
    target = entry - (stopLoss - entry) * rrr;
  }

  const riskPct = Math.abs((entry - stopLoss) / entry) * 100;

  // Setup description
  const signalList = asset.signals.join(", ") || "Sem sinais ativos";
  const volRank = asset.signals.includes("Top25%")
    ? "Top 25% de volume"
    : asset.signals.includes("Vol↑")
      ? "Volume acima da mediana"
      : "Volume moderado";

  const setupText = `${asset.symbol} selecionado com score ${asset.score}/4. Sinais ativos: ${signalList}. ${volRank}. Variação 24h: ${asset.change24h.toFixed(2)}%.`;

  const contextMap: Record<TradeStyle, string> = {
    [TradeStyle.scalping]: `Microestrutura com movimento sharp de ${Math.abs(asset.change24h).toFixed(2)}%. Fluxo elevado favorece entrada rápida. Foco em VWAP e liquidez imediata.`,
    [TradeStyle.dayTrade]: `Ativo em potencial reversão intraday após queda de ${Math.abs(asset.change24h).toFixed(2)}%. Volume confirma interesse de compra. Observar VWAP e EMA20 para entrada.`,
    [TradeStyle.swingTrade]: `Zona de acumulação detectada. Queda de ${Math.abs(asset.change24h).toFixed(2)}% com OI/volume sugerindo posicionamento. Aguardar reteste de zona institucional.`,
    [TradeStyle.positionTrade]: `Ativo com liquidez institucional consistente. ${volRank}. Ciclo favorável para posicionamento de médio prazo. Alinhado com estrutura macro.`,
  };

  const contextText = contextMap[style];

  const riskText = `Risco calculado: ${riskPct.toFixed(2)}% do capital por stop. Stop ${side === TradeSide.long_ ? "abaixo" : "acima"} da entrada em ${fmtPrice(stopLoss)}. RRR ${rrr}:1.`;

  let probabilityText: string;
  let probabilityColor: string;
  if (asset.score >= 4) {
    probabilityText = "Alta";
    probabilityColor = "var(--green)";
  } else if (asset.score === 3) {
    probabilityText = "Moderada-Alta";
    probabilityColor = "var(--green)";
  } else if (asset.score === 2) {
    probabilityText = "Moderada";
    probabilityColor = "var(--orange)";
  } else {
    probabilityText = "Baixa";
    probabilityColor = "var(--red)";
  }

  return {
    asset,
    style,
    side,
    entry,
    stopLoss,
    target,
    rrr,
    riskPct,
    setupText,
    contextText,
    riskText,
    probabilityText,
    probabilityColor,
  };
}

function SignalModal({
  signal,
  onRegister,
  onClose,
}: {
  signal: SignalData;
  onRegister: (form: OpenForm) => void;
  onClose: () => void;
}) {
  const isLong = signal.side === TradeSide.long_;

  return (
    <DialogContent
      className="max-w-xl max-h-[90vh] overflow-y-auto"
      style={{
        background: "var(--surface)",
        borderColor: isLong ? "rgba(57,255,20,0.3)" : "rgba(224,75,75,0.3)",
        color: "var(--text)",
        boxShadow: isLong
          ? "0 0 32px rgba(57,255,20,0.1)"
          : "0 0 32px rgba(224,75,75,0.1)",
      }}
      data-ocid="estrategias.signal.dialog"
    >
      <DialogHeader>
        <DialogTitle
          className="flex items-center gap-2 text-base"
          style={{ color: "var(--text)" }}
        >
          <Zap className="h-4 w-4" style={{ color: "var(--orange)" }} />
          Sinal Gerado — {STYLE_LABEL[signal.style]}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-1">
        {/* Asset Header */}
        <div
          className="rounded-xl p-4 border"
          style={{
            background: "var(--surface2)",
            borderColor: "var(--clr-border)",
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span
                className="text-2xl font-bold font-mono"
                style={{ color: "var(--text)" }}
              >
                {signal.asset.symbol}
              </span>
              <span
                className="ml-2 text-xs px-2 py-0.5 rounded font-mono"
                style={{
                  background: "var(--surface)",
                  color: "var(--muted-clr)",
                  border: "1px solid var(--clr-border)",
                }}
              >
                USDT PERP
              </span>
            </div>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{
                background: isLong
                  ? "rgba(57,255,20,0.15)"
                  : "rgba(224,75,75,0.15)",
                color: isLong ? "var(--green)" : "var(--red)",
                border: `1px solid ${isLong ? "var(--green)" : "var(--red)"}`,
              }}
            >
              {isLong ? "▲ LONG" : "▼ SHORT"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <div
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                Preço
              </div>
              <div
                className="font-mono font-semibold"
                style={{ color: "var(--text)" }}
              >
                ${fmtPrice(signal.asset.price)}
              </div>
            </div>
            <div>
              <div
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                24h
              </div>
              <div
                className="font-mono font-semibold"
                style={{
                  color:
                    signal.asset.change24h >= 0 ? "var(--green)" : "var(--red)",
                }}
              >
                {signal.asset.change24h >= 0 ? "+" : ""}
                {signal.asset.change24h.toFixed(2)}%
              </div>
            </div>
            <div>
              <div
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                Volume
              </div>
              <div
                className="font-mono text-xs"
                style={{ color: "var(--muted-clr)" }}
              >
                {fmtVolume(signal.asset.quoteVolume)}
              </div>
            </div>
            <div>
              <div
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                Score
              </div>
              <div
                className="font-mono font-bold"
                style={{
                  color:
                    signal.asset.score >= 3
                      ? "var(--green)"
                      : signal.asset.score >= 2
                        ? "var(--orange)"
                        : "var(--muted-clr)",
                }}
              >
                {signal.asset.score}/4
              </div>
            </div>
          </div>

          {/* Signals */}
          {signal.asset.signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {signal.asset.signals.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded font-mono"
                  style={{
                    background: "rgba(245,124,31,0.15)",
                    color: "var(--orange)",
                    border: "1px solid rgba(245,124,31,0.3)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Trade Parameters */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--clr-border)" }}
        >
          <div
            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "var(--surface2)",
              color: "var(--orange)",
              borderBottom: "1px solid var(--clr-border)",
            }}
          >
            Parâmetros do Trade
          </div>
          <div
            className="grid grid-cols-3 divide-x"
            style={{
              background: "var(--surface)",
              borderColor: "var(--clr-border)",
            }}
          >
            {[
              {
                label: "Entrada",
                value: `$${fmtPrice(signal.entry)}`,
                color: "var(--text)",
              },
              {
                label: "Stop Loss",
                value: `$${fmtPrice(signal.stopLoss)}`,
                color: "var(--red)",
              },
              {
                label: "Alvo",
                value: `$${fmtPrice(signal.target)}`,
                color: "var(--green)",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3 text-center">
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--muted-clr)" }}
                >
                  {label}
                </div>
                <div className="font-mono font-bold text-sm" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{
              borderTop: "1px solid var(--clr-border)",
              background: "var(--surface2)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--muted-clr)" }}>
              Risk/Reward Ratio
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: "var(--green)" }}
            >
              {signal.rrr.toFixed(1)}:1
            </span>
          </div>
        </div>

        {/* Signal Analysis */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--clr-border)" }}
        >
          <div
            className="px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "var(--surface2)",
              color: "var(--orange)",
              borderBottom: "1px solid var(--clr-border)",
            }}
          >
            <ActivitySquare className="h-3.5 w-3.5" />
            Análise do Sinal
          </div>
          <div
            className="divide-y"
            style={{
              background: "var(--surface)",
              borderColor: "var(--clr-border)",
            }}
          >
            {[
              {
                num: "01",
                title: "Setup",
                content: signal.setupText,
                color: "var(--orange)",
              },
              {
                num: "02",
                title: "Contexto",
                content: signal.contextText,
                color: "var(--text)",
              },
              {
                num: "03",
                title: "Risco",
                content: signal.riskText,
                color: "var(--red)",
              },
              {
                num: "04",
                title: "Probabilidade",
                content: signal.probabilityText,
                color: signal.probabilityColor,
                isBig: true,
              },
            ].map(({ num, title, content, color, isBig }) => (
              <div
                key={num}
                className="px-4 py-3"
                style={{ borderColor: "var(--clr-border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: "var(--muted-clr)" }}
                  >
                    {num}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color }}
                  >
                    {title}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed ${isBig ? "font-bold text-base" : ""}`}
                  style={{ color: isBig ? color : "var(--text)" }}
                >
                  {content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          style={{
            borderColor: "var(--clr-border)",
            color: "var(--muted-clr)",
            background: "transparent",
          }}
          data-ocid="estrategias.signal.close_button"
        >
          Fechar
        </Button>
        <Button
          onClick={() => {
            const form: OpenForm = {
              symbol: signal.asset.symbol,
              side: signal.side,
              entryPrice: signal.entry.toString(),
              stopLoss: signal.stopLoss.toString(),
              target: signal.target.toString(),
              setup: signal.setupText,
              context: signal.contextText,
              risk: signal.riskText,
              position: `Realizar parcial em 1:1, mover stop para zero. Deixar restante buscar alvo em $${fmtPrice(signal.target)}.`,
              behavior: `Parar após 2 perdas no dia. Não operar contra a estrutura. RRR mínimo ${signal.rrr}:1.`,
            };
            onRegister(form);
          }}
          style={{
            background: "var(--orange)",
            color: "#000",
            border: "none",
            fontWeight: 700,
          }}
          data-ocid="estrategias.signal.submit_button"
        >
          Registrar no Diário
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function Estrategias() {
  const { actor } = useActor();
  const [openTrades, setOpenTrades] = useState<OpenTradeEntry[]>([]);
  const [signalStyle, setSignalStyle] = useState<TradeStyle | null>(null);
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [registerModal, setRegisterModal] = useState<OpenForm | null>(null);
  const [closeModal, setCloseModal] = useState<OpenTradeEntry | null>(null);
  const [form, setForm] = useState<OpenForm>(emptyForm());
  const [closeExitPrice, setCloseExitPrice] = useState("");
  const [stoppedOut, setStoppedOut] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState<TradeStyle | null>(null);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);

  const loadOpenTrades = useCallback(async () => {
    if (!actor) return;
    try {
      const result = await actor.getOpenTrades();
      setOpenTrades(result);
    } catch {}
  }, [actor]);

  useEffect(() => {
    loadOpenTrades();
    fetch("https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT")
      .then((r) => r.json())
      .then((d) => setBtcPrice(Number.parseFloat(d.price)))
      .catch(() => {});
  }, [loadOpenTrades]);

  const tradesByStyle = useMemo(() => {
    const map: Partial<Record<TradeStyle, OpenTradeEntry>> = {};
    for (const entry of openTrades) {
      if (entry.trade.__kind__ === "open") {
        map[entry.trade.open.style] = entry;
      }
    }
    return map;
  }, [openTrades]);

  async function handleGenerateSignal(style: TradeStyle) {
    setGenerating(style);
    try {
      const rows = await scanMarket();
      if (rows.length === 0) {
        toast.error("Não foi possível carregar dados do scanner.");
        setGenerating(null);
        return;
      }
      const best = pickBestAsset(rows, style);
      if (!best) {
        toast.error("Nenhum ativo adequado encontrado para este estilo.");
        setGenerating(null);
        return;
      }
      const signal = buildSignal(best, style);
      setSignalStyle(style);
      setSignalData(signal);
    } catch {
      toast.error("Erro ao gerar sinal. Verifique sua conexão.");
    }
    setGenerating(null);
  }

  function handleRegisterFromSignal(prefilled: OpenForm) {
    setSignalData(null);
    setSignalStyle(null);
    setForm(prefilled);
    // Open register modal with pre-filled data
    setRegisterModal(prefilled);
  }

  async function handleOpenTrade(styleOverride?: TradeStyle) {
    const style = styleOverride ?? signalStyle;
    if (!actor || !style) return;
    setSubmitting(true);
    try {
      await actor.openPaperTrade(
        `${form.symbol.toUpperCase()}USDT`,
        form.side,
        Number.parseFloat(form.entryPrice),
        Number.parseFloat(form.stopLoss),
        Number.parseFloat(form.target),
        style,
        form.setup,
        form.context,
        form.risk,
        form.position,
        form.behavior,
      );
      toast.success("Trade registrado no diário!");
      await loadOpenTrades();
      setRegisterModal(null);
      setForm(emptyForm());
    } catch {
      toast.error("Erro ao registrar trade");
    }
    setSubmitting(false);
  }

  async function handleCloseTrade() {
    if (!actor || !closeModal) return;
    setSubmitting(true);
    try {
      await actor.closePaperTrade(
        closeModal.tradeId,
        Number.parseFloat(closeExitPrice),
        stoppedOut,
        closeNotes,
      );
      toast.success("Trade fechado!");
      await loadOpenTrades();
      setCloseModal(null);
      setCloseExitPrice("");
      setStoppedOut(false);
      setCloseNotes("");
    } catch {
      toast.error("Erro ao fechar trade");
    }
    setSubmitting(false);
  }

  function calcPnL(entry: OpenTradeEntry): string {
    if (entry.trade.__kind__ !== "open" || btcPrice === null) return "--";
    const t = entry.trade.open;
    const currentPrice = btcPrice;
    const pnl =
      t.side === TradeSide.long_
        ? ((currentPrice - t.entryPrice) / t.entryPrice) * 100
        : ((t.entryPrice - currentPrice) / t.entryPrice) * 100;
    return `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6" style={{ color: "var(--orange)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Módulos de Estratégia
        </h1>
      </div>

      {/* Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STRATEGIES.map((strat) => {
          const openTrade = tradesByStyle[strat.style];
          const hasOpenTrade = !!openTrade;
          const isGenerating = generating === strat.style;

          return (
            <div
              key={strat.style}
              className="rounded-xl p-5 border flex flex-col gap-4"
              style={{
                background: "var(--surface)",
                borderColor: hasOpenTrade
                  ? "var(--orange)"
                  : "var(--clr-border)",
                boxShadow: hasOpenTrade
                  ? "0 0 16px rgba(245,124,31,0.2)"
                  : "none",
              }}
              data-ocid={`estrategias.${strat.style}.card`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{strat.icon}</span>
                  <div>
                    <h2
                      className="text-lg font-bold"
                      style={{ color: "var(--text)" }}
                    >
                      {strat.name}
                    </h2>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        background: "var(--surface2)",
                        color: "var(--orange)",
                      }}
                    >
                      {strat.timeframe}
                    </span>
                  </div>
                </div>
                {hasOpenTrade && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{
                      background: "rgba(57,255,20,0.15)",
                      color: "var(--green)",
                    }}
                  >
                    ● ABERTO
                  </span>
                )}
              </div>

              <p className="text-sm" style={{ color: "var(--muted-clr)" }}>
                {strat.description}
              </p>

              {/* Tools */}
              <div className="flex flex-wrap gap-2">
                {strat.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-xs px-2 py-1 rounded border font-mono"
                    style={{
                      background: "var(--surface2)",
                      borderColor: "var(--clr-border)",
                      color: "var(--muted-clr)",
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>

              {/* Open Trade Info */}
              {hasOpenTrade && openTrade.trade.__kind__ === "open" && (
                <div
                  className="rounded-lg p-3 border"
                  style={{
                    background: "var(--surface2)",
                    borderColor: "var(--clr-border)",
                  }}
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span style={{ color: "var(--muted-clr)" }}>
                        Símbolo:{" "}
                      </span>
                      <span
                        className="font-mono font-semibold"
                        style={{ color: "var(--text)" }}
                      >
                        {openTrade.trade.open.symbol}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted-clr)" }}>Lado: </span>
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            openTrade.trade.open.side === TradeSide.long_
                              ? "var(--green)"
                              : "var(--red)",
                        }}
                      >
                        {openTrade.trade.open.side === TradeSide.long_
                          ? "LONG"
                          : "SHORT"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted-clr)" }}>
                        Entrada:{" "}
                      </span>
                      <span
                        className="font-mono"
                        style={{ color: "var(--text)" }}
                      >
                        ${fmtPrice(openTrade.trade.open.entryPrice)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted-clr)" }}>
                        P&L est.:{" "}
                      </span>
                      <span
                        className="font-mono font-semibold"
                        style={{
                          color: calcPnL(openTrade).startsWith("+")
                            ? "var(--green)"
                            : calcPnL(openTrade) === "--"
                              ? "var(--muted-clr)"
                              : "var(--red)",
                        }}
                      >
                        {calcPnL(openTrade)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                {!hasOpenTrade ? (
                  <Button
                    className="flex-1 flex items-center gap-2"
                    onClick={() => handleGenerateSignal(strat.style)}
                    disabled={isGenerating || generating !== null}
                    style={{
                      background: isGenerating
                        ? "var(--surface2)"
                        : "var(--orange)",
                      color: isGenerating ? "var(--orange)" : "#000",
                      border: isGenerating ? "1px solid var(--orange)" : "none",
                      fontWeight: 700,
                    }}
                    data-ocid={`estrategias.${strat.style}.primary_button`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Gerar Sinal
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 flex items-center gap-2"
                    onClick={() => {
                      setCloseModal(openTrade);
                      setCloseExitPrice("");
                      setStoppedOut(false);
                      setCloseNotes("");
                    }}
                    style={{
                      borderColor: "var(--red)",
                      color: "var(--red)",
                      background: "transparent",
                    }}
                    data-ocid={`estrategias.${strat.style}.close_button`}
                  >
                    <X className="h-4 w-4" />
                    Fechar Trade
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Signal Analysis Modal */}
      <Dialog
        open={signalData !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSignalData(null);
            setSignalStyle(null);
          }
        }}
      >
        {signalData && (
          <SignalModal
            signal={signalData}
            onRegister={handleRegisterFromSignal}
            onClose={() => {
              setSignalData(null);
              setSignalStyle(null);
            }}
          />
        )}
      </Dialog>

      {/* Register in Diary Modal (pre-filled from signal) */}
      <Dialog
        open={registerModal !== null}
        onOpenChange={(o) => !o && setRegisterModal(null)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{
            background: "var(--surface)",
            borderColor: "var(--clr-border)",
            color: "var(--text)",
          }}
          data-ocid="estrategias.register.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text)" }}>
              Registrar no Diário —{" "}
              {signalStyle ? STYLE_LABEL[signalStyle] : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Symbol + Side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: "var(--muted-clr)" }}>Símbolo</Label>
                <Input
                  placeholder="ex: BTC"
                  value={form.symbol}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, symbol: e.target.value }))
                  }
                  style={{
                    background: "var(--surface2)",
                    borderColor: "var(--clr-border)",
                    color: "var(--text)",
                  }}
                  data-ocid="estrategias.symbol.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: "var(--muted-clr)" }}>Lado</Label>
                <div className="flex gap-2">
                  {[
                    { val: TradeSide.long_, label: "LONG" },
                    { val: TradeSide.short_, label: "SHORT" },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, side: val }))}
                      className="flex-1 py-2 rounded text-sm font-bold border transition-all"
                      style={{
                        background:
                          form.side === val
                            ? val === TradeSide.long_
                              ? "rgba(57,255,20,0.2)"
                              : "rgba(224,75,75,0.2)"
                            : "var(--surface2)",
                        borderColor:
                          form.side === val
                            ? val === TradeSide.long_
                              ? "var(--green)"
                              : "var(--red)"
                            : "var(--clr-border)",
                        color:
                          form.side === val
                            ? val === TradeSide.long_
                              ? "var(--green)"
                              : "var(--red)"
                            : "var(--muted-clr)",
                      }}
                      data-ocid={`estrategias.side${label.toLowerCase()}.toggle`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "entryPrice", label: "Entrada" },
                { key: "stopLoss", label: "Stop Loss" },
                { key: "target", label: "Alvo" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label style={{ color: "var(--muted-clr)" }}>{label}</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form[key as keyof OpenForm] as string}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="font-mono"
                    style={{
                      background: "var(--surface2)",
                      borderColor: "var(--clr-border)",
                      color: "var(--text)",
                    }}
                    data-ocid={`estrategias.${key}.input`}
                  />
                </div>
              ))}
            </div>

            {/* RRR */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--surface2)" }}
            >
              <span style={{ color: "var(--muted-clr)" }}>
                Risk/Reward Ratio
              </span>
              <span
                className="font-mono font-bold text-lg"
                style={{
                  color:
                    calcRRR(form.entryPrice, form.stopLoss, form.target) ===
                    "--"
                      ? "var(--muted-clr)"
                      : Number.parseFloat(
                            calcRRR(
                              form.entryPrice,
                              form.stopLoss,
                              form.target,
                            ),
                          ) >= 2
                        ? "var(--green)"
                        : "var(--orange)",
                }}
              >
                {calcRRR(form.entryPrice, form.stopLoss, form.target)}
              </span>
            </div>

            {/* 5 Pillars */}
            {[
              {
                key: "setup",
                label: "1. Setup (Gatilho de Entrada)",
                placeholder: "Descreva o setup que gerou o sinal...",
              },
              {
                key: "context",
                label: "2. Filtro de Contexto",
                placeholder: "Contexto macro, tendência dominante...",
              },
              {
                key: "risk",
                label: "3. Gestão de Risco",
                placeholder: "Tamanho da posição, % de risco...",
              },
              {
                key: "position",
                label: "4. Gestão da Posição",
                placeholder: "Onde mover stop, quando realizar parcial...",
              },
              {
                key: "behavior",
                label: "5. Regras de Comportamento",
                placeholder: "Condições para parar, limites emocionais...",
              },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label style={{ color: "var(--muted-clr)" }}>{label}</Label>
                <Textarea
                  placeholder={placeholder}
                  value={form[key as keyof OpenForm] as string}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  rows={2}
                  style={{
                    background: "var(--surface2)",
                    borderColor: "var(--clr-border)",
                    color: "var(--text)",
                    resize: "none",
                  }}
                  data-ocid={`estrategias.${key}.textarea`}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRegisterModal(null)}
              style={{
                borderColor: "var(--clr-border)",
                color: "var(--muted-clr)",
                background: "transparent",
              }}
              data-ocid="estrategias.register.cancel_button"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleOpenTrade(signalStyle ?? undefined)}
              disabled={
                submitting ||
                !form.symbol ||
                !form.entryPrice ||
                !form.stopLoss ||
                !form.target
              }
              style={{
                background: "var(--orange)",
                color: "#000",
                border: "none",
              }}
              data-ocid="estrategias.register.submit_button"
            >
              {submitting ? "Registrando..." : "Confirmar Trade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Trade Modal */}
      <Dialog
        open={closeModal !== null}
        onOpenChange={(o) => !o && setCloseModal(null)}
      >
        <DialogContent
          style={{
            background: "var(--surface)",
            borderColor: "var(--clr-border)",
            color: "var(--text)",
          }}
          data-ocid="estrategias.close.dialog"
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--text)" }}>
              Fechar Trade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--muted-clr)" }}>
                Preço de Saída
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={closeExitPrice}
                onChange={(e) => setCloseExitPrice(e.target.value)}
                className="font-mono"
                style={{
                  background: "var(--surface2)",
                  borderColor: "var(--clr-border)",
                  color: "var(--text)",
                }}
                data-ocid="estrategias.closeprice.input"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStoppedOut((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all"
                style={{
                  background: stoppedOut
                    ? "rgba(224,75,75,0.15)"
                    : "var(--surface2)",
                  borderColor: stoppedOut ? "var(--red)" : "var(--clr-border)",
                  color: stoppedOut ? "var(--red)" : "var(--muted-clr)",
                }}
                data-ocid="estrategias.stoppedout.toggle"
              >
                {stoppedOut ? "✓" : "○"} Stop atingido
              </button>
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--muted-clr)" }}>Notas</Label>
              <Textarea
                placeholder="O que aconteceu? Lições aprendidas..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                rows={3}
                style={{
                  background: "var(--surface2)",
                  borderColor: "var(--clr-border)",
                  color: "var(--text)",
                  resize: "none",
                }}
                data-ocid="estrategias.closenotes.textarea"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCloseModal(null)}
              style={{
                borderColor: "var(--clr-border)",
                color: "var(--muted-clr)",
                background: "transparent",
              }}
              data-ocid="estrategias.close.cancel_button"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCloseTrade}
              disabled={submitting || !closeExitPrice}
              style={{
                background: stoppedOut ? "var(--red)" : "var(--orange)",
                color: "#000",
                border: "none",
              }}
              data-ocid="estrategias.close.confirm_button"
            >
              {submitting ? "Fechando..." : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

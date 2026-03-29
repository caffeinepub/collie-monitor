import { ZoneType } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@/hooks/useActor";
import { Activity, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function fmtPrice(n: number | null): string {
  if (n === null) return "--";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(n: number | null): string {
  if (n === null) return "--";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

type TfTrend = "Bullish" | "Neutro" | "Bearish";

interface BTCData {
  price: number | null;
  change24h: number | null;
  volume: number | null;
  fundingRate: number | null;
  ema20_4h: number | null;
  ema50_4h: number | null;
  longShortRatio: number | null;
  tfTrends: Record<string, TfTrend>;
}

async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<number[]> {
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data as any[]).map((k) => Number.parseFloat(k[4]));
}

async function fetchBTCData(): Promise<BTCData> {
  const [tickerRes, premiumRes, lsrRes] = await Promise.allSettled([
    fetch("https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT").then(
      (r) => r.json(),
    ),
    fetch("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT").then(
      (r) => r.json(),
    ),
    fetch(
      "https://fapi.binance.com/fapi/v1/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1",
    ).then((r) => r.json()),
  ]);

  const ticker = tickerRes.status === "fulfilled" ? tickerRes.value : null;
  const premium = premiumRes.status === "fulfilled" ? premiumRes.value : null;
  const lsr = lsrRes.status === "fulfilled" ? lsrRes.value : null;

  let ema20_4h: number | null = null;
  let ema50_4h: number | null = null;

  try {
    const closes = await fetchKlines("BTCUSDT", "4h", 50);
    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    ema20_4h = ema20[ema20.length - 1];
    ema50_4h = ema50[ema50.length - 1];
  } catch {}

  const tfTrends: Record<string, TfTrend> = {};
  const tfs = ["15m", "1h", "4h", "1d"];
  await Promise.allSettled(
    tfs.map(async (tf) => {
      try {
        const closes = await fetchKlines("BTCUSDT", tf, 25);
        const ema20 = calcEMA(closes, 20);
        const last = closes[closes.length - 1];
        const e20 = ema20[ema20.length - 1];
        if (last > e20 * 1.002) tfTrends[tf] = "Bullish";
        else if (last < e20 * 0.998) tfTrends[tf] = "Bearish";
        else tfTrends[tf] = "Neutro";
      } catch {
        tfTrends[tf] = "Neutro";
      }
    }),
  );

  return {
    price: ticker ? Number.parseFloat(ticker.lastPrice) : null,
    change24h: ticker ? Number.parseFloat(ticker.priceChangePercent) : null,
    volume: ticker ? Number.parseFloat(ticker.quoteVolume) : null,
    fundingRate: premium
      ? Number.parseFloat(premium.lastFundingRate) * 100
      : null,
    ema20_4h,
    ema50_4h,
    longShortRatio:
      lsr && Array.isArray(lsr) && lsr[0]
        ? Number.parseFloat(lsr[0].longShortRatio)
        : null,
    tfTrends,
  };
}

interface ZoneEntry {
  price: number;
  zoneLabel: string;
  zoneType: ZoneType;
  localId: bigint;
}

const TREND_COLOR: Record<TfTrend, string> = {
  Bullish: "var(--green)",
  Neutro: "var(--orange)",
  Bearish: "var(--red)",
};

export function BTCMonitor() {
  const { actor } = useActor();
  const [btc, setBtc] = useState<BTCData>({
    price: null,
    change24h: null,
    volume: null,
    fundingRate: null,
    ema20_4h: null,
    ema50_4h: null,
    longShortRatio: null,
    tfTrends: {},
  });
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<ZoneEntry[]>([]);
  const [zonePrice, setZonePrice] = useState("");
  const [zoneLabel, setZoneLabel] = useState("");
  const [zoneType, setZoneType] = useState<ZoneType>(ZoneType.support);
  const [addingZone, setAddingZone] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadBTC = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBTCData();
      setBtc(data);
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  }, []);

  const loadZones = useCallback(async () => {
    if (!actor) return;
    try {
      const result = await actor.getZones();
      setZones(
        result.map((z, i) => ({
          ...z,
          localId: BigInt(i),
        })),
      );
    } catch {}
  }, [actor]);

  useEffect(() => {
    loadBTC();
    const interval = setInterval(loadBTC, 30_000);
    return () => clearInterval(interval);
  }, [loadBTC]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  async function handleAddZone() {
    if (!actor || !zonePrice || !zoneLabel) return;
    setAddingZone(true);
    try {
      const id = await actor.addZone(
        Number.parseFloat(zonePrice),
        zoneLabel,
        zoneType,
      );
      setZones((prev) => [
        ...prev,
        {
          price: Number.parseFloat(zonePrice),
          zoneLabel,
          zoneType,
          localId: id,
        },
      ]);
      setZonePrice("");
      setZoneLabel("");
    } catch {}
    setAddingZone(false);
  }

  async function handleDeleteZone(id: bigint, index: number) {
    if (!actor) return;
    try {
      await actor.deleteZone(id);
      setZones((prev) => prev.filter((_, i) => i !== index));
    } catch {}
  }

  // Derived
  const resetWindow =
    btc.price !== null && btc.ema50_4h !== null
      ? btc.price < btc.ema50_4h
        ? "reset"
        : "above"
      : null;

  let phase = "MANIPULAÇÃO";
  let phaseColor = "var(--orange)";
  if (btc.fundingRate !== null) {
    if (btc.fundingRate > 0.01) {
      phase = "DISTRIBUIÇÃO";
      phaseColor = "var(--red)";
    } else if (btc.fundingRate < -0.01) {
      phase = "ACUMULAÇÃO";
      phaseColor = "var(--green)";
    }
  }

  const tfs = ["15m", "1h", "4h", "1d"];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6" style={{ color: "var(--orange)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            BTC Monitor
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs" style={{ color: "var(--muted-clr)" }}>
              Atualizado {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
          <button
            type="button"
            onClick={loadBTC}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: "var(--surface2)",
              color: "var(--orange)",
              border: "1px solid var(--clr-border)",
            }}
            data-ocid="btc.refresh.button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>
      </div>

      {/* Price Row */}
      <div
        className="rounded-xl p-6 border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--muted-clr)" }}>
              BTCUSDT
            </p>
            <p
              className="text-5xl font-bold font-mono"
              style={{ color: "var(--text)" }}
              data-ocid="btc.price.card"
            >
              ${fmtPrice(btc.price)}
            </p>
          </div>
          <div className="flex flex-col gap-2 pb-1">
            <span
              className="text-2xl font-semibold font-mono"
              style={{
                color:
                  btc.change24h === null
                    ? "var(--muted-clr)"
                    : btc.change24h >= 0
                      ? "var(--green)"
                      : "var(--red)",
              }}
            >
              {fmtPct(btc.change24h)}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-6 ml-auto">
            <div className="text-right">
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                Funding Rate
              </p>
              <p
                className="text-lg font-semibold font-mono"
                style={{
                  color:
                    btc.fundingRate === null
                      ? "var(--muted-clr)"
                      : btc.fundingRate > 0
                        ? "var(--red)"
                        : "var(--green)",
                }}
              >
                {btc.fundingRate !== null
                  ? `${btc.fundingRate.toFixed(4)}%`
                  : "--"}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                Volume 24h
              </p>
              <p
                className="text-lg font-semibold font-mono"
                style={{ color: "var(--text)" }}
              >
                {btc.volume !== null
                  ? `$${(btc.volume / 1e9).toFixed(2)}B`
                  : "--"}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-xs mb-0.5"
                style={{ color: "var(--muted-clr)" }}
              >
                L/S Ratio
              </p>
              <p
                className="text-lg font-semibold font-mono"
                style={{ color: "var(--text)" }}
              >
                {btc.longShortRatio !== null
                  ? btc.longShortRatio.toFixed(3)
                  : "--"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase + Reset + EMAs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* BTC Phase */}
        <div
          className="rounded-xl p-5 border flex flex-col gap-2"
          style={{
            background: "var(--surface)",
            borderColor: "var(--clr-border)",
          }}
          data-ocid="btc.phase.card"
        >
          <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
            Fase do BTC
          </p>
          <p className="text-2xl font-bold" style={{ color: phaseColor }}>
            {phase}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
            Funding:{" "}
            {btc.fundingRate !== null ? `${btc.fundingRate.toFixed(4)}%` : "--"}
          </p>
        </div>

        {/* Reset Window */}
        <div
          className="rounded-xl p-5 border flex flex-col gap-2"
          style={{
            background: "var(--surface)",
            borderColor:
              resetWindow === "reset"
                ? "var(--orange)"
                : resetWindow === "above"
                  ? "var(--green)"
                  : "var(--clr-border)",
            boxShadow:
              resetWindow === "reset"
                ? "0 0 20px rgba(245,124,31,0.25)"
                : resetWindow === "above"
                  ? "0 0 20px rgba(57,255,20,0.20)"
                  : "none",
          }}
          data-ocid="btc.reset.card"
        >
          <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
            Janela de Reset
          </p>
          <p
            className="text-2xl font-bold"
            style={{
              color:
                resetWindow === "reset"
                  ? "var(--orange)"
                  : resetWindow === "above"
                    ? "var(--green)"
                    : "var(--muted-clr)",
            }}
          >
            {resetWindow === "reset"
              ? "⚡ EM RESET"
              : resetWindow === "above"
                ? "✅ ACIMA"
                : "--"}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
            EMA50 (4h): ${fmtPrice(btc.ema50_4h)}
          </p>
        </div>

        {/* EMAs */}
        <div
          className="rounded-xl p-5 border flex flex-col gap-2"
          style={{
            background: "var(--surface)",
            borderColor: "var(--clr-border)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--muted-clr)" }}>
            Médias Móveis (4h)
          </p>
          <div className="space-y-2 mt-1">
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: "var(--muted-clr)" }}>
                EMA 20
              </span>
              <span
                className="text-sm font-mono"
                style={{ color: "var(--text)" }}
              >
                ${fmtPrice(btc.ema20_4h)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: "var(--muted-clr)" }}>
                EMA 50
              </span>
              <span
                className="text-sm font-mono"
                style={{ color: "var(--text)" }}
              >
                ${fmtPrice(btc.ema50_4h)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-timeframe */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        <p
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text)" }}
        >
          Análise Multi-Timeframe
        </p>
        <div className="flex flex-wrap gap-3">
          {tfs.map((tf) => {
            const trend = btc.tfTrends[tf];
            return (
              <div
                key={tf}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                style={{
                  background: "var(--surface2)",
                  borderColor: trend ? TREND_COLOR[trend] : "var(--clr-border)",
                }}
                data-ocid={`btc.tf${tf}.card`}
              >
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: "var(--muted-clr)" }}
                >
                  {tf}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: trend ? TREND_COLOR[trend] : "var(--muted-clr)",
                  }}
                >
                  {trend || "..."}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Support / Resistance Zones */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: "var(--surface)",
          borderColor: "var(--clr-border)",
        }}
      >
        <p
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text)" }}
        >
          Zonas de Suporte / Resistência
        </p>

        {/* Add Zone Form */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs" style={{ color: "var(--muted-clr)" }}>
              Preço
            </Label>
            <Input
              type="number"
              placeholder="ex: 65000"
              value={zonePrice}
              onChange={(e) => setZonePrice(e.target.value)}
              className="w-32 h-8 text-sm font-mono"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--clr-border)",
                color: "var(--text)",
              }}
              data-ocid="btc.zone.input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs" style={{ color: "var(--muted-clr)" }}>
              Label
            </Label>
            <Input
              placeholder="ex: Suporte forte"
              value={zoneLabel}
              onChange={(e) => setZoneLabel(e.target.value)}
              className="w-40 h-8 text-sm"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--clr-border)",
                color: "var(--text)",
              }}
              data-ocid="btc.zonelabel.input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs" style={{ color: "var(--muted-clr)" }}>
              Tipo
            </Label>
            <div className="flex gap-2 mt-0.5">
              {[
                { val: ZoneType.support, label: "Suporte" },
                { val: ZoneType.resistance, label: "Resistência" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setZoneType(val)}
                  className="px-3 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    background:
                      zoneType === val
                        ? val === ZoneType.support
                          ? "rgba(57,255,20,0.2)"
                          : "rgba(224,75,75,0.2)"
                        : "var(--surface2)",
                    borderColor:
                      zoneType === val
                        ? val === ZoneType.support
                          ? "var(--green)"
                          : "var(--red)"
                        : "var(--clr-border)",
                    color:
                      zoneType === val
                        ? val === ZoneType.support
                          ? "var(--green)"
                          : "var(--red)"
                        : "var(--muted-clr)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <Button
              size="sm"
              onClick={handleAddZone}
              disabled={addingZone || !zonePrice || !zoneLabel}
              className="flex items-center gap-1 h-8"
              style={{
                background: "var(--orange)",
                color: "#000",
                borderColor: "var(--orange)",
              }}
              data-ocid="btc.addzone.button"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Zones List */}
        {zones.length === 0 ? (
          <div
            className="text-center py-6 rounded-lg"
            style={{ background: "var(--surface2)", color: "var(--muted-clr)" }}
            data-ocid="btc.zones.empty_state"
          >
            Nenhuma zona cadastrada
          </div>
        ) : (
          <div className="space-y-2" data-ocid="btc.zones.list">
            {zones.map((z, i) => (
              <div
                key={String(z.localId)}
                className="flex items-center justify-between px-4 py-3 rounded-lg border"
                style={{
                  background: "var(--surface2)",
                  borderColor:
                    z.zoneType === ZoneType.support
                      ? "rgba(57,255,20,0.3)"
                      : "rgba(224,75,75,0.3)",
                }}
                data-ocid={`btc.zones.item.${i + 1}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      background:
                        z.zoneType === ZoneType.support
                          ? "rgba(57,255,20,0.15)"
                          : "rgba(224,75,75,0.15)",
                      color:
                        z.zoneType === ZoneType.support
                          ? "var(--green)"
                          : "var(--red)",
                    }}
                  >
                    {z.zoneType === ZoneType.support ? "SUP" : "RES"}
                  </span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: "var(--text)" }}
                  >
                    ${fmtPrice(z.price)}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--muted-clr)" }}
                  >
                    {z.zoneLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteZone(z.localId, i)}
                  className="p-1 rounded hover:bg-red-900/30 transition-colors"
                  style={{ color: "var(--red)" }}
                  data-ocid={`btc.zones.delete_button.${i + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

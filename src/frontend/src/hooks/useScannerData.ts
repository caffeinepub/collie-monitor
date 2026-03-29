import { useCallback, useEffect, useRef, useState } from "react";

export interface AssetRow {
  symbol: string;
  price: number;
  change24h: number;
  quoteVolume: number;
  score: number;
  signals: string[];
}

// Module-level cache so both Scanner and Estrategias share the same data
let cachedRows: AssetRow[] = [];
let cacheTime: number | null = null;
const CACHE_TTL_MS = 60_000;

export async function scanMarket(): Promise<AssetRow[]> {
  const now = Date.now();
  if (cacheTime && now - cacheTime < CACHE_TTL_MS && cachedRows.length > 0) {
    return cachedRows;
  }

  const [tickerRes, infoRes] = await Promise.allSettled([
    fetch("https://fapi.binance.com/fapi/v1/ticker/24hr").then((r) => r.json()),
    fetch("https://fapi.binance.com/fapi/v1/exchangeInfo").then((r) =>
      r.json(),
    ),
  ]);

  if (tickerRes.status !== "fulfilled" || infoRes.status !== "fulfilled")
    return [];

  const tickers: any[] = tickerRes.value;
  const info: any = infoRes.value;

  const perpetualSymbols = new Set(
    (info.symbols || [])
      .filter(
        (s: any) => s.contractType === "PERPETUAL" && s.quoteAsset === "USDT",
      )
      .map((s: any) => s.symbol),
  );

  const usdtTickers = tickers.filter(
    (t) => perpetualSymbols.has(t.symbol) && t.symbol !== "BTCUSDT",
  );

  usdtTickers.sort(
    (a, b) =>
      Number.parseFloat(b.quoteVolume) - Number.parseFloat(a.quoteVolume),
  );
  const top100 = usdtTickers.slice(0, 100);

  const volumes = top100
    .map((t) => Number.parseFloat(t.quoteVolume))
    .sort((a, b) => a - b);
  const medianVol = volumes[Math.floor(volumes.length / 2)] ?? 0;
  const p75Vol = volumes[Math.floor(volumes.length * 0.75)] ?? 0;

  const rows: AssetRow[] = top100.map((t) => {
    const change = Number.parseFloat(t.priceChangePercent);
    const qvol = Number.parseFloat(t.quoteVolume);
    const vol = Number.parseFloat(t.volume);
    const signals: string[] = [];
    let score = 0;

    if (change < -2) {
      score++;
      signals.push("Liq↓");
    }
    if (qvol > medianVol) {
      score++;
      signals.push("Vol↑");
    }
    if (qvol > p75Vol) {
      score++;
      signals.push("Top25%");
    }
    if (vol > 0 && change < -1) {
      score++;
      signals.push("Shorts↑");
    }

    return {
      symbol: t.symbol.replace("USDT", ""),
      price: Number.parseFloat(t.lastPrice),
      change24h: change,
      quoteVolume: qvol,
      score,
      signals,
    };
  });

  cachedRows = rows;
  cacheTime = now;
  return rows;
}

export function useScannerData() {
  const [rows, setRows] = useState<AssetRow[]>(cachedRows);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const doScan = useCallback(async (force = false) => {
    setLoading(true);
    if (force) {
      cacheTime = null;
    }
    try {
      const data = await scanMarket();
      const sorted = [...data].sort((a, b) => b.score - a.score);
      if (isMounted.current) {
        setRows(sorted);
        setLastUpdate(new Date());
      }
    } catch {}
    if (isMounted.current) setLoading(false);
  }, []);

  useEffect(() => {
    doScan();
    const iv = setInterval(() => doScan(), CACHE_TTL_MS);
    return () => clearInterval(iv);
  }, [doScan]);

  return { rows, loading, lastUpdate, doScan };
}

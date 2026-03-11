import { calculateRSIFromKlines, isRSIBullish } from "@/utils/rsi";
import { useCallback, useEffect, useRef, useState } from "react";

const BINANCE_BASE_URL = "https://fapi.binance.com";
const TIMEFRAMES = ["3m", "5m", "15m", "1h", "4h", "1d"] as const;
const FULL_SCAN_INTERVAL = 15 * 60 * 1000;
const TOP_SCAN_INTERVAL = 30 * 1000;
const TOP_N = 50;
const KLINES_LIMIT = 30;

export interface SignalResult {
  symbol: string;
  score: number;
  signals: {
    btcCorrelation: boolean;
    oiIncreasing: boolean;
    volumeIncreasing: boolean;
    fundingNegative: boolean;
    shortsIncreasing: boolean;
    rsiBullish: boolean;
  };
  rsiByTf: Partial<Record<string, number | null>>;
  avgRSI: number | null;
  fundingRate: number;
  price: number;
  change24h: number;
  volume: number;
  openInterest: number;
  longShortRatio: number | null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchAllTickers(): Promise<
  Map<
    string,
    { price: number; change24h: number; volume: number; fundingRate: number }
  >
> {
  const [tickers, funding] = await Promise.all([
    fetchJSON<
      Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        quoteVolume: string;
      }>
    >(`${BINANCE_BASE_URL}/fapi/v1/ticker/24hr`),
    fetchJSON<Array<{ symbol: string; lastFundingRate: string }>>(
      `${BINANCE_BASE_URL}/fapi/v1/premiumIndex`,
    ),
  ]);

  const fundingMap = new Map(
    funding.map((f) => [f.symbol, Number.parseFloat(f.lastFundingRate)]),
  );
  const map = new Map<
    string,
    { price: number; change24h: number; volume: number; fundingRate: number }
  >();

  for (const t of tickers) {
    if (!t.symbol.endsWith("USDT")) continue;
    map.set(t.symbol, {
      price: Number.parseFloat(t.lastPrice),
      change24h: Number.parseFloat(t.priceChangePercent),
      volume: Number.parseFloat(t.quoteVolume),
      fundingRate: fundingMap.get(t.symbol) ?? 0,
    });
  }

  return map;
}

async function fetchKlines(
  symbol: string,
  interval: string,
): Promise<number[][]> {
  try {
    return await fetchJSON<number[][]>(
      `${BINANCE_BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${KLINES_LIMIT}`,
    );
  } catch {
    return [];
  }
}

async function fetchBTCKlines(interval: string): Promise<number[][]> {
  return fetchKlines("BTCUSDT", interval);
}

function calculateBetaTooBTC(
  assetCloses: number[],
  btcCloses: number[],
): number | null {
  const len = Math.min(assetCloses.length, btcCloses.length, 20);
  if (len < 5) return null;

  const assetReturns: number[] = [];
  const btcReturns: number[] = [];
  for (let i = 1; i < len; i++) {
    assetReturns.push(
      (assetCloses[i] - assetCloses[i - 1]) / assetCloses[i - 1],
    );
    btcReturns.push((btcCloses[i] - btcCloses[i - 1]) / btcCloses[i - 1]);
  }

  const btcMean = btcReturns.reduce((a, b) => a + b, 0) / btcReturns.length;
  const assetMean =
    assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length;

  let cov = 0;
  let btcVar = 0;
  for (let i = 0; i < btcReturns.length; i++) {
    cov += (btcReturns[i] - btcMean) * (assetReturns[i] - assetMean);
    btcVar += (btcReturns[i] - btcMean) ** 2;
  }

  if (btcVar === 0) return null;
  return cov / btcVar;
}

async function analyzeSymbol(
  symbol: string,
  ticker: {
    price: number;
    change24h: number;
    volume: number;
    fundingRate: number;
  },
  btcKlines: Map<string, number[][]>,
  allVolumes: number[],
): Promise<SignalResult> {
  const [klinesPerTf, oiData, lsRatio] = await Promise.all([
    Promise.all(
      TIMEFRAMES.map((tf) => fetchKlines(symbol, tf).then((k) => ({ tf, k }))),
    ),
    fetchJSON<{ openInterest: string }>(
      `${BINANCE_BASE_URL}/fapi/v1/openInterest?symbol=${symbol}`,
    ).catch(() => null),
    fetchJSON<Array<{ longShortRatio: string }>>(
      `${BINANCE_BASE_URL}/fapi/v1/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=3`,
    ).catch(() => null),
  ]);

  const klines1h = klinesPerTf.find((x) => x.tf === "1h")?.k ?? [];
  const btcKlines1h = btcKlines.get("1h") ?? [];
  let btcCorrelation = false;
  if (klines1h.length >= 20 && btcKlines1h.length >= 20) {
    const assetClosesAll = klines1h.map((c) => Number.parseFloat(String(c[4])));
    const btcClosesAll = btcKlines1h.map((c) =>
      Number.parseFloat(String(c[4])),
    );
    const halfLen = Math.floor(
      Math.min(assetClosesAll.length, btcClosesAll.length) / 2,
    );
    const betaRecent = calculateBetaTooBTC(
      assetClosesAll.slice(-halfLen),
      btcClosesAll.slice(-halfLen),
    );
    const betaPrior = calculateBetaTooBTC(
      assetClosesAll.slice(0, halfLen),
      btcClosesAll.slice(0, halfLen),
    );
    if (betaRecent !== null && betaPrior !== null) {
      btcCorrelation = betaRecent > betaPrior && betaRecent > 1.0;
    }
  }

  let oiIncreasing = false;
  const currentOI = oiData ? Number.parseFloat(oiData.openInterest) : 0;
  if (klines1h.length >= 10) {
    const recentVol =
      klines1h
        .slice(-5)
        .reduce((s, k) => s + Number.parseFloat(String(k[5])), 0) / 5;
    const priorVol =
      klines1h
        .slice(-10, -5)
        .reduce((s, k) => s + Number.parseFloat(String(k[5])), 0) / 5;
    oiIncreasing = recentVol > priorVol * 1.1;
  }

  const avgVolumeAllPairs =
    allVolumes.length > 0
      ? allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length
      : 0;
  const volumeIncreasing = ticker.volume > avgVolumeAllPairs * 1.5;

  const fundingNegative = ticker.fundingRate < 0 || ticker.fundingRate < 0.0001;

  let shortsIncreasing = false;
  let longShortRatio: number | null = null;
  if (Array.isArray(lsRatio) && lsRatio.length >= 2) {
    const ratios = lsRatio.map((r) => Number.parseFloat(r.longShortRatio));
    longShortRatio = ratios[ratios.length - 1];
    shortsIncreasing = ratios[ratios.length - 1] < ratios[0];
  }

  const rsiByTf: Partial<Record<string, number | null>> = {};
  let rsiBullishCount = 0;

  for (const { tf, k } of klinesPerTf) {
    const { current, previous } = calculateRSIFromKlines(k);
    rsiByTf[tf] = current;
    if (isRSIBullish(current, previous, 40)) rsiBullishCount++;
  }

  const rsiBullish = rsiBullishCount >= 4;

  const validRSIs = Object.values(rsiByTf).filter(
    (v): v is number => v !== null,
  );
  const avgRSI =
    validRSIs.length > 0
      ? validRSIs.reduce((a, b) => a + b, 0) / validRSIs.length
      : null;

  const signals = {
    btcCorrelation,
    oiIncreasing,
    volumeIncreasing,
    fundingNegative,
    shortsIncreasing,
    rsiBullish,
  };
  const score = Object.values(signals).filter(Boolean).length;

  return {
    symbol,
    score,
    signals,
    rsiByTf,
    avgRSI,
    fundingRate: ticker.fundingRate,
    price: ticker.price,
    change24h: ticker.change24h,
    volume: ticker.volume,
    openInterest: currentOI,
    longShortRatio,
  };
}

export function useSignalScanner() {
  const [results, setResults] = useState<SignalResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastFullScan, setLastFullScan] = useState<Date | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(30);
  const [scanProgress, setScanProgress] = useState(0);
  const topSymbolsRef = useRef<string[]>([]);
  const fullScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runFullScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    try {
      const tickerMap = await fetchAllTickers();
      const symbols = Array.from(tickerMap.keys());
      const allVolumes = Array.from(tickerMap.values()).map((t) => t.volume);

      const btcKlines = new Map<string, number[][]>();
      await Promise.all(
        TIMEFRAMES.map(async (tf) => {
          const k = await fetchBTCKlines(tf);
          btcKlines.set(tf, k);
        }),
      );

      const quickScored = symbols.map((symbol) => {
        const t = tickerMap.get(symbol)!;
        const avgVol =
          allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length;
        const quickScore =
          (t.fundingRate < 0.0001 ? 1 : 0) +
          (t.volume > avgVol * 1.5 ? 1 : 0) +
          (Math.abs(t.change24h) > 2 ? 1 : 0);
        return { symbol, quickScore, ticker: t };
      });

      quickScored.sort((a, b) => b.quickScore - a.quickScore);
      const topForDeepScan = quickScored.slice(0, TOP_N);
      topSymbolsRef.current = topForDeepScan.map((x) => x.symbol);

      const batchSize = 10;
      const deepResults: SignalResult[] = [];

      for (let i = 0; i < topForDeepScan.length; i += batchSize) {
        const batch = topForDeepScan.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(({ symbol, ticker }) =>
            analyzeSymbol(symbol, ticker, btcKlines, allVolumes).catch(
              () => null,
            ),
          ),
        );
        for (const r of batchResults) {
          if (r) deepResults.push(r);
        }
        setScanProgress(
          Math.round(((i + batchSize) / topForDeepScan.length) * 100),
        );
        if (i + batchSize < topForDeepScan.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      deepResults.sort((a, b) => b.score - a.score);
      setResults(deepResults);
      setLastFullScan(new Date());
    } catch (err) {
      console.error("Full scan error:", err);
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  }, []);

  const runTopScan = useCallback(async () => {
    const symbols = topSymbolsRef.current;
    if (symbols.length === 0) return;
    try {
      const tickerMap = await fetchAllTickers();
      const allVolumes = Array.from(tickerMap.values()).map((t) => t.volume);

      const btcKlines = new Map<string, number[][]>();
      await Promise.all(
        TIMEFRAMES.map(async (tf) => {
          const k = await fetchBTCKlines(tf);
          btcKlines.set(tf, k);
        }),
      );

      const freshResults = await Promise.all(
        symbols.slice(0, TOP_N).map((symbol) => {
          const ticker = tickerMap.get(symbol);
          if (!ticker) return null;
          return analyzeSymbol(symbol, ticker, btcKlines, allVolumes).catch(
            () => null,
          );
        }),
      );

      const valid = freshResults.filter((r): r is SignalResult => r !== null);
      valid.sort((a, b) => b.score - a.score);
      setResults(valid);
    } catch (err) {
      console.error("Top scan error:", err);
    }
  }, []);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    runFullScan();

    topScanTimerRef.current = setInterval(() => {
      runTopScan();
      setNextRefreshIn(30);
    }, TOP_SCAN_INTERVAL);

    fullScanTimerRef.current = setTimeout(function repeat() {
      runFullScan();
      fullScanTimerRef.current = setTimeout(repeat, FULL_SCAN_INTERVAL);
    }, FULL_SCAN_INTERVAL);

    return () => {
      if (topScanTimerRef.current) clearInterval(topScanTimerRef.current);
      if (fullScanTimerRef.current) clearTimeout(fullScanTimerRef.current);
    };
  }, [runFullScan, runTopScan]);

  const minutesSinceFullScan = lastFullScan
    ? Math.floor((Date.now() - lastFullScan.getTime()) / 60000)
    : null;

  return {
    results,
    isScanning,
    lastFullScan,
    minutesSinceFullScan,
    nextRefreshIn,
    scanProgress,
  };
}

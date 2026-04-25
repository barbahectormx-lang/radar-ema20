"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  HistogramSeries,
} from "lightweight-charts";

export type DataSource = "binance" | "coinbase" | "kraken";

export type EngineSignal = {
  price: number;
  signal: "LONG" | "SHORT" | "NO_OPERAR";
  reason: string;
  ema20: boolean;
  emaCross: boolean;
  ema200: boolean;
  sar: boolean;
  bollinger: boolean;
  macd: boolean;
  volume: boolean;
  range: boolean;
  trend: "ALCISTA" | "BAJISTA" | "RANGO";
  stop: number;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

const timeframes = [
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "1D", value: "1d" },
];

export default function ChartPro({
  source,
  symbol,
  live,
  onPrice,
  onSignal,
}: {
  source: DataSource;
  symbol: string;
  live: boolean;
  onPrice?: (price: number) => void;
  onSignal?: (signal: EngineSignal) => void;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const macdRef = useRef<HTMLDivElement | null>(null);
  const [tf, setTf] = useState("3m");

  useEffect(() => {
    if (!chartRef.current || !macdRef.current) return;

    let disposed = false;
    let candlesData: Candle[] = [];
    let ws: WebSocket | null = null;

    chartRef.current.innerHTML = "";
    macdRef.current.innerHTML = "";

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: "#050505" },
        textColor: "#f8fafc",
        attributionLogo: false,
      } as any,
      grid: {
        vertLines: { color: "#111827" },
        horzLines: { color: "#111827" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#1f2937",
      },
      rightPriceScale: {
        borderColor: "#1f2937",
      },
    });

    const macdChart = createChart(macdRef.current, {
      width: macdRef.current.clientWidth,
      height: 170,
      layout: {
        background: { type: ColorType.Solid, color: "#050505" },
        textColor: "#f8fafc",
        attributionLogo: false,
      } as any,
      grid: {
        vertLines: { color: "#111827" },
        horzLines: { color: "#111827" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#1f2937",
      },
      rightPriceScale: {
        borderColor: "#1f2937",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#fb7185",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#34d399",
      wickDownColor: "#fb7185",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    } as any);

    const ema3Series = chart.addSeries(LineSeries, { color: "#16a34a", lineWidth: 2 });
    const ema9Series = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 2 });
    const ema20Series = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
    });
    const ema50Series = chart.addSeries(LineSeries, { color: "#dc2626", lineWidth: 4 });
    const ema50BlackSeries = chart.addSeries(LineSeries, { color: "#000000", lineWidth: 2 });
    const ema200Series = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 4 });
    const ema200GreenSeries = chart.addSeries(LineSeries, { color: "#16a34a", lineWidth: 2 });

    const bbUpperSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });
    const bbMiddleSeries = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1 });
    const bbLowerSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });

    const sarGreen = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 1,
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
    } as any);

    const sarRed = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 1,
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
    } as any);

    const macdLine = macdChart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 2 });
    const macdSignal = macdChart.addSeries(LineSeries, { color: "#f97316", lineWidth: 2 });
    const macdHist = macdChart.addSeries(HistogramSeries);

    function render(data: Candle[]) {
      if (disposed || !data.length) return;

      candlesData = data.slice(-300);
      const last = candlesData[candlesData.length - 1];

      onPrice?.(last.close);

      const ema3 = ema(candlesData, 3);
      const ema9 = ema(candlesData, 9);
      const ema20 = ema(candlesData, 20);
      const ema50 = ema(candlesData, 50);
      const ema200 = ema(candlesData, 200);
      const bb = bollinger(candlesData, 20);
      const sarData = parabolicSAR(candlesData);
      const macd = calculateMACD(candlesData);
      const engine = analyzeEngine(candlesData, ema3, ema9, ema20, ema200, bb, sarData, macd);

      onSignal?.(engine);

      candleSeries.setData(candlesData as any);

      volumeSeries.setData(
        candlesData.map((c) => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? "#34d39944" : "#fb718544",
        })) as any
      );

      ema3Series.setData(ema3 as any);
      ema9Series.setData(ema9 as any);
      ema20Series.setData(ema20 as any);
      ema50Series.setData(ema50 as any);
      ema50BlackSeries.setData(ema50 as any);
      ema200Series.setData(ema200 as any);
      ema200GreenSeries.setData(ema200 as any);

      bbUpperSeries.setData(bb.upper as any);
      bbMiddleSeries.setData(bb.middle as any);
      bbLowerSeries.setData(bb.lower as any);

      sarGreen.setData(sarData.filter((p) => p.trend === "up") as any);
      sarRed.setData(sarData.filter((p) => p.trend === "down") as any);

      macdLine.setData(macd.macd as any);
      macdSignal.setData(macd.signal as any);
      macdHist.setData(macd.histogram as any);

      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(candlesData.length - 20, 0),
        to: candlesData.length,
      });

      macdChart.timeScale().setVisibleLogicalRange({
        from: Math.max(candlesData.length - 20, 0),
        to: candlesData.length,
      });
    }

    async function loadBase() {
      const data = await fetchCandles(source, symbol, tf);
      render(data);
    }

    function applyLivePrice(price: number, volume = 0) {
      if (!candlesData.length) return;

      const seconds = timeframeSeconds(tf);
      const now = Math.floor(Date.now() / 1000);
      const bucketTime = Math.floor(now / seconds) * seconds;

      const next = [...candlesData];
      const last = next[next.length - 1];

      if (last.time === bucketTime) {
        next[next.length - 1] = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price,
          volume: (last.volume || 0) + volume,
        };
      } else {
        next.push({
          time: bucketTime,
          open: last.close,
          high: price,
          low: price,
          close: price,
          volume,
        });
      }

      render(next);
    }

    function startLive() {
      if (!live) return;

      if (source === "binance") {
        const pair = `${symbol.toLowerCase()}usdt`;
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair}@trade`);

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          applyLivePrice(Number(data.p), Number(data.q || 0));
        };
      }

      if (source === "coinbase") {
        const product = `${symbol}-USD`;
        ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");

        ws.onopen = () => {
          ws?.send(
            JSON.stringify({
              type: "subscribe",
              product_ids: [product],
              channels: ["ticker"],
            })
          );
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "ticker" && data.price) {
            applyLivePrice(Number(data.price), Number(data.last_size || 0));
          }
        };
      }
    }

    loadBase().then(startLive);

    const refresh = setInterval(loadBase, live ? 300000 : 60000);

    return () => {
      disposed = true;
      clearInterval(refresh);
      ws?.close();
      chart.remove();
      macdChart.remove();
    };
  }, [source, symbol, tf, live]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {timeframes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTf(t.value)}
            className={`px-3 py-1 rounded-full border text-sm transition ${
              tf === t.value
                ? "bg-white text-black border-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div ref={chartRef} className="w-full overflow-hidden rounded-3xl" />
      <div ref={macdRef} className="w-full overflow-hidden rounded-3xl" />
    </div>
  );
}

async function fetchCandles(source: DataSource, symbol: string, tf: string): Promise<Candle[]> {
  if (source === "binance") return fetchBinance(symbol, tf);
  if (source === "coinbase") return fetchCoinbase(symbol, tf);
  return fetchKraken(symbol, tf);
}

async function fetchBinance(symbol: string, tf: string): Promise<Candle[]> {
  const interval = ["1m", "3m", "5m", "15m", "1h", "1d"].includes(tf) ? tf : "5m";

  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=300`
  );

  const raw = await res.json();

  if (!Array.isArray(raw)) return [];

  return raw.map((c: any[]) => ({
    time: Math.floor(c[0] / 1000),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
  }));
}

async function fetchCoinbase(symbol: string, tf: string): Promise<Candle[]> {
  const granularity =
    tf === "1m" || tf === "3m"
      ? 60
      : tf === "5m"
      ? 300
      : tf === "15m"
      ? 900
      : tf === "1h"
      ? 3600
      : 86400;

  const now = Math.floor(Date.now() / 1000);
  const start = now - granularity * 300;

  const product = `${symbol}-USD`;

  const res = await fetch(
    `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}&start=${new Date(
      start * 1000
    ).toISOString()}&end=${new Date(now * 1000).toISOString()}`
  );

  const raw = await res.json();

  if (!Array.isArray(raw)) return [];

  const base = raw
    .map((c: number[]) => ({
      time: c[0],
      low: c[1],
      high: c[2],
      open: c[3],
      close: c[4],
      volume: c[5],
    }))
    .sort((a: Candle, b: Candle) => a.time - b.time);

  if (tf === "3m") return aggregate(base, 3);

  return base;
}

async function fetchKraken(symbol: string, tf: string): Promise<Candle[]> {
  const pairMap: Record<string, string> = {
    BTC: "XXBTZUSD",
    ETH: "XETHZUSD",
    SOL: "SOLUSD",
    XRP: "XXRPZUSD",
    ADA: "ADAUSD",
    DOGE: "XDGUSD",
  };

  const interval =
    tf === "1m" ? 1 : tf === "3m" ? 1 : tf === "5m" ? 5 : tf === "15m" ? 15 : tf === "1h" ? 60 : 1440;

  const pair = pairMap[symbol] || "XXBTZUSD";
  const res = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`);
  const raw = await res.json();

  const key = Object.keys(raw.result || {}).find((k) => k !== "last");
  if (!key) return [];

  const base = raw.result[key].map((c: any[]) => ({
    time: Number(c[0]),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[6]),
  }));

  if (tf === "3m") return aggregate(base, 3);

  return base.slice(-300);
}

function timeframeSeconds(tf: string) {
  if (tf === "1m") return 60;
  if (tf === "3m") return 180;
  if (tf === "5m") return 300;
  if (tf === "15m") return 900;
  if (tf === "1h") return 3600;
  if (tf === "1d") return 86400;
  return 300;
}

function aggregate(data: Candle[], groupSize: number): Candle[] {
  const result: Candle[] = [];

  for (let i = 0; i < data.length; i += groupSize) {
    const group = data.slice(i, i + groupSize);
    if (group.length < groupSize) continue;

    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + (c.volume || 0), 0),
    });
  }

  return result;
}

function ema(data: Candle[], period: number) {
  const k = 2 / (period + 1);
  let prev = data[0]?.close || 0;

  return data.map((c, i) => {
    const value = i === 0 ? c.close : c.close * k + prev * (1 - k);
    prev = value;
    return { time: c.time, value };
  });
}

function bollinger(data: Candle[], period: number) {
  const upper: { time: number; value: number }[] = [];
  const middle: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  data.forEach((c, i) => {
    if (i < period - 1) return;

    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, x) => sum + x.close, 0) / period;
    const variance =
      slice.reduce((sum, x) => sum + Math.pow(x.close - avg, 2), 0) / period;
    const dev = Math.sqrt(variance);

    middle.push({ time: c.time, value: avg });
    upper.push({ time: c.time, value: avg + dev * 2 });
    lower.push({ time: c.time, value: avg - dev * 2 });
  });

  return { upper, middle, lower };
}

function parabolicSAR(data: Candle[]) {
  if (data.length < 2) return [];

  let uptrend = true;
  let af = 0.02;
  const maxAf = 0.2;
  let ep = data[0].high;
  let sar = data[0].low;

  const result: { time: number; value: number; trend: "up" | "down" }[] = [];

  for (let i = 1; i < data.length; i++) {
    const c = data[i];
    sar = sar + af * (ep - sar);

    if (uptrend) {
      if (c.low < sar) {
        uptrend = false;
        sar = ep;
        ep = c.low;
        af = 0.02;
      } else if (c.high > ep) {
        ep = c.high;
        af = Math.min(af + 0.02, maxAf);
      }
    } else {
      if (c.high > sar) {
        uptrend = true;
        sar = ep;
        ep = c.high;
        af = 0.02;
      } else if (c.low < ep) {
        ep = c.low;
        af = Math.min(af + 0.02, maxAf);
      }
    }

    result.push({ time: c.time, value: sar, trend: uptrend ? "up" : "down" });
  }

  return result;
}

function calculateMACD(data: Candle[]) {
  const ema12 = ema(data, 12);
  const ema26 = ema(data, 26);

  const macd = data.map((c, i) => ({
    time: c.time,
    value: ema12[i].value - ema26[i].value,
  }));

  const signal = ema(
    macd.map((m) => ({
      time: m.time,
      open: m.value,
      high: m.value,
      low: m.value,
      close: m.value,
    })),
    9
  );

  const histogram = macd.map((m, i) => ({
    time: m.time,
    value: m.value - signal[i].value,
    color: m.value - signal[i].value >= 0 ? "#34d399" : "#fb7185",
  }));

  return { macd, signal, histogram };
}

function analyzeEngine(
  data: Candle[],
  ema3: { time: number; value: number }[],
  ema9: { time: number; value: number }[],
  ema20: { time: number; value: number }[],
  ema200: { time: number; value: number }[],
  bb: any,
  sarData: { time: number; value: number; trend: "up" | "down" }[],
  macd: any
): EngineSignal {
  const i = data.length - 1;
  const prev = i - 1;
  const last = data[i];

  const bullishCross =
    ema3[prev]?.value <= ema9[prev]?.value && ema3[i]?.value > ema9[i]?.value;

  const bearishCross =
    ema3[prev]?.value >= ema9[prev]?.value && ema3[i]?.value < ema9[i]?.value;

  const priceAbove20 = last.close > ema20[i]?.value;
  const priceBelow20 = last.close < ema20[i]?.value;
  const priceAbove200 = last.close > ema200[i]?.value;

  const sarLast = sarData[sarData.length - 1];
  const sarBull = sarLast?.trend === "up";
  const sarBear = sarLast?.trend === "down";

  const macdBull =
    macd.macd[i]?.value > macd.signal[i]?.value &&
    macd.histogram[i]?.value > macd.histogram[prev]?.value;

  const macdBear =
    macd.macd[i]?.value < macd.signal[i]?.value &&
    macd.histogram[i]?.value < macd.histogram[prev]?.value;

  const last20 = data.slice(-20);
  const avgVolume =
    last20.reduce((sum, c) => sum + (c.volume || 0), 0) /
    Math.max(last20.length, 1);

  const volumeStrong = (last.volume || 0) > avgVolume;

  const bbMid = bb.middle[bb.middle.length - 1]?.value;
  const bbUpper = bb.upper[bb.upper.length - 1]?.value;
  const bbLower = bb.lower[bb.lower.length - 1]?.value;

  const bollingerBull = last.close > bbMid && last.close < bbUpper;
  const bollingerBear = last.close < bbMid && last.close > bbLower;

  const recentHigh = Math.max(...last20.map((c) => c.high));
  const recentLow = Math.min(...last20.map((c) => c.low));
  const isRange = (recentHigh - recentLow) / last.close < 0.003;

  const trend =
    isRange ? "RANGO" : priceAbove20 && priceAbove200 ? "ALCISTA" : "BAJISTA";

  const longScore = [
    priceAbove20,
    priceAbove200,
    bullishCross,
    sarBull,
    macdBull,
    volumeStrong,
    bollingerBull,
    !isRange,
  ].filter(Boolean).length;

  const shortScore = [
    priceBelow20,
    bearishCross,
    sarBear,
    macdBear,
    volumeStrong,
    bollingerBear,
    !isRange,
  ].filter(Boolean).length;

  if (longScore >= 6) {
    return {
      price: last.close,
      signal: "LONG",
      reason: "LONG: condiciones alcistas fuertes.",
      ema20: priceAbove20,
      emaCross: bullishCross,
      ema200: priceAbove200,
      sar: sarBull,
      bollinger: bollingerBull,
      macd: macdBull,
      volume: volumeStrong,
      range: isRange,
      trend,
      stop: Math.min(ema20[i]?.value || last.low, sarLast?.value || last.low),
    };
  }

  if (shortScore >= 5) {
    return {
      price: last.close,
      signal: "SHORT",
      reason: "SHORT: condiciones bajistas fuertes.",
      ema20: priceBelow20,
      emaCross: bearishCross,
      ema200: priceAbove200,
      sar: sarBear,
      bollinger: bollingerBear,
      macd: macdBear,
      volume: volumeStrong,
      range: isRange,
      trend,
      stop: Math.max(ema20[i]?.value || last.high, sarLast?.value || last.high),
    };
  }

  return {
    price: last.close,
    signal: "NO_OPERAR",
    reason: isRange ? "NO OPERAR: rango lateral." : "ESPERAR: faltan confirmaciones.",
    ema20: priceAbove20 || priceBelow20,
    emaCross: bullishCross || bearishCross,
    ema200: priceAbove200,
    sar: sarBull || sarBear,
    bollinger: bollingerBull || bollingerBear,
    macd: macdBull || macdBear,
    volume: volumeStrong,
    range: isRange,
    trend,
    stop: last.close,
  };
}
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

type Asset = "BTCUSD" | "BTCUSDT" | "NVDA";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

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

const timeframes = [
  { label: "1m", value: "1m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "10m", value: "10m" },
  { label: "13m", value: "13m" },
  { label: "15m", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "1D", value: "1d" },
  { label: "1M", value: "1M" },
];

export default function ChartPro({
  asset,
  live,
  onPrice,
  onSignal,
}: {
  asset: Asset;
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
    let currentData: Candle[] = [];
    let ws: WebSocket | null = null;

    chartRef.current.innerHTML = "";
    macdRef.current.innerHTML = "";

    if (asset === "NVDA") {
      onSignal?.({
        price: 0,
        signal: "NO_OPERAR",
        reason:
          "NVDA requiere API de acciones para gráfica propia. Usa noticias y calculadora manual.",
        ema20: false,
        emaCross: false,
        ema200: false,
        sar: false,
        bollinger: false,
        macd: false,
        volume: false,
        range: true,
        trend: "RANGO",
        stop: 0,
      });
      return;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#ffffff",
        attributionLogo: false,
      } as any,
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const macdChart = createChart(macdRef.current, {
      width: macdRef.current.clientWidth,
      height: 180,
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#ffffff",
        attributionLogo: false,
      } as any,
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candles = chart.addSeries(CandlestickSeries);
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    } as any);

    const ema3Series = chart.addSeries(LineSeries, { color: "#166534", lineWidth: 2 });
    const ema9Series = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 2 });
    const ema20Series = chart.addSeries(LineSeries, {
      color: "#166534",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
    });
    const ema50Series = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 4 });
    const ema50BlackSeries = chart.addSeries(LineSeries, {
      color: "#000000",
      lineWidth: 2,
    });
    const ema200Series = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 4 });
    const ema200GreenSeries = chart.addSeries(LineSeries, {
      color: "#166534",
      lineWidth: 2,
    });

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

      currentData = data;

      const last = data[data.length - 1];
      onPrice?.(last.close);

      const ema3 = ema(data, 3);
      const ema9 = ema(data, 9);
      const ema20 = ema(data, 20);
      const ema50 = ema(data, 50);
      const ema200 = ema(data, 200);
      const bb = bollinger(data, 20);
      const sarData = parabolicSAR(data);
      const macd = calculateMACD(data);
      const signal = analyzeEngine(data, ema3, ema9, ema20, ema200, bb, sarData, macd);

      onSignal?.(signal);

      candles.setData(data as any);

      volumeSeries.setData(
        data.map((c) => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? "#22c55e55" : "#ef444455",
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
        from: Math.max(data.length - 20, 0),
        to: data.length,
      });

      macdChart.timeScale().setVisibleLogicalRange({
        from: Math.max(data.length - 20, 0),
        to: data.length,
      });
    }

    async function load() {
      try {
        const data =
          asset === "BTCUSDT" ? await fetchBinance(tf) : await fetchCoinbase(tf);
        render(data);
      } catch (error) {
        console.error("Error cargando gráfica:", error);
      }
    }

    function startLive() {
      if (!live) return;

      if (asset === "BTCUSDT") {
        const streamTf = ["1m", "3m", "5m", "15m", "1h", "1d", "1M"].includes(tf)
          ? tf
          : "1m";

        ws = new WebSocket(
          `wss://stream.binance.com:9443/ws/btcusdt@kline_${streamTf}`
        );

        ws.onmessage = (event) => {
          const json = JSON.parse(event.data);
          const k = json.k;

          const newCandle: Candle = {
            time: Math.floor(k.t / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
          };

          const next = [...currentData];
          const lastIndex = next.length - 1;

          if (lastIndex >= 0 && next[lastIndex].time === newCandle.time) {
            next[lastIndex] = newCandle;
          } else {
            next.push(newCandle);
          }

          render(next.slice(-300));
        };
      }

      if (asset === "BTCUSD") {
        ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");

        ws.onopen = () => {
          ws?.send(
            JSON.stringify({
              type: "subscribe",
              product_ids: ["BTC-USD"],
              channels: ["ticker"],
            })
          );
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type !== "ticker" || !data.price || !currentData.length) return;

          const price = Number(data.price);
          const next = [...currentData];
          const last = { ...next[next.length - 1] };

          last.close = price;
          last.high = Math.max(last.high, price);
          last.low = Math.min(last.low, price);

          next[next.length - 1] = last;
          render(next);
        };
      }
    }

    load();
    startLive();

    const interval = setInterval(load, live ? 300000 : 60000);

    return () => {
      disposed = true;
      clearInterval(interval);
      ws?.close();
      chart.remove();
      macdChart.remove();
    };
  }, [asset, tf, live]);

  if (asset === "NVDA") {
    return (
      <div className="bg-black border border-slate-700 rounded-xl p-6 text-slate-300">
        NVDA requiere API de acciones para gráfica propia. Puedes usar la calculadora, noticias y contexto manual.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {timeframes.map((t) => (
          <button
            key={t.value}
            onClick={() => setTf(t.value)}
            className={`px-3 py-1 rounded-lg border text-sm ${
              tf === t.value
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div ref={chartRef} className="w-full" />
      <div ref={macdRef} className="w-full" />
    </div>
  );
}

async function fetchBinance(tf: string): Promise<Candle[]> {
  const interval = ["10m", "13m"].includes(tf) ? "1m" : tf;

  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=300`
  );

  const raw = await res.json();

  const base = raw.map((c: any[]) => ({
    time: Math.floor(c[0] / 1000),
    open: Number(c[1]),
    high: Number(c[2]),
    low: Number(c[3]),
    close: Number(c[4]),
    volume: Number(c[5]),
  }));

  if (tf === "10m") return aggregate(base, 10);
  if (tf === "13m") return aggregate(base, 13);

  return base;
}

async function fetchCoinbase(tf: string): Promise<Candle[]> {
  const granularity =
    tf === "1m" || tf === "3m" || tf === "10m" || tf === "13m"
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

  const res = await fetch(
    `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${granularity}&start=${new Date(
      start * 1000
    ).toISOString()}&end=${new Date(now * 1000).toISOString()}`
  );

  const raw = await res.json();

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
  if (tf === "10m") return aggregate(base, 10);
  if (tf === "13m") return aggregate(base, 13);
  if (tf === "1M") return aggregate(base, 30);

  return base;
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

  const macdAsCandles = macd.map((m) => ({
    time: m.time,
    open: m.value,
    high: m.value,
    low: m.value,
    close: m.value,
  }));

  const signal = ema(macdAsCandles, 9);

  const histogram = macd.map((m, i) => ({
    time: m.time,
    value: m.value - signal[i].value,
    color: m.value - signal[i].value >= 0 ? "#22c55e" : "#ef4444",
  }));

  return { macd, signal, histogram };
}

function analyzeEngine(
  data: Candle[],
  ema3: { time: number; value: number }[],
  ema9: { time: number; value: number }[],
  ema20: { time: number; value: number }[],
  ema200: { time: number; value: number }[],
  bb: {
    upper: { time: number; value: number }[];
    middle: { time: number; value: number }[];
    lower: { time: number; value: number }[];
  },
  sarData: { time: number; value: number; trend: "up" | "down" }[],
  macd: {
    macd: { time: number; value: number }[];
    signal: { time: number; value: number }[];
    histogram: { time: number; value: number; color: string }[];
  }
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
  const rangePercent = (recentHigh - recentLow) / last.close;
  const isRange = rangePercent < 0.003;

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
      reason:
        "LONG: EMA20/EMA200 a favor, cruce o momentum alcista, SAR/MACD/volumen acompañan.",
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
      reason:
        "SHORT: precio bajo EMA20, presión bajista, SAR/MACD/volumen acompañan.",
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
    reason: isRange
      ? "NO OPERAR: precio en rango lateral / EMAs sin tendencia clara."
      : "ESPERAR: faltan confirmaciones suficientes.",
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
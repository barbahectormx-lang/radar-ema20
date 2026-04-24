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
  onPrice,
}: {
  asset: Asset;
  onPrice?: (price: number) => void;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const macdRef = useRef<HTMLDivElement | null>(null);
  const [tf, setTf] = useState("3m");

  useEffect(() => {
    if (!chartRef.current || !macdRef.current) return;

    let disposed = false;

    chartRef.current.innerHTML = "";
    macdRef.current.innerHTML = "";

    if (asset === "NVDA") {
      return;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#ffffff",
        attributionLogo: false,
      },
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
      },
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

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    } as any);

    const ema3 = chart.addSeries(LineSeries, {
      color: "#166534",
      lineWidth: 2,
    });

    const ema9 = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
    });

    const ema20 = chart.addSeries(LineSeries, {
      color: "#166534",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
    });

    const ema50 = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 4,
    });

    const ema50Black = chart.addSeries(LineSeries, {
      color: "#000000",
      lineWidth: 2,
    });

    const ema200 = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 4,
    });

    const ema200Green = chart.addSeries(LineSeries, {
      color: "#166534",
      lineWidth: 2,
    });

    const bbUpper = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
    });

    const bbMiddle = chart.addSeries(LineSeries, {
      color: "#94a3b8",
      lineWidth: 1,
    });

    const bbLower = chart.addSeries(LineSeries, {
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

    const macdLine = macdChart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
    });

    const macdSignal = macdChart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 2,
    });

    const macdHist = macdChart.addSeries(HistogramSeries);

    async function load() {
      try {
        const data =
          asset === "BTCUSDT"
            ? await fetchBinance(tf)
            : await fetchCoinbase(tf);

        if (disposed || !data.length) return;

        const last = data[data.length - 1];
        onPrice?.(last.close);

        candles.setData(data as any);

        volume.setData(
          data.map((c) => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? "#22c55e55" : "#ef444455",
          })) as any
        );

        ema3.setData(ema(data, 3) as any);
        ema9.setData(ema(data, 9) as any);
        ema20.setData(ema(data, 20) as any);
        ema50.setData(ema(data, 50) as any);
        ema50Black.setData(ema(data, 50) as any);
        ema200.setData(ema(data, 200) as any);
        ema200Green.setData(ema(data, 200) as any);

        const bb = bollinger(data, 20);
        bbUpper.setData(bb.upper as any);
        bbMiddle.setData(bb.middle as any);
        bbLower.setData(bb.lower as any);

        const sar = parabolicSAR(data);
        sarGreen.setData(sar.filter((p) => p.trend === "up") as any);
        sarRed.setData(sar.filter((p) => p.trend === "down") as any);

        const macd = calculateMACD(data);
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
      } catch (error) {
        console.error("Error cargando gráfica:", error);
      }
    }

    load();
    const interval = setInterval(load, 60000);

    return () => {
      disposed = true;
      clearInterval(interval);
      chart.remove();
      macdChart.remove();
    };
  }, [asset, tf]);

  if (asset === "NVDA") {
    return (
      <div className="bg-black border border-slate-700 rounded-xl p-6 text-slate-300">
        NVDA requiere API de acciones para gráfica propia. Por ahora usa el módulo de calculadora y noticias.
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
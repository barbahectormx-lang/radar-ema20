"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  LineStyle,
} from "lightweight-charts";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const timeframes = [
  { label: "1m", minutes: 1 },
  { label: "3m", minutes: 3 },
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
  { label: "13m", minutes: 13 },
  { label: "15m", minutes: 15 },
  { label: "1H", minutes: 60 },
  { label: "1D", minutes: 1440 },
  { label: "1M", minutes: 43200 },
];

export default function Chart() {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [timeframe, setTimeframe] = useState(timeframes[1]);

  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.innerHTML = "";

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#ffffff",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleString("es-MX", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        },
      },
    });

    const candles = chart.addSeries(CandlestickSeries);

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

    async function loadCandles() {
      const data = await getCandlesByTimeframe(timeframe.minutes);

      candles.setData(data as any);

      ema3.setData(calculateEMA(data, 3) as any);
      ema9.setData(calculateEMA(data, 9) as any);
      ema20.setData(calculateEMA(data, 20) as any);
      ema50.setData(calculateEMA(data, 50) as any);
      ema50Black.setData(calculateEMA(data, 50) as any);
      ema200.setData(calculateEMA(data, 200) as any);
      ema200Green.setData(calculateEMA(data, 200) as any);

      const bb = calculateBollinger(data, 20, 2);
      bbUpper.setData(bb.upper as any);
      bbMiddle.setData(bb.middle as any);
      bbLower.setData(bb.lower as any);

      const sar = calculateParabolicSAR(data);
      sarGreen.setData(sar.filter((p) => p.trend === "up") as any);
      sarRed.setData(sar.filter((p) => p.trend === "down") as any);

      const total = data.length;

      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(total - 20, 0),
        to: total,
      });
    }

    loadCandles();

    const interval = setInterval(loadCandles, 60000);

    return () => {
      clearInterval(interval);
      chart.remove();
    };
  }, [timeframe]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {timeframes.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 rounded-lg border text-sm ${
              timeframe.label === tf.label
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div ref={chartRef} className="w-full" />
    </div>
  );
}

async function getCandlesByTimeframe(minutes: number) {
  if ([1, 5, 15, 60, 1440].includes(minutes)) {
    return fetchCoinbaseCandles(minutesToGranularity(minutes));
  }

  if (minutes === 43200) {
    const daily = await fetchCoinbaseCandles(86400);
    return aggregateCandles(daily, 30);
  }

  const base = await fetchCoinbaseCandles(60);
  return aggregateCandles(base, minutes);
}

function minutesToGranularity(minutes: number) {
  if (minutes === 1) return 60;
  if (minutes === 5) return 300;
  if (minutes === 15) return 900;
  if (minutes === 60) return 3600;
  if (minutes === 1440) return 86400;
  return 60;
}

async function fetchCoinbaseCandles(granularity: number) {
  const now = Math.floor(Date.now() / 1000);
  const secondsNeeded = granularity * 300;
  const start = now - secondsNeeded;

  const url =
    `https://api.exchange.coinbase.com/products/BTC-USD/candles` +
    `?granularity=${granularity}` +
    `&start=${new Date(start * 1000).toISOString()}` +
    `&end=${new Date(now * 1000).toISOString()}`;

  const res = await fetch(url);
  const raw = await res.json();

  return raw
    .map((item: number[]) => ({
      time: item[0],
      low: item[1],
      high: item[2],
      open: item[3],
      close: item[4],
    }))
    .sort((a: Candle, b: Candle) => a.time - b.time);
}

function aggregateCandles(data: Candle[], groupSize: number) {
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
    });
  }

  return result;
}

function calculateEMA(data: Candle[], period: number) {
  const multiplier = 2 / (period + 1);
  let prevEma = data[0]?.close ?? 0;

  return data.map((candle, index) => {
    const value =
      index === 0
        ? candle.close
        : (candle.close - prevEma) * multiplier + prevEma;

    prevEma = value;

    return {
      time: candle.time,
      value,
    };
  });
}

function calculateBollinger(data: Candle[], period: number, multiplier: number) {
  const upper: { time: number; value: number }[] = [];
  const middle: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  data.forEach((candle, index) => {
    if (index < period - 1) return;

    const slice = data.slice(index - period + 1, index + 1);
    const avg = slice.reduce((sum, item) => sum + item.close, 0) / period;

    const variance =
      slice.reduce((sum, item) => sum + Math.pow(item.close - avg, 2), 0) /
      period;

    const stdDev = Math.sqrt(variance);

    middle.push({ time: candle.time, value: avg });
    upper.push({ time: candle.time, value: avg + stdDev * multiplier });
    lower.push({ time: candle.time, value: avg - stdDev * multiplier });
  });

  return { upper, middle, lower };
}

function calculateParabolicSAR(data: Candle[]) {
  if (data.length < 2) return [];

  let isUptrend = true;
  let af = 0.02;
  const maxAf = 0.2;

  let ep = data[0].high;
  let sar = data[0].low;

  const result: { time: number; value: number; trend: "up" | "down" }[] = [];

  for (let i = 1; i < data.length; i++) {
    const current = data[i];

    sar = sar + af * (ep - sar);

    if (isUptrend) {
      if (current.low < sar) {
        isUptrend = false;
        sar = ep;
        ep = current.low;
        af = 0.02;
      } else if (current.high > ep) {
        ep = current.high;
        af = Math.min(af + 0.02, maxAf);
      }
    } else {
      if (current.high > sar) {
        isUptrend = true;
        sar = ep;
        ep = current.high;
        af = 0.02;
      } else if (current.low < ep) {
        ep = current.low;
        af = Math.min(af + 0.02, maxAf);
      }
    }

    result.push({
      time: current.time,
      value: sar,
      trend: isUptrend ? "up" : "down",
    });
  }

  return result;
}
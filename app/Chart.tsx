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

export default function Chart() {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [signal, setSignal] = useState<any>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.innerHTML = "";

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: "#020617" },
        textColor: "#fff",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
      },
    });

    const candles = chart.addSeries(CandlestickSeries);

    const ema3 = chart.addSeries(LineSeries, { color: "#166534", lineWidth: 2 });
    const ema9 = chart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 2 });
    const ema20 = chart.addSeries(LineSeries, {
      color: "#166534",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
    });

    async function load() {
      const data = await fetchCandles();

      candles.setData(data);

      const ema3Data = calculateEMA(data, 3);
      const ema9Data = calculateEMA(data, 9);
      const ema20Data = calculateEMA(data, 20);

      ema3.setData(ema3Data);
      ema9.setData(ema9Data);
      ema20.setData(ema20Data);

      const newSignal = calculateSignal(data, ema3Data, ema9Data, ema20Data);

      const last = data[data.length - 1];

      let stop = 0;

      if (newSignal.type === "LONG") {
        stop = last.low;
      }

      if (newSignal.type === "SHORT") {
        stop = last.high;
      }

      const finalSignal = {
        ...newSignal,
        stop,
        entryPrice: last.close,
      };

      setSignal(finalSignal);

      window.dispatchEvent(
        new CustomEvent("radar-signal", {
          detail: finalSignal,
        })
      );

      chart.timeScale().setVisibleLogicalRange({
        from: data.length - 20,
        to: data.length,
      });
    }

    load();

    return () => chart.remove();
  }, []);

  return <div ref={chartRef} className="w-full" />;
}

async function fetchCandles(): Promise<Candle[]> {
  const res = await fetch(
    "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=300"
  );
  const raw = await res.json();

  return raw
    .map((c: number[]) => ({
      time: c[0],
      low: c[1],
      high: c[2],
      open: c[3],
      close: c[4],
    }))
    .reverse();
}

function calculateEMA(data: Candle[], period: number) {
  const k = 2 / (period + 1);
  let ema = data[0].close;

  return data.map((candle) => {
    ema = candle.close * k + ema * (1 - k);
    return { time: candle.time, value: ema };
  });
}

function calculateSignal(
  data: Candle[],
  ema3: any[],
  ema9: any[],
  ema20: any[]
) {
  const i = data.length - 1;

  const prevFast = ema3[i - 1].value;
  const prevSlow = ema9[i - 1].value;
  const currFast = ema3[i].value;
  const currSlow = ema9[i].value;
  const price = data[i].close;
  const ema20v = ema20[i].value;

  if (prevFast <= prevSlow && currFast > currSlow && price > ema20v) {
    return { type: "LONG", candleCount: 1 };
  }

  if (prevFast >= prevSlow && currFast < currSlow && price < ema20v) {
    return { type: "SHORT", candleCount: 1 };
  }

  return { type: "SIN SEÑAL", candleCount: 0 };
}
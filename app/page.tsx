"use client";

import { useEffect, useState } from "react";

const assets = ["BTC-USD", "BTCUSDT", "NVDA"];

export default function Home() {
  const [asset, setAsset] = useState("BTC-USD");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [status, setStatus] = useState("Conectando...");
  const [direction, setDirection] = useState("LONG");
  const [capital, setCapital] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [entry, setEntry] = useState(65000);
  const [stop, setStop] = useState(64500);
  const [target, setTarget] = useState(66000);

  useEffect(() => {
    if (asset !== "BTC-USD") {
      setStatus("Activo manual por ahora");
      return;
    }

    const ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");

    ws.onopen = () => {
      setStatus("Conectado a Coinbase");
      ws.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: ["BTC-USD"],
          channels: ["ticker", "heartbeats"],
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "ticker" && data.price) {
        const price = Number(data.price);
        setLivePrice(price);
        setEntry(price);
      }
    };

    ws.onerror = () => {
      setStatus("Error de conexión");
    };

    ws.onclose = () => {
      setStatus("Conexión cerrada");
    };

    return () => ws.close();
  }, [asset]);

  const riskMoney = capital * (risk / 100);
  const riskPerUnit = Math.abs(entry - stop);
  const suggestedSize = riskPerUnit > 0 ? riskMoney / riskPerUnit : 0;
  const rewardPerUnit = Math.abs(target - entry);
  const rr = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold">Radar Técnico Comunitario</h1>
          <p className="text-slate-400 mt-2">
            Coinbase BTC-USD · BTCUSDT · NVDA | EMA 20 + indicadores + calculadora
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assets.map((item) => (
            <button
              key={item}
              onClick={() => setAsset(item)}
              className={`rounded-xl p-4 border text-left ${
                asset === item
                  ? "bg-cyan-500/20 border-cyan-400"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="font-bold text-xl">{item}</div>
              <div className="text-sm text-slate-400">
                {item === "NVDA" ? "Acción USA" : "Cripto"}
              </div>
            </button>
          ))}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="text-sm text-slate-400">Precio en vivo</div>
          <div className="text-4xl font-black text-cyan-300 mt-2">
            {livePrice ? `$${livePrice.toFixed(2)}` : "Esperando precio..."}
          </div>
          <div className="text-sm text-slate-500 mt-2">{status}</div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Calculadora de operación</h2>

            <Field label="Dirección">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3"
              >
                <option>LONG</option>
                <option>SHORT</option>
              </select>
            </Field>

            <Field label="Capital">
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3"
              />
            </Field>

            <Field label="Riesgo %">
              <input
                type="number"
                value={risk}
                onChange={(e) => setRisk(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3"
              />
            </Field>

            <Field label="Entrada">
              <input
                type="number"
                value={entry}
                onChange={(e) => setEntry(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3"
              />
            </Field>

            <Field label="Stop">
              <input
                type="number"
                value={stop}
                onChange={(e) => setStop(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3"
              />
            </Field>

            <Field label="Target">
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3"
              />
            </Field>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold">Resultado</h2>

            <Result label="Activo" value={asset} />
            <Result label="Dirección" value={direction} />
            <Result label="Riesgo en dinero" value={`$${riskMoney.toFixed(2)}`} />
            <Result label="Riesgo por unidad" value={`$${riskPerUnit.toFixed(2)}`} />
            <Result
              label="Tamaño sugerido"
              value={suggestedSize.toFixed(asset === "NVDA" ? 0 : 6)}
            />
            <Result label="Relación R:R" value={`${rr.toFixed(2)}R`} />

            <div className="mt-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <h3 className="font-bold text-cyan-300">Lectura del sistema</h3>
              <p className="text-sm text-slate-300 mt-2">
                Coinbase ya alimenta BTC-USD en vivo. El siguiente paso será
                construir velas, calcular EMA 20 y después integrar MACD,
                Bollinger, volumen y Parabolic SAR.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-800 pb-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
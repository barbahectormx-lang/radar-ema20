"use client";

import { useEffect, useState } from "react";
import ChartPro from "./ChartPro";

type Asset = "BTCUSD" | "BTCUSDT" | "NVDA";
type Direction = "LONG" | "SHORT";

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
};

export default function Home() {
  const [asset, setAsset] = useState<Asset>("BTCUSD");
  const [direction, setDirection] = useState<Direction>("LONG");

  const [capital, setCapital] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [entry, setEntry] = useState(67000);
  const [stop, setStop] = useState(66800);
  const [closePrice, setClosePrice] = useState(67200);
  const [quantity, setQuantity] = useState(0.05);

  const [context, setContext] = useState("Neutral");
  const [timeframe, setTimeframe] = useState("3M");

  const [anomalyStart, setAnomalyStart] = useState(66800);
  const [anomalyTarget, setAnomalyTarget] = useState(67600);

  const [ema20, setEma20] = useState(true);
  const [emaCross, setEmaCross] = useState(true);
  const [sar, setSar] = useState(true);
  const [bollinger, setBollinger] = useState(false);
  const [macd, setMacd] = useState(false);
  const [volume, setVolume] = useState(false);

  const [candleStep, setCandleStep] = useState("Vela 1: entrada");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsStatus, setNewsStatus] = useState("Cargando noticias...");

  useEffect(() => {
    async function loadNews() {
      try {
        setNewsStatus("Cargando noticias...");
        const res = await fetch(`/api/news?asset=${asset}`, { cache: "no-store" });
        const data = await res.json();
        setNews(data.items || []);
        setNewsStatus("");
      } catch {
        setNews([]);
        setNewsStatus("No se pudieron cargar noticias.");
      }
    }

    loadNews();
    const interval = setInterval(loadNews, 300000);
    return () => clearInterval(interval);
  }, [asset]);

  const riskMoney = capital * (risk / 100);
  const riskPerUnit = Math.abs(entry - stop);
  const suggestedSize = riskPerUnit > 0 ? riskMoney / riskPerUnit : 0;

  const pnl =
    direction === "LONG"
      ? (closePrice - entry) * quantity
      : (entry - closePrice) * quantity;

  const target1 = direction === "LONG" ? entry + riskPerUnit : entry - riskPerUnit;
  const target2 = direction === "LONG" ? entry + riskPerUnit * 2 : entry - riskPerUnit * 2;
  const target3 = direction === "LONG" ? entry + riskPerUnit * 3 : entry - riskPerUnit * 3;

  const confirmations = [ema20, emaCross, sar, bollinger, macd, volume].filter(Boolean).length;

  const contextRisk =
    context === "Neutral"
      ? 0
      : context === "Alta volatilidad"
      ? 1
      : context === "Noticia fuerte"
      ? 2
      : context === "Riesgo macro"
      ? 2
      : 0;

  const decision =
    !ema20 || !emaCross || !sar
      ? "NO OPERAR"
      : confirmations >= 5 && contextRisk <= 1
      ? "OPERABLE"
      : "ESPERAR";

  const message = `🚨 ${asset} — Setup educativo

Activo: ${asset}
Temporalidad: ${timeframe}
Dirección: ${direction}
Decisión: ${decision}

Contexto: ${context}
Riesgo de contexto: ${contextRisk}

Entrada: ${entry}
Stop: ${stop}
Cierre / evaluación: ${closePrice}

Targets:
1R: ${target1.toFixed(2)}
2R: ${target2.toFixed(2)}
3R: ${target3.toFixed(2)}

Capital: $${capital}
Riesgo: ${risk}%
Riesgo en dinero: $${riskMoney.toFixed(2)}
Tamaño sugerido: ${suggestedSize.toFixed(asset === "NVDA" ? 0 : 6)}

Confirmaciones:
EMA20: ${ema20 ? "✅" : "❌"}
Cruce EMA 3/9: ${emaCross ? "✅" : "❌"}
Parabolic SAR: ${sar ? "✅" : "❌"}
Bollinger: ${bollinger ? "✅" : "❌"}
MACD: ${macd ? "✅" : "❌"}
Volumen: ${volume ? "✅" : "❌"}

Regla 3 velas:
${candleStep}

Arco de anomalía:
Inicio: ${anomalyStart}
Destino: ${anomalyTarget}

⚠️ Uso educativo. No perseguir precio. Respetar riesgo.`;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Sistema 3 Velas Pro</h1>
            <p className="text-slate-400 mt-1">
              Sin TradingView: gráfica propia + noticias + calculadora + WhatsApp / Telegram
            </p>
          </div>

          <div
            className={`rounded-xl px-6 py-4 text-right border ${
              pnl >= 0
                ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                : "bg-rose-950/40 border-rose-500 text-rose-300"
            }`}
          >
            <div className="text-sm text-slate-400">P&L estimado</div>
            <div className="text-3xl font-black">
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["BTCUSD", "BTCUSDT", "NVDA"] as Asset[]).map((item) => (
            <button
              key={item}
              onClick={() => setAsset(item)}
              className={`p-4 rounded-xl border text-left ${
                asset === item
                  ? "bg-cyan-500/20 border-cyan-400"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="text-xl font-bold">{item}</div>
              <div className="text-sm text-slate-400">
                {item === "NVDA" ? "Acción USA" : "Cripto"}
              </div>
            </button>
          ))}
        </section>

        <Card title="Gráfica propia — 20 velas exactas">
          <ChartPro
            asset={asset}
            onPrice={(price) => {
              setClosePrice(price);
              if (!entry) setEntry(price);
            }}
          />
        </Card>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CalculatorCard
            title="Posición Largo (Long)"
            active={direction === "LONG"}
            color="green"
            onClick={() => setDirection("LONG")}
            entry={entry}
            setEntry={setEntry}
            stop={stop}
            setStop={setStop}
            closePrice={closePrice}
            setClosePrice={setClosePrice}
            quantity={quantity}
            setQuantity={setQuantity}
            pnl={direction === "LONG" ? pnl : 0}
          />

          <CalculatorCard
            title="Posición Corto (Short)"
            active={direction === "SHORT"}
            color="red"
            onClick={() => setDirection("SHORT")}
            entry={entry}
            setEntry={setEntry}
            stop={stop}
            setStop={setStop}
            closePrice={closePrice}
            setClosePrice={setClosePrice}
            quantity={quantity}
            setQuantity={setQuantity}
            pnl={direction === "SHORT" ? pnl : 0}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Gestión de riesgo">
            <Input label="Capital" value={capital} set={setCapital} />
            <Input label="Riesgo %" value={risk} set={setRisk} />
            <Input label="Temporalidad" value={timeframe} set={setTimeframe} text />

            <Row label="Riesgo en dinero" value={`$${riskMoney.toFixed(2)}`} />
            <Row label="Riesgo por unidad" value={`$${riskPerUnit.toFixed(2)}`} />
            <Row label="Tamaño sugerido" value={suggestedSize.toFixed(asset === "NVDA" ? 0 : 6)} />
            <Row label="Target 1R" value={target1.toFixed(2)} />
            <Row label="Target 2R" value={target2.toFixed(2)} />
            <Row label="Target 3R" value={target3.toFixed(2)} />
          </Card>

          <Card title="Contexto tipo Crucix">
            <Select
              label="Contexto"
              value={context}
              set={setContext}
              options={["Neutral", "Alta volatilidad", "Noticia fuerte", "Riesgo macro"]}
            />
            <Row label="Riesgo de contexto" value={contextRisk.toString()} />
            <Row label="Decisión" value={decision} />
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Checklist técnico">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Check label="EMA20 a favor" value={ema20} set={setEma20} />
              <Check label="Cruce EMA 3/9" value={emaCross} set={setEmaCross} />
              <Check label="Parabolic SAR" value={sar} set={setSar} />
              <Check label="Bollinger acompaña" value={bollinger} set={setBollinger} />
              <Check label="MACD acompaña" value={macd} set={setMacd} />
              <Check label="Volumen confirma" value={volume} set={setVolume} />
            </div>
            <Row label="Confirmaciones" value={`${confirmations}/6`} />
            <Row label="Resultado" value={decision} />
          </Card>

          <Card title="Noticias en tiempo real">
            {newsStatus && <p className="text-slate-400">{newsStatus}</p>}

            <div className="space-y-3">
              {news.map((item, index) => (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  className="block bg-black border border-slate-700 rounded-xl p-4 hover:border-cyan-400"
                >
                  <div className="font-bold">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    {item.source} · {item.pubDate}
                  </div>
                </a>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Regla de 3 velas">
            <Select
              label="Estado actual"
              value={candleStep}
              set={setCandleStep}
              options={[
                "Vela 1: entrada",
                "Vela 2: seguimiento",
                "Vela 3: salida obligatoria",
              ]}
            />
            <div className="bg-black border border-slate-700 rounded-xl p-4">
              {candleStep}
            </div>
          </Card>

          <Card title="Arco de anomalía">
            <Input label="Precio anomalía inicial" value={anomalyStart} set={setAnomalyStart} />
            <Input label="Precio anomalía destino" value={anomalyTarget} set={setAnomalyTarget} />
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-sm">
              El arco ayuda a ubicar si el precio va de una anomalía a otra y si está regresando al nivel esperado.
            </div>
          </Card>
        </section>

        <Card title="Mensaje para WhatsApp / Telegram">
          <textarea value={message} readOnly className="w-full h-80 bg-black rounded-xl p-4 text-sm" />

          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => navigator.clipboard.writeText(message)} className="bg-slate-700 px-4 py-2 rounded">
              Copiar
            </button>

            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" className="bg-green-600 px-4 py-2 rounded">
              WhatsApp
            </a>

            <a href={`https://t.me/share/url?text=${encodeURIComponent(message)}`} target="_blank" className="bg-blue-600 px-4 py-2 rounded">
              Telegram
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}

function CalculatorCard(props: any) {
  const {
    title,
    active,
    color,
    onClick,
    entry,
    setEntry,
    stop,
    setStop,
    closePrice,
    setClosePrice,
    quantity,
    setQuantity,
    pnl,
  } = props;

  const isGreen = color === "green";

  return (
    <section
      onClick={onClick}
      className={`border rounded-2xl overflow-hidden cursor-pointer ${
        active
          ? isGreen
            ? "border-emerald-400"
            : "border-rose-400"
          : "border-slate-800"
      }`}
    >
      <div className={`px-5 py-3 flex justify-between ${isGreen ? "bg-emerald-600" : "bg-rose-600"}`}>
        <h2 className="font-bold">{title}</h2>
        <div className="font-bold">P&L: {pnl.toFixed(2)}</div>
      </div>

      <div className="bg-slate-900 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Precio entrada" value={entry} set={setEntry} />
        <Input label="Stop" value={stop} set={setStop} />
        <Input label="Precio cierre" value={closePrice} set={setClosePrice} />
        <Input label="Cantidad / acciones" value={quantity} set={setQuantity} />

        <div className="md:col-span-2 bg-black border border-slate-700 rounded-xl p-4">
          <Row label="Entrada" value={entry.toString()} />
          <Row label="Stop" value={stop.toString()} />
          <Row label="Cierre" value={closePrice.toString()} />
          <Row label="P&L" value={pnl.toFixed(2)} />
        </div>
      </div>
    </section>
  );
}

function Card({ title, children }: any) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, set, text = false }: any) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <input
        type={text ? "text" : "number"}
        value={value}
        onChange={(e) => set(text ? e.target.value : Number(e.target.value))}
        className="w-full bg-black border border-slate-700 rounded-lg p-3 mt-1"
      />
    </label>
  );
}

function Select({ label, value, set, options }: any) {
  return (
    <label className="block">
      <span className="text-sm text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full bg-black border border-slate-700 rounded-lg p-3 mt-1"
      >
        {options.map((option: string) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, value, set }: any) {
  return (
    <button
      onClick={() => set(!value)}
      className={`p-4 rounded-xl border text-left ${
        value ? "bg-emerald-500/20 border-emerald-400" : "bg-slate-950 border-slate-700"
      }`}
    >
      <div className="font-bold">{value ? "✅" : "❌"} {label}</div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-800 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
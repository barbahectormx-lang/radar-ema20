"use client";

import { useEffect, useState } from "react";
import ChartPro, { EngineSignal, DataSource } from "./ChartPro";

type Mode = "CONSERVADOR" | "AGRESIVO" | "INTELIGENTE";
type Direction = "LONG" | "SHORT";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  image: string;
};

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
};

export default function Home() {
  const [source, setSource] = useState<DataSource>("binance");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selected, setSelected] = useState("BTC");

  const [mode, setMode] = useState<Mode>("INTELIGENTE");
  const [live, setLive] = useState(false);
  const [direction, setDirection] = useState<Direction>("LONG");

  const [price, setPrice] = useState(0);
  const [engine, setEngine] = useState<EngineSignal>({
    price: 0,
    signal: "NO_OPERAR",
    reason: "Esperando datos.",
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

  const [capital, setCapital] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [entry, setEntry] = useState(0);
  const [stop, setStop] = useState(0);
  const [closePrice, setClosePrice] = useState(0);
  const [quantity, setQuantity] = useState(0.05);

  const [context, setContext] = useState("Neutral");
  const [timeframe, setTimeframe] = useState("3M");
  const [candleStep, setCandleStep] = useState("Vela 1: entrada");
  const [anomalyStart, setAnomalyStart] = useState(0);
  const [anomalyTarget, setAnomalyTarget] = useState(0);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsStatus, setNewsStatus] = useState("Cargando noticias...");

  useEffect(() => {
    async function loadMarket() {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        const data = await res.json();
        const list = data.items || [];
        setCoins(list);

        if (list.length && !selected) {
          setSelected(list[0].symbol);
        }
      } catch {
        setCoins([]);
      }
    }

    loadMarket();
    const interval = setInterval(loadMarket, 60000);
    return () => clearInterval(interval);
  }, [selected]);

  useEffect(() => {
    async function loadNews() {
      try {
        setNewsStatus("Cargando noticias...");
        const res = await fetch(`/api/news?symbol=${selected}`, {
          cache: "no-store",
        });
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
  }, [selected]);

  function handleSignal(signal: EngineSignal) {
    setEngine(signal);

    if (signal.price > 0) {
      setPrice(signal.price);
      setClosePrice(signal.price);
    }

    if (entry === 0 && signal.price > 0) {
      setEntry(signal.price);
    }

    if (stop === 0 && signal.stop > 0) {
      setStop(signal.stop);
    }

    if (signal.signal === "LONG") {
      setDirection("LONG");
      setEntry(signal.price);
      setStop(signal.stop);
    }

    if (signal.signal === "SHORT") {
      setDirection("SHORT");
      setEntry(signal.price);
      setStop(signal.stop);
    }
  }

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

  const activeConditions = [
    engine.ema200,
    engine.ema20,
    engine.emaCross,
    engine.sar,
    engine.bollinger,
    engine.macd,
    engine.volume,
    !engine.range,
  ];

  const confirmations = activeConditions.filter(Boolean).length;
  const totalConditions = activeConditions.length;

  let decision = "ESPERAR";

  if (mode === "CONSERVADOR") {
    decision =
      engine.signal !== "NO_OPERAR" && confirmations >= 7 && contextRisk <= 1
        ? `${engine.signal} VALIDADO`
        : "NO OPERAR";
  }

  if (mode === "AGRESIVO") {
    decision =
      engine.signal !== "NO_OPERAR" && confirmations >= 5
        ? engine.signal
        : "ESPERAR";
  }

  if (mode === "INTELIGENTE") {
    if (engine.signal !== "NO_OPERAR" && confirmations >= 6 && contextRisk <= 1) {
      decision = `${engine.signal} VALIDADO`;
    } else if (confirmations >= 4 && contextRisk <= 1) {
      decision = "SETUP EN FORMACIÓN";
    } else {
      decision = "NO OPERAR";
    }
  }

  const riskMoney = capital * (risk / 100);
  const riskPerUnit = Math.abs(entry - stop);
  const suggestedSize = riskPerUnit > 0 ? riskMoney / riskPerUnit : 0;

  const pnl =
    direction === "LONG"
      ? (closePrice - entry) * quantity
      : (entry - closePrice) * quantity;

  const target1 = direction === "LONG" ? entry + riskPerUnit : entry - riskPerUnit;
  const target2 =
    direction === "LONG" ? entry + riskPerUnit * 2 : entry - riskPerUnit * 2;
  const target3 =
    direction === "LONG" ? entry + riskPerUnit * 3 : entry - riskPerUnit * 3;

  const selectedCoin = coins.find((coin) => coin.symbol === selected);

  const message = `🚨 ${selected} — Setup educativo

Fuente: ${source.toUpperCase()}
Modo: ${mode}
Tiempo real: ${live ? "ACTIVO" : "NORMAL"}
Activo: ${selected}
Temporalidad: ${timeframe}
Dirección: ${direction}
Decisión: ${decision}

Precio actual: ${price.toFixed(2)}
Señal del motor: ${engine.signal}
Tendencia: ${engine.trend}
Motivo: ${engine.reason}

Contexto: ${context}
Riesgo de contexto: ${contextRisk}

Entrada: ${entry.toFixed(2)}
Stop: ${stop.toFixed(2)}
Cierre / evaluación: ${closePrice.toFixed(2)}

Targets:
1R: ${target1.toFixed(2)}
2R: ${target2.toFixed(2)}
3R: ${target3.toFixed(2)}

Capital: $${capital}
Riesgo: ${risk}%
Riesgo en dinero: $${riskMoney.toFixed(2)}
Tamaño sugerido: ${suggestedSize.toFixed(6)}

Motor técnico:
EMA200: ${engine.ema200 ? "✅" : "❌"}
EMA20: ${engine.ema20 ? "✅" : "❌"}
Cruce EMA 3/9: ${engine.emaCross ? "✅" : "❌"}
Parabolic SAR: ${engine.sar ? "✅" : "❌"}
Bollinger: ${engine.bollinger ? "✅" : "❌"}
MACD: ${engine.macd ? "✅" : "❌"}
Volumen: ${engine.volume ? "✅" : "❌"}
Rango lateral: ${engine.range ? "⚠️ Sí" : "✅ No"}

Confirmaciones: ${confirmations}/${totalConditions}

Regla 3 velas:
${candleStep}

Arco de anomalía:
Inicio: ${anomalyStart}
Destino: ${anomalyTarget}

⚠️ Uso educativo. No perseguir precio. Respetar riesgo.`;

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Radar Market Pro
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Multi API · Top 10 cripto · Tiempo real · Motor automático · 3 velas
            </p>
          </div>

          <div
            className={`rounded-3xl px-6 py-4 text-right border ${
              pnl >= 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="text-xs text-slate-400">P&L estimado</div>
            <div className="text-3xl font-semibold">
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)}
            </div>
          </div>
        </header>

        <Card title="Fuente de datos">
          <div className="flex flex-wrap gap-2">
            {(["binance", "coinbase", "kraken"] as DataSource[]).map((item) => (
              <button
                key={item}
                onClick={() => setSource(item)}
                className={`px-4 py-2 rounded-full border transition ${
                  source === item
                    ? "bg-white text-black border-white"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </Card>

        <div className="flex overflow-x-auto gap-3 pb-2">
          {coins.map((coin) => (
            <button
              key={coin.id}
              onClick={() => {
                setSelected(coin.symbol);
                setEntry(0);
                setStop(0);
                setClosePrice(0);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-3xl border whitespace-nowrap transition ${
                selected === coin.symbol
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              {coin.image && <img src={coin.image} alt={coin.symbol} className="w-6 h-6" />}
              <div className="text-left">
                <div className="font-semibold">{coin.symbol}</div>
                <div className="text-xs opacity-70">${coin.price.toFixed(2)}</div>
              </div>
              <div
                className={`text-sm ${
                  coin.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {coin.change24h.toFixed(2)}%
              </div>
            </button>
          ))}
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Precio actual" value={`$${price.toFixed(2)}`} />
          <Stat label="Señal" value={engine.signal} />
          <Stat label="Tendencia" value={engine.trend} />
          <Stat label="Volumen 24h" value={`$${formatCompact(selectedCoin?.volume24h || 0)}`} />
        </section>

        <Card title="Modo de actualización">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setLive(false)}
              className={`px-4 py-2 rounded-full border ${
                !live
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/10"
              }`}
            >
              Normal
            </button>

            <button
              onClick={() => setLive(true)}
              className={`px-4 py-2 rounded-full border ${
                live
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white/5 border-white/10"
              }`}
            >
              🔴 Tiempo Real
            </button>
          </div>
        </Card>

        <Card title="Motor automático">
          <div
            className={`rounded-3xl border p-5 ${
              decision.includes("LONG")
                ? "bg-emerald-500/10 border-emerald-400/50"
                : decision.includes("SHORT")
                ? "bg-rose-500/10 border-rose-400/50"
                : decision === "SETUP EN FORMACIÓN"
                ? "bg-amber-500/10 border-amber-400/50"
                : "bg-white/5 border-white/10"
            }`}
          >
            <div className="text-sm text-slate-400">Decisión</div>
            <div className="text-4xl font-semibold tracking-tight">{decision}</div>
            <div className="mt-2 text-slate-300">{engine.reason}</div>
            <div className="mt-3 text-sm text-slate-400">
              Confirmaciones: {confirmations}/{totalConditions} · Tendencia:{" "}
              {engine.trend}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["CONSERVADOR", "AGRESIVO", "INTELIGENTE"] as Mode[]).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={`px-4 py-2 rounded-full border ${
                  mode === item
                    ? "bg-white text-black border-white"
                    : "bg-white/5 border-white/10 text-slate-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </Card>

        <Card title={`Gráfica propia — ${selected} · ${source.toUpperCase()}`}>
          <ChartPro
            source={source}
            symbol={selected}
            live={live}
            onPrice={setPrice}
            onSignal={handleSignal}
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
            <Row label="Tamaño sugerido" value={suggestedSize.toFixed(6)} />
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
          <Card title="Checklist automático del motor">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Status label="EMA 200 filtro" value={engine.ema200} />
              <Status label="EMA20 dirección" value={engine.ema20} />
              <Status label="Cruce EMA 3/9" value={engine.emaCross} />
              <Status label="Parabolic SAR" value={engine.sar} />
              <Status label="Bollinger" value={engine.bollinger} />
              <Status label="MACD" value={engine.macd} />
              <Status label="Volumen" value={engine.volume} />
              <Status label="Evitar rango" value={!engine.range} />
            </div>
            <Row label="Confirmaciones" value={`${confirmations}/${totalConditions}`} />
            <Row label="Tendencia" value={engine.trend} />
          </Card>

          <Card title={`Noticias en tiempo real — ${selected}`}>
            {newsStatus && <p className="text-slate-400">{newsStatus}</p>}

            <div className="space-y-3">
              {news.map((item, index) => (
                <a
                  key={index}
                  href={item.link}
                  target="_blank"
                  className="block bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10"
                >
                  <div className="font-medium">{item.title}</div>
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
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              {candleStep}
            </div>
          </Card>

          <Card title="Arco de anomalía">
            <Input
              label="Precio anomalía inicial"
              value={anomalyStart}
              set={setAnomalyStart}
            />
            <Input
              label="Precio anomalía destino"
              value={anomalyTarget}
              set={setAnomalyTarget}
            />
          </Card>
        </section>

        <Card title="Mensaje para WhatsApp / Telegram">
          <textarea
            value={message}
            readOnly
            className="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm"
          />

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => navigator.clipboard.writeText(message)}
              className="bg-white text-black px-4 py-2 rounded-full"
            >
              Copiar
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              className="bg-green-600 px-4 py-2 rounded-full"
            >
              WhatsApp
            </a>

            <a
              href={`https://t.me/share/url?text=${encodeURIComponent(message)}`}
              target="_blank"
              className="bg-blue-600 px-4 py-2 rounded-full"
            >
              Telegram
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: any) {
  return (
    <section className="bg-[#050505] border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#050505] border border-white/10 rounded-3xl p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold truncate">{value}</div>
    </div>
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
      className={`border rounded-3xl overflow-hidden cursor-pointer bg-[#050505] ${
        active
          ? isGreen
            ? "border-emerald-400/60"
            : "border-rose-400/60"
          : "border-white/10"
      }`}
    >
      <div
        className={`px-5 py-3 flex justify-between ${
          isGreen ? "bg-emerald-600/80" : "bg-rose-600/80"
        }`}
      >
        <h2 className="font-medium">{title}</h2>
        <div className="font-semibold">P&L: {pnl.toFixed(2)}</div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Precio entrada" value={entry} set={setEntry} />
        <Input label="Stop" value={stop} set={setStop} />
        <Input label="Precio cierre" value={closePrice} set={setClosePrice} />
        <Input label="Cantidad / monedas" value={quantity} set={setQuantity} />

        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4">
          <Row label="Entrada" value={entry.toFixed(2)} />
          <Row label="Stop" value={stop.toFixed(2)} />
          <Row label="Cierre" value={closePrice.toFixed(2)} />
          <Row label="P&L" value={pnl.toFixed(2)} />
        </div>
      </div>
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
        className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mt-1"
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
        className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mt-1"
      >
        {options.map((option: string) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Status({ label, value }: { label: string; value: boolean }) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        value
          ? "bg-emerald-500/10 border-emerald-400/50"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="font-medium">
        {value ? "✅" : "❌"} {label}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/10 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatCompact(value: number) {
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}
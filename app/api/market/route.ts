import { NextResponse } from "next/server";

const COINS = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "dogecoin",
  "cardano",
  "avalanche-2",
  "chainlink",
  "the-open-network",
];

export async function GET() {
  try {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      "?vs_currency=usd" +
      `&ids=${COINS.join(",")}` +
      "&order=market_cap_desc" +
      "&sparkline=false" +
      "&price_change_percentage=24h";

    const res = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    const raw = await res.json();

    const items = raw.map((coin: any) => ({
      id: coin.id,
      symbol: String(coin.symbol).toUpperCase(),
      name: coin.name,
      price: coin.current_price || 0,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume || 0,
      marketCap: coin.market_cap || 0,
      image: coin.image || "",
    }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
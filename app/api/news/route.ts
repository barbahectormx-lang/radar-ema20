import { NextResponse } from "next/server";

function cleanText(text: string) {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const asset = searchParams.get("asset") || "BTCUSD";

    const query =
      asset === "NVDA"
        ? "NVDA NVIDIA stock artificial intelligence semiconductor earnings"
        : asset === "BTCUSDT"
        ? "BTCUSDT Bitcoin crypto market Binance"
        : "BTCUSD Bitcoin crypto market Federal Reserve dollar";

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=es-419&gl=MX&ceid=MX:es-419`;

    const res = await fetch(url, { cache: "no-store" });
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 10)
      .map((match) => {
        const item = match[1];

        const title = cleanText(
          item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ""
        );

        const link = cleanText(
          item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ""
        );

        const pubDate = cleanText(
          item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ""
        );

        const source = cleanText(
          item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "Google News"
        );

        return { title, link, pubDate, source };
      });

    return NextResponse.json({ asset, query, items });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar noticias.", items: [] },
      { status: 500 }
    );
  }
}
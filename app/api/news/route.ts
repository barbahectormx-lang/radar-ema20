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
    const symbol = searchParams.get("symbol") || "BTC";
    const query = `${symbol} crypto market news price analysis`;

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=es-419&gl=MX&ceid=MX:es-419`;

    const res = await fetch(url, { cache: "no-store" });
    const xml = await res.text();

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 8)
      .map((match) => {
        const item = match[1];

        return {
          title: cleanText(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ""),
          link: cleanText(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ""),
          pubDate: cleanText(
            item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ""
          ),
          source: cleanText(
            item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ||
              "Google News"
          ),
        };
      });

    return NextResponse.json({ query, items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
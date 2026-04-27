import { NextRequest, NextResponse } from "next/server";
import { makeSignal, macd, rsi, simpleForecast, sma } from "@/lib/indicators";

export const runtime = "nodejs";

type CacheEntry = {
  data: any;
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5분
const stockCache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "005930.KS").trim();
  const range = (searchParams.get("range") || "6mo").trim();
  const cacheKey = `${symbol}:${range}`;

  const cached = stockCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      cacheSource: "memory",
    });
  }

  try {
    const period1 = Math.floor(getPeriodStart(range).getTime() / 1000);
    const period2 = Math.floor(Date.now() / 1000);

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?period1=${period1}&period2=${period2}&interval=1d`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    });

    const text = await res.text();

    if (res.status === 429 || text.includes("Too Many Requests")) {
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          cached: true,
          cacheSource: "stale-memory",
          warning: "외부 주가 서버가 요청을 제한하여 최근 저장 데이터로 표시 중입니다.",
        });
      }

      return NextResponse.json(
        {
          error: "외부 주가 서버가 현재 요청을 제한하고 있습니다.",
          detail: "Too Many Requests",
          blocked: true,
          status: 429,
          symbol,
        },
        { status: 429 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "외부 주가 서버 호출에 실패했습니다.",
          detail: text.slice(0, 500),
          status: res.status,
          symbol,
        },
        { status: 500 }
      );
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          cached: true,
          cacheSource: "stale-memory",
          warning: "외부 응답이 비정상이라 최근 저장 데이터로 표시 중입니다.",
        });
      }

      return NextResponse.json(
        {
          error: "외부 주가 서버 응답이 JSON 형식이 아닙니다.",
          detail: text.slice(0, 500),
          symbol,
        },
        { status: 500 }
      );
    }

    const result = json?.chart?.result?.[0];
    const errorInfo = json?.chart?.error;

    if (errorInfo) {
      return NextResponse.json(
        {
          error: "주가 데이터를 가져오지 못했습니다.",
          detail: errorInfo?.description || errorInfo?.code || "unknown error",
          symbol,
        },
        { status: 500 }
      );
    }

    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};
    const adjclose = result?.indicators?.adjclose?.[0]?.adjclose || [];
    const closesRaw: Array<number | null> = quote?.close || [];

    const chartRows = timestamps
      .map((ts, i) => {
        const close = closesRaw[i] ?? adjclose[i] ?? null;
        return {
          date: new Date(ts * 1000).toISOString().slice(0, 10),
          close: close != null ? Number(close) : null,
        };
      })
      .filter((row) => row.close != null) as Array<{ date: string; close: number }>;

    if (!chartRows.length) {
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          cached: true,
          cacheSource: "stale-memory",
          warning: "새 데이터를 받지 못해 최근 저장 데이터로 표시 중입니다.",
        });
      }

      return NextResponse.json(
        {
          error: "해당 종목 데이터를 찾지 못했습니다.",
          symbol,
        },
        { status: 404 }
      );
    }

    const dates = chartRows.map((row) => row.date);
    const closes = chartRows.map((row) => row.close);

    const sma20 = sma(closes, 20);
    const sma60 = sma(closes, 60);
    const rsi14 = rsi(closes, 14);
    const macdData = macd(closes);
    const forecast = simpleForecast(closes, 5);

    const chartData = dates.map((date, i) => ({
      date,
      close: closes[i] ?? null,
      sma20: sma20[i] ?? null,
      sma60: sma60[i] ?? null,
      rsi14: rsi14[i] ?? null,
      macd: macdData.macdLine[i] ?? null,
      signal: macdData.signalLine[i] ?? null,
      histogram: macdData.histogram[i] ?? null,
    }));

    const currentPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - 2] ?? currentPrice;

    const change =
      prevPrice !== 0
        ? Number((((currentPrice - prevPrice) / prevPrice) * 100).toFixed(2))
        : 0;

    const latestSma20 = sma20[sma20.length - 1] ?? null;
    const latestSma60 = sma60[sma60.length - 1] ?? null;
    const latestRsi14 = rsi14[rsi14.length - 1] ?? null;
    const latestMacd = macdData.macdLine[macdData.macdLine.length - 1] ?? null;
    const latestMacdSignal =
      macdData.signalLine[macdData.signalLine.length - 1] ?? null;

    const signalSummary =
      latestSma20 != null &&
      latestSma60 != null &&
      latestRsi14 != null &&
      latestMacd != null &&
      latestMacdSignal != null
        ? makeSignal({
            current: currentPrice,
            sma20: latestSma20,
            sma60: latestSma60,
            rsi: latestRsi14,
            macd: latestMacd,
            macdSignal: latestMacdSignal,
          })
        : "신호 분석 데이터가 아직 충분하지 않습니다.";

    const responseData = {
      symbol,
      currentPrice,
      prevPrice,
      change,
      signalSummary,
      chartData,
      forecast,
      cached: false,
    };

    stockCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("stock api error:", error);

    if (cached) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheSource: "stale-memory",
        warning: "일시 오류로 최근 저장 데이터로 표시 중입니다.",
      });
    }

    return NextResponse.json(
      {
        error: "주가 데이터를 불러오지 못했습니다.",
        detail: error?.message || String(error),
        symbol,
      },
      { status: 500 }
    );
  }
}

function getPeriodStart(range: string) {
  const now = new Date();
  const d = new Date(now);

  switch (range) {
    case "1mo":
      d.setMonth(now.getMonth() - 1);
      break;
    case "3mo":
      d.setMonth(now.getMonth() - 3);
      break;
    case "6mo":
      d.setMonth(now.getMonth() - 6);
      break;
    case "1y":
      d.setFullYear(now.getFullYear() - 1);
      break;
    default:
      d.setMonth(now.getMonth() - 6);
      break;
  }

  return d;
}

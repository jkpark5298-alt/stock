"use client";

import { useEffect, useMemo, useState } from "react";

type ChartRow = {
  date: string;
  close: number | null;
  sma20?: number | null;
  sma60?: number | null;
  rsi14?: number | null;
  macd?: number | null;
  signal?: number | null;
  histogram?: number | null;
};

type StockResponse = {
  symbol?: string;
  currentPrice?: number;
  prevPrice?: number;
  change?: number;
  signalSummary?: string;
  chartData?: ChartRow[];
  forecast?: number[];
  cached?: boolean;
  cacheSource?: string;
  warning?: string;
  blocked?: boolean;
  error?: string;
  detail?: string;
  status?: number;
};

const DEFAULT_SYMBOL = "005930.KS";
const DEFAULT_RANGE = "6mo";
const WATCHLIST_KEY = "kospi-watchlist";

export default function HomePage() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(WATCHLIST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setWatchlist(parsed);
      } catch {
        localStorage.removeItem(WATCHLIST_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (watchlist.length > 0) {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } else {
      localStorage.removeItem(WATCHLIST_KEY);
    }
  }, [watchlist]);

  async function fetchStock(targetSymbol?: string, targetRange?: string) {
    const finalSymbol = (targetSymbol ?? symbol).trim();
    const finalRange = targetRange ?? range;

    if (!finalSymbol) {
      setUiError("종목 코드를 입력해주세요.");
      setData(null);
      return;
    }

    setLoading(true);
    setUiError("");

    try {
      const res = await fetch(
        `/api/stock?symbol=${encodeURIComponent(finalSymbol)}&range=${encodeURIComponent(finalRange)}`,
        { cache: "no-store" }
      );

      const json: StockResponse = await res.json();

      if (!res.ok) {
        setData(json);
        if (json.blocked) {
          setUiError("외부 주가 서버가 현재 요청을 제한하고 있습니다. 잠시 후 다시 시도하세요.");
        } else {
          setUiError(json.error || "주가 데이터를 불러오지 못했습니다.");
        }
        return;
      }

      setData(json);
    } catch (error: any) {
      setData(null);
      setUiError(error?.message || "주가 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyze() {
    fetchStock();
  }

  function handleSaveWatchlist() {
    const trimmed = symbol.trim().toUpperCase();

    if (!trimmed) {
      alert("저장할 종목 코드를 입력해주세요.");
      return;
    }

    if (watchlist.includes(trimmed)) {
      alert("이미 저장된 관심종목입니다.");
      return;
    }

    setWatchlist((prev) => [...prev, trimmed]);
  }

  function handleDeleteWatchlist(item: string) {
    setWatchlist((prev) => prev.filter((v) => v !== item));
  }

  function handleSelectWatchlist(item: string) {
    setSymbol(item);
    fetchStock(item, range);
  }

  const chartData = data?.chartData ?? [];
  const recentRows = useMemo(() => chartData.slice(-10).reverse(), [chartData]);
  const latestRow = useMemo(
    () => (chartData.length ? chartData[chartData.length - 1] : null),
    [chartData]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        padding: "24px",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h1 style={{ fontSize: 46, fontWeight: 900, marginBottom: 10 }}>
          KOSPI Stock PWA
        </h1>
        <p style={{ color: "#64748b", fontSize: 18, marginBottom: 28 }}>
          코스피/국내 주식 분석 + 관심종목 저장 + PWA 설치 지원
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <Card>
            <SectionTitle>종목 분석</SectionTitle>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="예: 005930.KS"
                style={inputStyle}
              />

              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                style={selectStyle}
              >
                <option value="1mo">1개월</option>
                <option value="3mo">3개월</option>
                <option value="6mo">6개월</option>
                <option value="1y">1년</option>
              </select>

              <button onClick={handleAnalyze} disabled={loading} style={primaryButtonStyle}>
                {loading ? "불러오는 중..." : "분석하기"}
              </button>
            </div>

            <button onClick={handleSaveWatchlist} style={secondaryButtonStyle}>
              관심종목 저장
            </button>

            <div style={{ marginTop: 22, borderTop: "1px solid #e2e8f0", paddingTop: 18 }}>
              {uiError ? (
                <p style={{ color: "#ef4444", fontWeight: 700 }}>{uiError}</p>
              ) : data?.warning ? (
                <p style={{ color: "#d97706", fontWeight: 700 }}>{data.warning}</p>
              ) : data?.cached ? (
                <p style={{ color: "#2563eb", fontWeight: 700 }}>
                  캐시된 데이터를 표시 중입니다.
                </p>
              ) : (
                <p style={{ color: "#94a3b8", fontWeight: 600 }}>
                  종목 코드를 입력하고 분석하기를 눌러주세요.
                </p>
              )}

              {data?.detail && (
                <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
                  detail: {data.detail}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle>관심종목</SectionTitle>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {watchlist.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>저장된 관심종목이 없습니다.</p>
              ) : (
                watchlist.map((item) => (
                  <div key={item} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      onClick={() => handleSelectWatchlist(item)}
                      style={{
                        flex: 1,
                        border: "1px solid #dbe3ef",
                        background: "#fff",
                        borderRadius: 16,
                        padding: "16px 18px",
                        fontSize: 18,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {item}
                    </button>

                    <button
                      onClick={() => handleDeleteWatchlist(item)}
                      style={{
                        border: "1px solid #dbe3ef",
                        background: "#fff",
                        borderRadius: 16,
                        padding: "16px 18px",
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: "1px solid #e2e8f0",
                color: "#64748b",
                lineHeight: 1.7,
                fontSize: 15,
              }}
            >
              자주 쓰는 예시: ^KS11 / 005930.KS / 000660.KS / 035420.KS / 035720.KS
            </div>
          </Card>
        </section>

        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
          }}
        >
          <InfoCard title="현재가">
            <BigValue>{formatNumber(data?.currentPrice)}</BigValue>
          </InfoCard>

          <InfoCard title="전일 대비">
            <BigValue color={getChangeColor(data?.change)}>
              {formatPercent(data?.change)}
            </BigValue>
          </InfoCard>

          <InfoCard title="분석 신호">
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.6 }}>
              {data?.signalSummary || "데이터 없음"}
            </div>
          </InfoCard>
        </section>

        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 20,
          }}
        >
          <Card>
            <ChartHeader
              title="주가 차트"
              description={`${data?.symbol || "-"} / 종가, SMA20, SMA60`}
            />
            <PriceChart rows={chartData} />
          </Card>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <Card>
              <ChartHeader title="RSI14" description="일반적으로 70 이상 과열, 30 이하 과매도 구간으로 참고" />
              <LineChart
                rows={chartData}
                dataKey="rsi14"
                stroke="#7c3aed"
                fixedMin={0}
                fixedMax={100}
                guides={[30, 70]}
              />
            </Card>

            <Card>
              <ChartHeader title="MACD" description="MACD / Signal / Histogram" />
              <MacdChart rows={chartData} />
            </Card>
          </section>
        </section>

        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <Card>
            <SectionTitleSmall>5일 단순 예측</SectionTitleSmall>
            {data?.forecast && data.forecast.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                {data.forecast.map((value, idx) => (
                  <li key={idx}>
                    Day {idx + 1}: {formatNumber(value)}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#64748b" }}>예측 데이터가 부족합니다.</p>
            )}
          </Card>

          <Card>
            <SectionTitleSmall>최근 지표 요약</SectionTitleSmall>
            <div style={{ display: "grid", gap: 10 }}>
              <MetricRow label="RSI14" value={formatNumber(latestRow?.rsi14)} />
              <MetricRow label="MACD" value={formatNumber(latestRow?.macd)} />
              <MetricRow label="Signal" value={formatNumber(latestRow?.signal)} />
              <MetricRow label="Histogram" value={formatNumber(latestRow?.histogram)} />
              <MetricRow label="SMA20" value={formatNumber(latestRow?.sma20)} />
              <MetricRow label="SMA60" value={formatNumber(latestRow?.sma60)} />
            </div>
          </Card>
        </section>

        <section style={{ marginTop: 24 }}>
          <Card>
            <SectionTitleSmall>최근 10일 데이터</SectionTitleSmall>
            {recentRows.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <Th>날짜</Th>
                      <Th>종가</Th>
                      <Th>SMA20</Th>
                      <Th>SMA60</Th>
                      <Th>RSI14</Th>
                      <Th>MACD</Th>
                      <Th>Signal</Th>
                      <Th>Histogram</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map((row) => (
                      <tr key={row.date}>
                        <Td>{row.date}</Td>
                        <Td>{formatNumber(row.close)}</Td>
                        <Td>{formatNumber(row.sma20)}</Td>
                        <Td>{formatNumber(row.sma60)}</Td>
                        <Td>{formatNumber(row.rsi14)}</Td>
                        <Td>{formatNumber(row.macd)}</Td>
                        <Td>{formatNumber(row.signal)}</Td>
                        <Td>{formatNumber(row.histogram)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#64748b" }}>데이터 없음</p>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 28,
        padding: 28,
        boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 22 }}>{children}</h2>;
}

function SectionTitleSmall({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 18 }}>{children}</h3>;
}

function ChartHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>{title}</h3>
      {description ? (
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>{description}</p>
      ) : null}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 28,
        padding: 28,
        boxShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
        minHeight: 132,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 16, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function BigValue({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        fontSize: 42,
        fontWeight: 900,
        color: color || "#0f172a",
      }}
    >
      {children}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: "1px solid #eef2f7",
        paddingBottom: 8,
      }}
    >
      <span style={{ color: "#64748b", fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function PriceChart({ rows }: { rows: ChartRow[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Legend
        items={[
          { label: "종가", color: "#2563eb" },
          { label: "SMA20", color: "#f59e0b" },
          { label: "SMA60", color: "#10b981" },
        ]}
      />
      <MultiLineChart
        rows={rows}
        lines={[
          { key: "close", color: "#2563eb" },
          { key: "sma20", color: "#f59e0b" },
          { key: "sma60", color: "#10b981" },
        ]}
      />
    </div>
  );
}

function MacdChart({ rows }: { rows: ChartRow[] }) {
  const filtered = rows.filter(
    (r) => r.macd != null || r.signal != null || r.histogram != null
  );

  if (!filtered.length) {
    return <EmptyChartMessage />;
  }

  const width = 1000;
  const height = 280;
  const pad = 24;

  const histValues = filtered
    .map((r) => r.histogram)
    .filter((v): v is number => v != null && !Number.isNaN(v));

  const lineValues = filtered
    .flatMap((r) => [r.macd, r.signal])
    .filter((v): v is number => v != null && !Number.isNaN(v));

  const all = [...histValues, ...lineValues, 0];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;

  const x = (i: number) => {
    if (filtered.length === 1) return width / 2;
    return pad + (i / (filtered.length - 1)) * (width - pad * 2);
  };

  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);
  const zeroY = y(0);

  const macdPoints = filtered.map((r, i) => ({ x: x(i), y: y((r.macd ?? 0) as number), v: r.macd }));
  const signalPoints = filtered.map((r, i) => ({ x: x(i), y: y((r.signal ?? 0) as number), v: r.signal }));

  const macdPath = buildPath(macdPoints, "v");
  const signalPath = buildPath(signalPoints, "v");

  return (
    <div style={{ width: "100%" }}>
      <Legend
        items={[
          { label: "MACD", color: "#2563eb" },
          { label: "Signal", color: "#ef4444" },
          { label: "Histogram +", color: "#16a34a" },
          { label: "Histogram -", color: "#dc2626" },
        ]}
      />

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 300 }}>
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        <GridLines width={width} height={height} pad={pad} lines={4} />
        <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} stroke="#94a3b8" strokeDasharray="4 4" />

        {filtered.map((r, i) => {
          const xv = x(i);
          const hv = r.histogram ?? 0;
          const yv = y(hv);
          const top = Math.min(zeroY, yv);
          const barH = Math.max(1, Math.abs(zeroY - yv));
          const barW = Math.max(4, (width - pad * 2) / Math.max(filtered.length * 1.8, 20));

          return (
            <rect
              key={`${r.date}-hist`}
              x={xv - barW / 2}
              y={top}
              width={barW}
              height={barH}
              fill={hv >= 0 ? "#16a34a" : "#dc2626"}
              opacity={0.75}
            />
          );
        })}

        <path d={macdPath} fill="none" stroke="#2563eb" strokeWidth="3" />
        <path d={signalPath} fill="none" stroke="#ef4444" strokeWidth="3" />
      </svg>
    </div>
  );
}

function LineChart({
  rows,
  dataKey,
  stroke,
  fixedMin,
  fixedMax,
  guides = [],
}: {
  rows: ChartRow[];
  dataKey: keyof ChartRow;
  stroke: string;
  fixedMin?: number;
  fixedMax?: number;
  guides?: number[];
}) {
  const filtered = rows.filter((r) => {
    const v = r[dataKey];
    return typeof v === "number" && !Number.isNaN(v);
  });

  if (!filtered.length) {
    return <EmptyChartMessage />;
  }

  const width = 1000;
  const height = 260;
  const pad = 24;

  const values = filtered
    .map((r) => r[dataKey])
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  const min = fixedMin ?? Math.min(...values);
  const max = fixedMax ?? Math.max(...values);
  const range = max - min || 1;

  const points = filtered.map((r, i) => {
    const value = r[dataKey] as number;
    const x =
      filtered.length === 1
        ? width / 2
        : pad + (i / (filtered.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return { x, y, v: value };
  });

  const path = buildPath(points, "v");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 280 }}>
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      <GridLines width={width} height={height} pad={pad} lines={4} />

      {guides.map((g) => {
        const gy = height - pad - ((g - min) / range) * (height - pad * 2);
        return (
          <line
            key={g}
            x1={pad}
            y1={gy}
            x2={width - pad}
            y2={gy}
            stroke="#cbd5e1"
            strokeDasharray="5 5"
          />
        );
      })}

      <path d={path} fill="none" stroke={stroke} strokeWidth="3" />
    </svg>
  );
}

function MultiLineChart({
  rows,
  lines,
}: {
  rows: ChartRow[];
  lines: Array<{ key: keyof ChartRow; color: string }>;
}) {
  const filtered = rows.filter((r) =>
    lines.some(({ key }) => typeof r[key] === "number" && !Number.isNaN(r[key] as number))
  );

  if (!filtered.length) {
    return <EmptyChartMessage />;
  }

  const width = 1000;
  const height = 320;
  const pad = 26;

  const values = filtered.flatMap((r) =>
    lines
      .map(({ key }) => r[key])
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v))
  );

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const linePaths = lines.map(({ key, color }) => {
    const points = filtered.map((r, i) => {
      const raw = r[key];
      const value = typeof raw === "number" ? raw : null;
      const x =
        filtered.length === 1
          ? width / 2
          : pad + (i / (filtered.length - 1)) * (width - pad * 2);

      if (value == null || Number.isNaN(value)) return { x, y: 0, v: null };

      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return { x, y, v: value };
    });

    return {
      key: String(key),
      color,
      d: buildPath(points, "v"),
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 340 }}>
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      <GridLines width={width} height={height} pad={pad} lines={5} />
      {linePaths.map((line) => (
        <path key={line.key} d={line.d} fill="none" stroke={line.color} strokeWidth="3" />
      ))}
    </svg>
  );
}

function GridLines({
  width,
  height,
  pad,
  lines,
}: {
  width: number;
  height: number;
  pad: number;
  lines: number;
}) {
  return (
    <>
      {Array.from({ length: lines + 1 }).map((_, i) => {
        const y = pad + (i / lines) * (height - pad * 2);
        return (
          <line
            key={i}
            x1={pad}
            y1={y}
            x2={width - pad}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}
    </>
  );
}

function Legend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: item.color,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 14, color: "#475569", fontWeight: 700 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChartMessage() {
  return (
    <div
      style={{
        height: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        border: "1px dashed #cbd5e1",
        borderRadius: 18,
      }}
    >
      그래프를 표시할 데이터가 없습니다.
    </div>
  );
}

function buildPath(
  points: Array<{ x: number; y: number; v: number | null }>,
  key: "v"
) {
  let d = "";
  points.forEach((p, idx) => {
    if (p[key] == null || Number.isNaN(p[key] as number)) return;
    d += `${d ? " L" : "M"} ${p.x} ${p.y}`;
    if (idx === 0 && !d.startsWith("M")) {
      d = `M ${p.x} ${p.y}`;
    }
  });
  return d;
}

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "데이터 없음";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "데이터 없음";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getChangeColor(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "#0f172a";
  if (value > 0) return "#dc2626";
  if (value < 0) return "#2563eb";
  return "#0f172a";
}

const inputStyle: React.CSSProperties = {
  flex: "1 1 360px",
  minWidth: 260,
  border: "1px solid #dbe3ef",
  background: "#fff",
  borderRadius: 20,
  padding: "18px 22px",
  fontSize: 20,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #dbe3ef",
  background: "#fff",
  borderRadius: 20,
  padding: "18px 22px",
  fontSize: 20,
  minWidth: 170,
  outline: "none",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
  color: "#fff",
  borderRadius: 20,
  padding: "18px 30px",
  fontSize: 20,
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #dbe3ef",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 20,
  padding: "16px 22px",
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 10px",
        borderBottom: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "12px 10px",
        borderBottom: "1px solid #eef2f7",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

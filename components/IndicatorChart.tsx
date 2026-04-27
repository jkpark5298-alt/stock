"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type Point = {
  date: string;
  rsi14: number | null;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};

export function RsiChart({ data }: { data: Point[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" minTickGap={28} tick={{ fill: "currentColor", fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "currentColor", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="rsi14" name="RSI14" stroke="#f59e0b" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MacdChart({ data }: { data: Point[] }) {
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" minTickGap={28} tick={{ fill: "currentColor", fontSize: 12 }} />
          <YAxis tick={{ fill: "currentColor", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="histogram" name="Histogram" fill="#94a3b8" />
          <Line type="monotone" dataKey="macd" name="MACD" stroke="#2563eb" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="signal" name="Signal" stroke="#ef4444" dot={false} strokeWidth={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

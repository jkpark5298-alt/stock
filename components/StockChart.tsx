"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type Props = {
  data: {
    date: string;
    close: number;
    sma20: number | null;
    sma60: number | null;
  }[];
};

export default function StockChart({ data }: Props) {
  return (
    <div style={{ width: "100%", height: 380 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="date" minTickGap={28} tick={{ fill: "currentColor", fontSize: 12 }} />
          <YAxis domain={["auto", "auto"]} tick={{ fill: "currentColor", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="close" name="종가" stroke="#2563eb" dot={false} strokeWidth={2.4} />
          <Line type="monotone" dataKey="sma20" name="SMA20" stroke="#16a34a" dot={false} />
          <Line type="monotone" dataKey="sma60" name="SMA60" stroke="#dc2626" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

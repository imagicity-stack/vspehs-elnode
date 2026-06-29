"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const BRAND = "#1d40f5";
export const CHART_COLORS = ["#1d40f5", "#f97316", "#10b981", "#8b5cf6", "#ef4444", "#0ea5e9", "#eab308"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 24px -4px rgba(16,24,40,0.1)",
  fontSize: 12,
};

export function TrendArea({
  data, dataKey, xKey = "label", color = BRAND, height = 240,
}: { data: any[]; dataKey: string; xKey?: string; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({
  data, keys, xKey = "label", colors = CHART_COLORS, height = 260, stacked = false,
}: { data: any[]; keys: string[]; xKey?: string; colors?: string[]; height?: number; stacked?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            stackId={stacked ? "a" : undefined}
            fill={colors[i % colors.length]}
            radius={stacked ? 0 : [6, 6, 0, 0]}
            maxBarSize={44}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data, height = 220, innerRadius = 58, outerRadius = 88,
}: { data: { name: string; value: number; color?: string }[]; height?: number; innerRadius?: number; outerRadius?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} stroke="none">
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Trends({
  data, keys, xKey = "label", colors = CHART_COLORS, height = 260,
}: { data: any[]; keys: string[]; xKey?: string; colors?: string[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
        {keys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2.5} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

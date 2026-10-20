"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePrice } from "@/components/providers/StoreProvider";

export function SalesChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const fmt = usePrice();
  return (
    <div className="h-72 w-full" role="img" aria-label="Daily revenue over the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { revenue: number; orders: number };
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-slate-900">{label}</p>
                  <p className="mt-1 text-slate-600">Revenue: <span className="font-semibold text-slate-900">{fmt(p.revenue)}</span></p>
                  <p className="text-slate-600">Orders: <span className="font-semibold text-slate-900">{p.orders}</span></p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

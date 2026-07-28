"use client"

import { useId } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts"

export function TrendChart({ data, dataKey = "value", color = "#3291ff", height = 96, formatValue }) {
  const gradientId = useId()
  const format = formatValue || ((value) => `$${Number(value).toLocaleString()}`)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={() => ""}
          formatter={(value) => [format(value), ""]}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

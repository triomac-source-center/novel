"use client"

// Lightweight, dependency-free candlestick renderer (Recharts has no first-party candlestick
// primitive). Plain SVG with a manual linear scale — one <line> for the high/low wick, one <rect>
// for the open/close body per candle, scaled into a viewBox so it stays responsive via CSS width.
export function CandlestickChart({ data, height = 260 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No trades yet on this cluster.
      </div>
    )
  }

  const values = data.flatMap((d) => [d.open, d.high, d.low, d.close])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = span * 0.12
  const domainMin = min - pad
  const domainMax = max + pad
  const domainSpan = domainMax - domainMin || 1

  const n = data.length
  const slot = 100 / n
  const bodyWidth = Math.max(slot * 0.55, 0.6)

  function y(value) {
    return height - ((value - domainMin) / domainSpan) * height
  }

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const cx = i * slot + slot / 2
        const isUp = d.close >= d.open
        const color = isUp ? "#10b981" : "var(--color-destructive)"
        const bodyTop = y(Math.max(d.open, d.close))
        const bodyBottom = y(Math.min(d.open, d.close))
        const bodyHeight = Math.max(bodyBottom - bodyTop, 0.6)
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(d.high)} y2={y(d.low)} stroke={color} strokeWidth={slot * 0.06} />
            <rect x={cx - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} />
          </g>
        )
      })}
    </svg>
  )
}

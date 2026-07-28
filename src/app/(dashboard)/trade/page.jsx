"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CandlestickChart, TrendingUp, Wallet } from "lucide-react"
import { fetchClusters } from "@/lib/api-client"
import { useWallet } from "@/lib/wallet-context"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { InvestmentHistory } from "@/components/investment-history"

const POLL_INTERVAL_MS = 5000

function buildPositions(clusters, clerkId) {
  if (!clerkId) return []
  const positions = []

  for (const cluster of clusters) {
    if (cluster.status === "closed") continue
    const myCells = Array.isArray(cluster.cells) ? cluster.cells.filter((cell) => cell.ownerClerkId === clerkId) : []
    if (myCells.length === 0) continue

    const metrics = calculateClusterMetrics({
      cellCount: Number(cluster.expVolume ?? 0),
      cellValue: Number(cluster.entryPoint ?? 0),
      filledCells: Number(cluster.holderPoint ?? 0),
      currentLayer: Number(cluster.currentLayer ?? 1),
      maxLayers: Number(cluster.maxLayers ?? 1),
      layerStep: Number(cluster.layerStep ?? 0),
    })

    const byLayer = new Map()
    for (const cell of myCells) {
      const layer = Number(cell.acquiredLayer || 1)
      const bucket = byLayer.get(layer) || { cells: 0, cost: 0, openedAt: cell.acquiredAt }
      bucket.cells += 1
      bucket.cost += Number(cell.acquiredPrice || 0)
      if (cell.acquiredAt && new Date(cell.acquiredAt) < new Date(bucket.openedAt)) bucket.openedAt = cell.acquiredAt
      byLayer.set(layer, bucket)
    }

    for (const [layer, bucket] of byLayer) {
      const entryPrice = bucket.cost / bucket.cells
      const isCurrentLayer = layer === metrics.currentLayer
      // A position still sitting in the layer you entered isn't sellable yet (layer 1 rule) or
      // hasn't been picked up by a new buyer yet — mark it toward the next layer's price as the
      // layer fills, so the P/L visibly grows with the cluster's progress, like a floating trade.
      // Once the layer has moved on, the cell is fully "vested" at the live current-layer price.
      const markPrice = isCurrentLayer
        ? metrics.currentCellPrice + (metrics.layerStep || 0) * (metrics.progress / 100)
        : metrics.currentCellPrice
      const profit = (markPrice - entryPrice) * bucket.cells

      positions.push({
        key: `${cluster._id}-${layer}`,
        clusterId: cluster._id,
        symbol: cluster.symbol,
        name: cluster.name || cluster.symbol,
        layer,
        currentLayer: metrics.currentLayer,
        cells: bucket.cells,
        entryPrice,
        markPrice,
        profit,
        progress: isCurrentLayer ? metrics.progress : 100,
        openedAt: bucket.openedAt,
        vested: !isCurrentLayer,
      })
    }
  }

  return positions.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
}

const TICK_INTERVAL_MS = 1000
const TICK_STEP = 0.01

export default function TradePage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { real } = useWallet()
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticks, setTicks] = useState({})

  useEffect(() => {
    let isActive = true

    async function load() {
      try {
        const data = await fetchClusters()
        if (isActive) setClusters(Array.isArray(data?.data) ? data.data : [])
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [])

  const positions = useMemo(() => buildPositions(clusters, clerkUser?.id), [clusters, clerkUser?.id])

  // Simulated live feed: nudge each open position's price by +/- $0.01 every second so the
  // terminal feels alive between real cluster updates, without touching any real balance data.
  useEffect(() => {
    const tick = setInterval(() => {
      setTicks((prev) => {
        const next = { ...prev }
        for (const position of positions) {
          const delta = Math.random() < 0.5 ? -TICK_STEP : TICK_STEP
          next[position.key] = (next[position.key] ?? 0) + delta
        }
        return next
      })
    }, TICK_INTERVAL_MS)
    return () => clearInterval(tick)
  }, [positions])

  const livePositions = positions.map((position) => {
    const jitter = ticks[position.key] ?? 0
    const livePrice = position.markPrice + jitter
    const liveProfit = position.profit + jitter * position.cells
    return { ...position, livePrice, liveProfit }
  })

  const floatingPnl = livePositions.reduce((sum, position) => sum + position.liveProfit, 0)
  const equity = real.balance + floatingPnl

  // Realized activity (layer transitions, cell payouts) is persisted server-side on the user's
  // transaction history (category: "investment") — this isn't a client-only computation, it's the
  // same record shown on /portfolio and in the admin cluster activity log.
  const investmentTransactions = useMemo(
    () => real.transactions.filter((tx) => tx.category === "investment").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [real.transactions]
  )

  if (!isSignedIn) return <p>Please log in</p>

  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    )
  }

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Live trading terminal"
        icon={CandlestickChart}
        title="Trade"
        description="Every funded cell opens a position here, marked to market as its layer fills."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Balance" value={formatCurrency(real.balance)} icon={Wallet} />
        <StatCard
          label="Floating P/L"
          value={`${floatingPnl >= 0 ? "+" : ""}${formatCurrency(floatingPnl)}`}
          icon={TrendingUp}
          accent={floatingPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
        />
        <StatCard label="Equity" value={formatCurrency(equity)} icon={Wallet} accent="text-primary" />
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={CandlestickChart} title="No open positions" description="Fund a cell on the market to open your first position." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Layer</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Open price</TableHead>
                  <TableHead className="text-right">Current price</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {livePositions.map((position) => (
                  <TableRow key={position.key}>
                    <TableCell>
                      <Link href={`/market/${position.clusterId}`} className="font-medium text-foreground hover:text-primary">
                        {position.symbol}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {position.layer} / {position.currentLayer}
                        {position.vested ? " · vested" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground">{position.cells}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(position.entryPrice)}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">{formatCurrency(position.livePrice)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${position.liveProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {position.liveProfit >= 0 ? "+" : ""}
                      {formatCurrency(position.liveProfit)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(position.openedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <InvestmentHistory transactions={investmentTransactions} title="Realized activity" />
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownToLine, CandlestickChart, TrendingUp, Wallet } from "lucide-react"
import { fetchClusters } from "@/lib/api-client"
import { useWallet } from "@/lib/wallet-context"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"

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

function buildClosedPositions(clusters, clerkId) {
  if (!clerkId) return []
  const closed = []

  for (const cluster of clusters) {
    const activity = Array.isArray(cluster.activityLog) ? cluster.activityLog : []

    // Sold out: another investor bought your cell and you were paid out — a real, persisted event.
    for (const entry of activity) {
      if (entry.type !== "transfer" || entry.clerkId !== clerkId) continue
      const cells = Number(entry.cells || 0) || 1
      closed.push({
        key: `${cluster._id}-sold-${entry.createdAt}-${entry.layer}`,
        clusterId: cluster._id,
        symbol: cluster.symbol,
        layer: entry.layer,
        cells,
        entryPrice: Number(entry.costBasis || 0) / cells,
        exitPrice: Number(entry.amount || 0) / cells,
        gain: Number(entry.amount || 0) - Number(entry.costBasis || 0),
        closedAt: entry.createdAt,
        reason: "Sold",
      })
    }

    // Matured: the cluster reached its final layer while you still held cells — no further buyer,
    // no payout, but the position is no longer open either.
    if (cluster.status === "closed") {
      const myCells = Array.isArray(cluster.cells) ? cluster.cells.filter((cell) => cell.ownerClerkId === clerkId) : []
      const byLayer = new Map()
      for (const cell of myCells) {
        const layer = Number(cell.acquiredLayer || 1)
        const bucket = byLayer.get(layer) || { cells: 0, cost: 0 }
        bucket.cells += 1
        bucket.cost += Number(cell.acquiredPrice || 0)
        byLayer.set(layer, bucket)
      }
      for (const [layer, bucket] of byLayer) {
        closed.push({
          key: `${cluster._id}-matured-${layer}`,
          clusterId: cluster._id,
          symbol: cluster.symbol,
          layer,
          cells: bucket.cells,
          entryPrice: bucket.cost / bucket.cells,
          exitPrice: null,
          gain: null,
          closedAt: cluster.closedAt,
          reason: "Matured",
        })
      }
    }
  }

  return closed.sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
}

const TICK_INTERVAL_MS = 1000
const TICK_STEP = 0.01

// Heat-map style intensity instead of a flat green/red: the further a position has moved from
// its entry (in percent), the stronger the color.
function pnlColorClass(percent) {
  if (!Number.isFinite(percent) || percent === 0) return "text-muted-foreground"
  if (percent > 10) return "text-emerald-400"
  if (percent > 3) return "text-emerald-500 dark:text-emerald-400"
  if (percent > 0) return "text-emerald-700 dark:text-emerald-600"
  if (percent > -3) return "text-red-700 dark:text-red-600"
  if (percent > -10) return "text-red-500 dark:text-red-400"
  return "text-red-400"
}

export default function TradePage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { real } = useWallet()
  // Shared "clusters" key: market/[id]'s invest handler calls the SWR global mutate("clusters")
  // right after a successful trade, so the actor sees it instantly. The refreshInterval on top of
  // that is what makes a cluster you're watching update live when someone ELSE trades in it.
  const { data, isLoading } = useSWR("clusters", fetchClusters, { revalidateOnFocus: true, refreshInterval: 5000 })
  const clusters = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])
  // Same reasoning as WalletProvider: `isLoading` clears after the first attempt settles even on
  // failure, so gate the skeleton on data presence instead, or a stale $0/empty state can flash.
  const loading = !data && isLoading
  const [ticks, setTicks] = useState({})

  const positions = useMemo(() => buildPositions(clusters, clerkUser?.id), [clusters, clerkUser?.id])
  const closedPositions = useMemo(() => buildClosedPositions(clusters, clerkUser?.id), [clusters, clerkUser?.id])

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
  // Looked up by an invested entry's cluster+layer to show what that position is worth right now
  // if it were bought out at the current layer price — "potential profit", next to what was paid.
  const positionsByKey = new Map(livePositions.map((position) => [position.key, position]))

  // Realized activity (layer transitions, cell payouts) is persisted server-side on the user's
  // transaction history (category: "investment") — this isn't a client-only computation, it's the
  // same record shown on /portfolio and in the admin cluster activity log.
  const investmentTransactions = useMemo(
    () => real.transactions.filter((tx) => tx.category === "investment").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [real.transactions]
  )

  // Money used to buy cells (debits) is capital moved into a position, not a loss — kept entirely
  // separate from realized profit (credits from cells being bought out), each with its own running
  // total. Both lists refresh automatically: the polling above keeps positions fresh, and
  // WalletProvider re-fetches transactions live whenever a balance-changing event fires.
  const investedEntries = useMemo(() => investmentTransactions.filter((tx) => tx.type === "debit"), [investmentTransactions])
  const profitEntries = useMemo(() => investmentTransactions.filter((tx) => tx.type === "credit"), [investmentTransactions])
  const totalInvested = investedEntries.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const totalProfit = profitEntries.reduce((sum, tx) => sum + (Number(tx.amount || 0) - Number(tx.costBasis || 0)), 0)

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
          label="PNL"
          value={`${totalProfit >= 0 ? "+" : ""}${formatCurrency(totalProfit)}`}
          icon={TrendingUp}
          accent={totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
        />
        <StatCard label="Equity" value={formatCurrency(equity)} icon={Wallet} accent="text-primary" />
      </div>

      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Open positions</p>
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <EmptyState compact icon={CandlestickChart} title="No open positions" />
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
                {livePositions.map((position) => {
                  const costBasis = position.entryPrice * position.cells
                  const pnlPercent = costBasis > 0 ? (position.liveProfit / costBasis) * 100 : 0
                  return (
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
                      <TableCell className={`text-right font-mono font-semibold ${pnlColorClass(pnlPercent)}`}>
                        {position.liveProfit >= 0 ? "+" : ""}
                        {formatCurrency(position.liveProfit)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(position.openedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Closed positions</p>
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {closedPositions.length === 0 ? (
            <EmptyState compact icon={CandlestickChart} title="No closed positions yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Layer</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Open price</TableHead>
                  <TableHead className="text-right">Close price</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedPositions.map((position) => {
                  return (
                    <TableRow key={position.key}>
                      <TableCell>
                        <Link href={`/market/${position.clusterId}`} className="font-medium text-foreground hover:text-primary">
                          {position.symbol}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{position.layer}</TableCell>
                      <TableCell className="text-right text-foreground">{position.cells}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(position.entryPrice)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{position.exitPrice === null ? "—" : formatCurrency(position.exitPrice)}</TableCell>
                      {/* Closed positions are settled — shown in a neutral light gray rather than
                          green/red, since they're no longer "live" gains/losses to react to. */}
                      <TableCell className="text-right font-semibold text-muted-foreground/70">
                        {position.gain === null ? "—" : `${position.gain >= 0 ? "+" : ""}${formatCurrency(position.gain)}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {position.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{position.closedAt ? new Date(position.closedAt).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Invested
            </p>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(totalInvested)}</p>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              {investedEntries.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={ArrowDownToLine} title="No investments yet" description="Money used to buy cells will show up here." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Potential profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investedEntries.map((tx, index) => {
                      // Still-open position from this same buy (cluster+layer): shown as a light,
                      // unrealized estimate — "—" once it's been sold or the cluster matured.
                      const openPosition = positionsByKey.get(`${tx.clusterId}-${tx.layer}`)
                      return (
                        <TableRow key={`${tx.createdAt}-${index}`}>
                          <TableCell className="text-foreground">{tx.clusterSymbol || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(tx.amount)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground/70">
                            {openPosition ? `${openPosition.liveProfit >= 0 ? "+" : ""}${formatCurrency(openPosition.liveProfit)}` : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <TrendingUp className="h-3.5 w-3.5" />
              Profit
            </p>
            <p className={`text-sm font-semibold ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {totalProfit >= 0 ? "+" : ""}
              {formatCurrency(totalProfit)}
            </p>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              {profitEntries.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={TrendingUp} title="No profit yet" description="Realized gains from cell payouts will show up here." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cluster</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Gain</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitEntries.map((tx, index) => {
                      const gain = Number(tx.amount || 0) - Number(tx.costBasis || 0)
                      return (
                        <TableRow key={`${tx.createdAt}-${index}`}>
                          <TableCell className="text-foreground">{tx.clusterSymbol || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            {gain >= 0 ? "+" : ""}
                            {formatCurrency(gain)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

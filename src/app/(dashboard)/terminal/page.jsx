"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR, { mutate as mutateGlobal } from "swr"
import { useUser, useAuth } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { CandlestickChart } from "@/components/candlestick-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/empty-state"
import { Award, CandlestickChart as CandlestickIcon, Layers3, Terminal as TerminalIcon } from "lucide-react"
import { fetchClusters, fetchBlocks, investInCluster, buyBlocks } from "@/lib/api-client"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/lib/toast-context"
import { cn } from "@/lib/utils"

function normalizeCluster(cluster) {
  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.expVolume ?? 0),
    cellValue: Number(cluster.entryPoint ?? 0),
    filledCells: Number(cluster.holderPoint ?? 0),
    currentLayer: Number(cluster.currentLayer ?? 1),
    maxLayers: Number(cluster.maxLayers ?? 1),
    layerStep: Number(cluster.layerStep ?? 0),
  })
  return { ...cluster, id: cluster._id, metrics }
}

// Purely a VISUAL price for the chart: progresses from the current layer's fixed entry price
// toward the next layer's fixed entry price as real cells get bought, reaching it exactly at
// 100% filled. This never feeds back into any real money calculation (cell price, system share,
// block price) — those always use the fixed schedule (entryPoint + (layer-1) * layerStep).
function buildCandles(cluster) {
  if (!cluster) return []
  const entryPoint = Number(cluster.entryPoint || 0)
  const layerStep = Number(cluster.layerStep || 0)
  const expVolume = Number(cluster.expVolume || 0)
  const investEntries = (cluster.activityLog || [])
    .filter((e) => e.type === "invest")
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const candles = []
  let trackedLayer = null
  let filled = 0
  let prevPrice = null

  for (const entry of investEntries) {
    const layer = Number(entry.layer || 1)
    if (layer !== trackedLayer) {
      trackedLayer = layer
      filled = 0
      if (prevPrice === null) prevPrice = entryPoint + (layer - 1) * layerStep
    }
    const layerBase = entryPoint + (trackedLayer - 1) * layerStep
    const nextBase = entryPoint + trackedLayer * layerStep
    filled += Number(entry.cells || 0)
    const ratio = expVolume > 0 ? Math.min(filled / expVolume, 1) : 0
    const newPrice = layerBase + (nextBase - layerBase) * ratio
    candles.push({
      time: entry.createdAt,
      open: prevPrice,
      close: newPrice,
      high: Math.max(prevPrice, newPrice),
      low: Math.min(prevPrice, newPrice),
      layer: trackedLayer,
    })
    prevPrice = newPrice
  }
  return candles
}

function lastActivityTime(cluster) {
  const log = cluster.activityLog || []
  if (log.length === 0) return new Date(cluster.createdAt || 0).getTime()
  return Math.max(...log.map((e) => new Date(e.createdAt).getTime()))
}

export default function TerminalPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { real, setBalance } = useWallet()
  const toast = useToast()

  const [selectedId, setSelectedId] = useState(null)
  const [tab, setTab] = useState("cells")
  const [cellQty, setCellQty] = useState("1")
  const [buying, setBuying] = useState(false)

  const { data, isLoading } = useSWR("clusters", fetchClusters, { revalidateOnFocus: true, refreshInterval: 4000 })
  const clusters = useMemo(() => {
    const list = Array.isArray(data?.data) ? data.data.filter((c) => c.status !== "offline") : []
    return list.map(normalizeCluster)
  }, [data])
  const loading = !data && isLoading

  const { data: blocksData } = useSWR("authorship-blocks", () => fetchBlocks(), { revalidateOnFocus: true, refreshInterval: 5000 })
  const blocks = useMemo(() => (Array.isArray(blocksData?.data) ? blocksData.data : []), [blocksData])

  // Default selection: the most recently active cluster, so the terminal opens on "where it's
  // happening" instead of an arbitrary/empty one. Only auto-picks once; the user's own click
  // always wins after that.
  useEffect(() => {
    if (selectedId || clusters.length === 0) return
    const mostActive = [...clusters].sort((a, b) => lastActivityTime(b) - lastActivityTime(a))[0]
    setSelectedId(mostActive.id)
  }, [clusters, selectedId])

  const selected = clusters.find((c) => c.id === selectedId) || null
  const candles = useMemo(() => buildCandles(selected), [selected])
  const clusterBlocks = useMemo(
    () => blocks.filter((b) => b.clusterId === selectedId && (b.status === "available" || (b.status === "sold" && b.listedForResale))),
    [blocks, selectedId]
  )

  const myCells = useMemo(
    () => (selected && clerkUser?.id ? (selected.cells || []).filter((c) => c.ownerClerkId === clerkUser.id) : []),
    [selected, clerkUser?.id]
  )
  const myCellsCost = myCells.reduce((sum, c) => sum + Number(c.acquiredPrice || 0), 0)
  const myBlocks = useMemo(
    () => (clerkUser?.id ? blocks.filter((b) => b.clusterId === selectedId && b.ownerClerkId === clerkUser.id) : []),
    [blocks, selectedId, clerkUser?.id]
  )

  async function handleBuyCells() {
    if (!selected) return
    const qty = Number(cellQty)
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Enter a valid number of cells.")
      return
    }
    if (!isSignedIn || !clerkUser?.id) {
      toast.error("You must be logged in to buy.")
      return
    }
    const total = qty * selected.metrics.currentCellPrice
    if (qty > selected.metrics.remainingCells) {
      toast.error(`Purchase impossible: only ${selected.metrics.remainingCells} cell(s) are available at this layer, you requested ${qty}.`)
      return
    }
    if (real.balance < total) {
      toast.error("Insufficient balance.")
      return
    }
    setBuying(true)
    try {
      const token = await getToken()
      const result = await investInCluster(selected.id, token, { cells: qty })
      toast.success(`Bought ${qty} cell(s) in ${selected.symbol}, layer ${selected.metrics.currentLayer}, for ${formatCurrency(total)}.`)
      if (result?.wallet?.balance !== undefined) setBalance("real", result.wallet.balance)
      setCellQty("1")
      mutateGlobal("clusters")
    } catch (err) {
      toast.error(err.message || "Purchase failed")
    } finally {
      setBuying(false)
    }
  }

  async function handleBuyBlock(block) {
    if (!isSignedIn || !clerkUser?.id) {
      toast.error("You must be logged in to buy.")
      return
    }
    const price = block.status === "sold" ? Number(block.resalePrice || 0) : block.originalPrice
    if (real.balance < price) {
      toast.error("Insufficient balance.")
      return
    }
    setBuying(true)
    try {
      const token = await getToken()
      const result = await buyBlocks(token, { blockIds: [block._id] })
      toast.success(`Acquired the layer ${block.layer} authorship block in ${block.clusterSymbol} for ${formatCurrency(price)}.`)
      if (result?.wallet?.balance !== undefined) setBalance("real", result.wallet.balance)
      mutateGlobal("authorship-blocks")
    } catch (err) {
      toast.error(err.message || "Purchase failed")
    } finally {
      setBuying(false)
    }
  }

  if (!isSignedIn) return <p>Please log in</p>

  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="h-96 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    )
  }

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Live market view"
        icon={TerminalIcon}
        title="Terminal"
        description="Every cluster, its live layer progress, and quick buy — cells or authorship blocks — in one screen."
      />

      {clusters.length === 0 ? (
        <EmptyState icon={Layers3} title="No clusters yet" description="Published clusters will show up here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_320px]">
          {/* Watchlist */}
          <div className="overflow-hidden rounded-xl border border-border">
            {clusters.map((cluster) => {
              const active = cluster.id === selectedId
              const layerBase = Number(cluster.entryPoint || 0) + (cluster.metrics.currentLayer - 1) * Number(cluster.layerStep || 0)
              const variation = layerBase > 0 ? ((cluster.metrics.currentCellPrice - layerBase) / layerBase) * 100 : 0
              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelectedId(cluster.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent",
                    active && "bg-primary/[0.08]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{cluster.symbol}</span>
                    <Badge variant={cluster.metrics.isClosed ? "outline" : "secondary"} className="text-[10px]">
                      L{cluster.metrics.currentLayer}/{cluster.metrics.maxLayers}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatCurrency(cluster.metrics.currentCellPrice)}</span>
                    <span className={variation > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                      {variation > 0 ? "▲" : "●"} {variation.toFixed(1)}%
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Center: chart + info */}
          <div className="space-y-4">
            {selected && (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{selected.name || selected.symbol}</h2>
                  <Badge variant={selected.metrics.isClosed ? "outline" : "secondary"} className="text-xs">
                    {selected.metrics.isClosed ? "Closed" : "Open"}
                  </Badge>
                  <Badge variant="outline" className="border-primary/30 text-xs text-primary">
                    Layer {selected.metrics.currentLayer} / {selected.metrics.maxLayers}
                  </Badge>
                </div>

                <Card className="border-border shadow-sm">
                  <CardContent className="p-3">
                    <CandlestickChart data={candles} height={260} />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {[
                    { label: "Layer price", value: formatCurrency(selected.metrics.currentCellPrice) },
                    { label: "Progress", value: `${selected.metrics.progress.toFixed(0)}%` },
                    { label: "Cells available", value: `${selected.metrics.remainingCells} / ${selected.expVolume}` },
                    { label: "Gross liquidity", value: formatCurrency(selected.metrics.brutLiquidity) },
                    { label: "Net liquidity", value: formatCurrency(selected.metrics.netLiquidity) },
                    { label: "System share (16%)", value: formatCurrency(selected.metrics.systemShare) },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-lg border border-border bg-muted/30 p-2.5">
                      <p className="text-[11px] text-muted-foreground">{tile.label}</p>
                      <p className="text-sm font-semibold text-foreground">{tile.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Order panel + positions */}
          <div className="space-y-4">
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <Tabs value={tab} onValueChange={setTab} className="mb-3">
                  <TabsList className="w-full">
                    <TabsTrigger value="cells" className="flex-1">
                      Cells
                    </TabsTrigger>
                    <TabsTrigger value="blocks" className="flex-1">
                      Blocks
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {!selected ? (
                  <p className="text-xs text-muted-foreground">Select a cluster from the watchlist.</p>
                ) : tab === "cells" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Price per cell: {formatCurrency(selected.metrics.currentCellPrice)}</p>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      max={selected.metrics.remainingCells}
                      value={cellQty}
                      onChange={(e) => setCellQty(e.target.value)}
                      disabled={selected.metrics.isClosed}
                    />
                    <p className="text-xs text-muted-foreground">Total: {formatCurrency((Number(cellQty) || 0) * selected.metrics.currentCellPrice)}</p>
                    <p className="text-xs text-muted-foreground">Balance: {formatCurrency(real.balance)}</p>
                    <Button className="w-full" onClick={handleBuyCells} disabled={buying || selected.metrics.isClosed}>
                      {selected.metrics.isClosed ? "Closed" : buying ? "Buying..." : "Buy cells"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Balance: {formatCurrency(real.balance)}</p>
                    {clusterBlocks.length === 0 ? (
                      <EmptyState compact icon={Award} title="No blocks for sale on this cluster" />
                    ) : (
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {clusterBlocks.map((block) => {
                          const isResale = block.status === "sold" && block.listedForResale
                          const price = isResale ? Number(block.resalePrice || 0) : block.originalPrice
                          return (
                            <div key={block._id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                              <div>
                                <p className="text-xs font-medium text-foreground">Layer {block.layer}</p>
                                <p className="text-[11px] text-muted-foreground">Pays {formatCurrency(block.expectedShareAmount)}</p>
                              </div>
                              <Button size="sm" variant="outline" disabled={buying} onClick={() => handleBuyBlock(block)}>
                                {formatCurrency(price)}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">My positions (this cluster)</p>
                {!selected || (myCells.length === 0 && myBlocks.length === 0) ? (
                  <EmptyState compact icon={CandlestickIcon} title="No positions yet on this cluster" />
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                      <span className="text-muted-foreground">Cells held</span>
                      <span className="font-medium text-foreground">
                        {myCells.length} ({formatCurrency(myCellsCost)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                      <span className="text-muted-foreground">Blocks held</span>
                      <span className="font-medium text-foreground">{myBlocks.length}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Link href="/trade" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Full Trade view
                        </Button>
                      </Link>
                      <Link href="/authorship-market" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Block market
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

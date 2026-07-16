"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, TrendingUp, TrendingDown, Wallet, CircleDollarSign, Sparkles } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusters as fetchClustersApi, investInCluster } from "@/lib/api-client"

const demoClusters = [
  {
    id: "cluster-alpha",
    symbol: "TRI-01",
    name: "Alpha Cluster",
    cellCount: 10,
    cellValue: 1000,
    filledCells: 4,
    creator: "triomac60",
    description: "Early-stage growth cluster with strong momentum.",
  },
  {
    id: "cluster-beta",
    symbol: "TRI-02",
    name: "Beta Cluster",
    cellCount: 8,
    cellValue: 1500,
    filledCells: 8,
    creator: "triomac60",
    description: "Fully subscribed and now closed for new investors.",
  },
  {
    id: "cluster-gamma",
    symbol: "TRI-03",
    name: "Gamma Cluster",
    cellCount: 12,
    cellValue: 800,
    filledCells: 7,
    creator: "triomac60",
    description: "New cluster opening with attractive room for funding.",
  },
]

function getClusterId(cluster, index) {
  return cluster.id ?? cluster._id ?? cluster.signature ?? `cluster-${index + 1}`
}

function normalizeCluster(cluster, index) {
  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume ?? 10),
    cellValue: Number(cluster.cellValue ?? cluster.valuePerCell ?? cluster.entryPoint ?? cluster.recette ?? 1000),
    filledCells: Number(cluster.filledCells ?? cluster.filled ?? cluster.holderPoint ?? cluster.actualVolume ?? 0),
  })

  return {
    id: getClusterId(cluster, index),
    symbol: cluster.symbol ?? `TRI-${String(index + 1).padStart(2, "0")}`,
    name: cluster.name ?? `Cluster ${index + 1}`,
    cellCount: Number(cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume ?? 10),
    cellValue: Number(cluster.cellValue ?? cluster.valuePerCell ?? cluster.entryPoint ?? cluster.recette ?? 1000),
    filledCells: Number(cluster.filledCells ?? cluster.filled ?? cluster.holderPoint ?? cluster.actualVolume ?? 0),
    creator: cluster.creator ?? "triomac60",
    description: cluster.description ?? "Cluster ready for investment.",
    status: cluster.status ?? (metrics.isClosed ? "Closed" : "Open"),
    metrics,
  }
}

export default function MarketPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const router = useRouter()
  const [clusters, setClusters] = useState(demoClusters)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClusterId, setSelectedClusterId] = useState(demoClusters[0].id)
  const [fundCells, setFundCells] = useState("1")
  const [feedback, setFeedback] = useState("")
  const [investing, setInvesting] = useState(false)
  const [investError, setInvestError] = useState("")

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) {
      setLoading(false)
      return
    }

    let isActive = true

    async function fetchClusters() {
      try {
        const data = await fetchClustersApi()

        const remoteClusters = Array.isArray(data?.data)
          ? data.data.map((cluster, index) => normalizeCluster(cluster, index))
          : []

        if (isActive) {
          setClusters(remoteClusters.length > 0 ? remoteClusters : demoClusters)
        }
      } catch (err) {
        console.error(err)
        if (isActive) {
          setClusters(demoClusters)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchClusters()

    return () => {
      isActive = false
    }
  }, [clerkUser, isSignedIn])

  useEffect(() => {
    if (!clusters.length) return

    const exists = clusters.some((cluster) => getClusterId(cluster, 0) === selectedClusterId)
    if (!exists) {
      setSelectedClusterId(getClusterId(clusters[0], 0))
    }
  }, [clusters, selectedClusterId])

  if (!isSignedIn) return <p>Please log in</p>
  if (loading) return <p>Loading...</p>

  const filteredClusters = clusters.filter((cluster) => {
    const haystack = `${cluster.name} ${cluster.symbol} ${cluster.creator} ${cluster.description}`.toLowerCase()
    return haystack.includes(searchTerm.toLowerCase())
  })

  const selectedCluster =
    filteredClusters.find((cluster) => getClusterId(cluster, 0) === selectedClusterId) ??
    clusters.find((cluster) => getClusterId(cluster, 0) === selectedClusterId) ??
    clusters[0] ??
    demoClusters[0]

  const selectedMetrics = selectedCluster?.metrics ?? calculateClusterMetrics({ cellCount: 10, cellValue: 1000, filledCells: 4 })
  const openClusters = clusters.filter((cluster) => !cluster.metrics?.isClosed).length
  const closedClusters = clusters.length - openClusters

  const handleFundCell = async () => {
    const cells = Number(fundCells)

    if (!selectedCluster || !Number.isInteger(cells) || cells <= 0) {
      setInvestError("Enter a valid number of cells.")
      return
    }

    if (cells > selectedCluster.metrics.remainingCells) {
      setInvestError(`Only ${selectedCluster.metrics.remainingCells} cell(s) remaining.`)
      return
    }

    if (!clerkUser?.id) {
      setInvestError("You must be logged in to invest.")
      return
    }

    setInvesting(true)
    setInvestError("")
    setFeedback("")

    try {
      const result = await investInCluster(selectedCluster.id, {
        clerkId: clerkUser.id,
        cells,
      })

      const updatedCluster = normalizeCluster(result?.data || {}, 0)
      setClusters((prev) =>
        prev.map((cluster) => (cluster.id === selectedCluster.id ? { ...updatedCluster, id: selectedCluster.id } : cluster))
      )
      setFeedback(`Invested ${formatCurrency(cells * selectedCluster.cellValue)} in ${selectedCluster.name}.`)
      setFundCells("1")
      window.dispatchEvent(new CustomEvent("wallet-balance-updated", { detail: { balance: result?.wallet?.balance } }))
    } catch (err) {
      setInvestError(err.message || "Investment failed")
    } finally {
      setInvesting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 bgmain">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>triomac60 cluster investment</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Cluster Market</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each cluster is made of cells. Investors fund one or more cells until the full cluster is filled, then it closes.
          </p>
        </div>
        <Button onClick={() => router.push("/market/create")}>Create a cluster</Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/20 p-2">
                <CircleDollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total clusters</p>
                <p className="text-xl font-bold">{clusters.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/20 p-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Open clusters</p>
                <p className="text-xl font-bold">{openClusters}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/20 p-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Closed clusters</p>
                <p className="text-xl font-bold">{closedClusters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Available clusters</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search a cluster"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredClusters.length === 0 && (
                <p className="text-sm text-muted-foreground">No cluster matches your search.</p>
              )}

              {filteredClusters.map((cluster) => {
                const metrics = cluster.metrics ?? calculateClusterMetrics({ cellCount: 10, cellValue: 1000, filledCells: 4 })
                const clusterKey = getClusterId(cluster, 0)
                const isSelected = clusterKey === selectedClusterId

                return (
                  <button
                    key={clusterKey}
                    onClick={() => setSelectedClusterId(clusterKey)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${isSelected ? "border-primary bg-primary/10" : "border-border/50 bg-background/50 hover:bg-accent"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{cluster.name}</p>
                          <Badge variant={metrics.isClosed ? "outline" : "secondary"} className="text-xs">
                            {metrics.isClosed ? "Closed" : "Open"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cluster.symbol} • {cluster.creator}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(metrics.brutLiquidity)}</p>
                        <p className="text-xs text-muted-foreground">Net {formatCurrency(metrics.netLiquidity)}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${metrics.progress}%` }} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{metrics.remainingCells} cells left</span>
                      <span>{cluster.cellCount} total cells</span>
                      <span>{formatCurrency(cluster.cellValue)} per cell</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/market/${getClusterId(cluster, 0)}`)}>
                        View details
                      </Button>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">{selectedCluster?.name}</CardTitle>
                    <Badge variant={selectedMetrics.isClosed ? "outline" : "secondary"}>
                      {selectedMetrics.isClosed ? "Closed" : "Open"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedCluster?.symbol} • {selectedCluster?.creator}</p>
                </div>
                <div className="rounded-full bg-primary/20 p-2">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedCluster?.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">Gross liquidity</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedMetrics.brutLiquidity)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">System share</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedMetrics.systemShare)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">Net liquidity</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedMetrics.netLiquidity)}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">Remaining cells</p>
                  <p className="text-lg font-semibold">{selectedMetrics.remainingCells}</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{selectedMetrics.progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${selectedMetrics.progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Fund a cell</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(selectedCluster.cellValue)} per cell &middot; {selectedCluster.metrics.remainingCells} remaining
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                min="1"
                step="1"
                max={selectedCluster.metrics.remainingCells}
                value={fundCells}
                onChange={(e) => setFundCells(e.target.value)}
                placeholder="Number of cells"
                disabled={selectedCluster.metrics.isClosed}
              />
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency((Number(fundCells) || 0) * selectedCluster.cellValue)}
              </p>
              <Button
                className="w-full"
                onClick={handleFundCell}
                disabled={investing || selectedCluster.metrics.isClosed}
              >
                {selectedCluster.metrics.isClosed ? "Cluster closed" : investing ? "Investing..." : "Fund this cluster"}
              </Button>
              {investError && <p className="text-sm text-destructive">{investError}</p>}
              {feedback && <p className="text-sm text-primary">{feedback}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

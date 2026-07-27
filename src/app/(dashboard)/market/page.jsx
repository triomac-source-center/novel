"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CircleDollarSign, Layers3, PlusCircle, Search, TrendingDown, TrendingUp } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusters as fetchClustersApi } from "@/lib/api-client"

const demoClusters = [
  { id: "cluster-alpha", symbol: "TRI-01", name: "Alpha Cluster", cellCount: 10, cellValue: 1000, currentLayer: 1, maxLayers: 4, layerStep: 100, filledCells: 4, creator: "triomac60", description: "Early-stage growth cluster with strong momentum." },
  { id: "cluster-beta", symbol: "TRI-02", name: "Beta Cluster", cellCount: 8, cellValue: 1500, currentLayer: 3, maxLayers: 3, layerStep: 150, filledCells: 8, creator: "triomac60", description: "Fully subscribed and now closed for new investors." },
  { id: "cluster-gamma", symbol: "TRI-03", name: "Gamma Cluster", cellCount: 12, cellValue: 800, currentLayer: 2, maxLayers: 5, layerStep: 80, filledCells: 7, creator: "triomac60", description: "New cluster opening with attractive room for funding." },
]

function getClusterId(cluster, index) {
  return cluster.id ?? cluster._id ?? cluster.signature ?? `cluster-${index + 1}`
}

function normalizeCluster(cluster, index) {
  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume ?? 10),
    cellValue: Number(cluster.cellValue ?? cluster.valuePerCell ?? cluster.entryPoint ?? cluster.recette ?? 1000),
    filledCells: Number(cluster.filledCells ?? cluster.filled ?? cluster.holderPoint ?? cluster.actualVolume ?? 0),
    currentLayer: Number(cluster.currentLayer ?? cluster.layer ?? 1),
    maxLayers: Number(cluster.maxLayers ?? cluster.layers ?? 1),
    layerStep: Number(cluster.layerStep ?? cluster.layerIncrement ?? cluster.increment ?? 0),
  })

  return {
    id: getClusterId(cluster, index),
    symbol: cluster.symbol ?? `TRI-${String(index + 1).padStart(2, "0")}`,
    name: cluster.name ?? `Cluster ${index + 1}`,
    creator: cluster.creator ?? "triomac60",
    description: cluster.description ?? "Cluster ready for investment.",
    status: cluster.status ?? (metrics.isClosed ? "closed" : "online"),
    metrics,
  }
}

export default function MarketPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const router = useRouter()
  const isAdmin = clerkUser?.publicMetadata?.role === "admin" || clerkUser?.id === process.env.NEXT_PUBLIC_TRIOMAC60_ADMIN_CLERK_ID
  const [clusters, setClusters] = useState(() => demoClusters.map(normalizeCluster))
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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
          ? data.data
              .filter((cluster) => cluster.status !== "offline")
              .map((cluster, index) => normalizeCluster(cluster, index))
          : []

        if (isActive) setClusters(remoteClusters.length > 0 ? remoteClusters : demoClusters.map(normalizeCluster))
      } catch (err) {
        console.error(err)
        if (isActive) setClusters(demoClusters.map(normalizeCluster))
      } finally {
        if (isActive) setLoading(false)
      }
    }

    fetchClusters()
    return () => {
      isActive = false
    }
  }, [clerkUser, isSignedIn])

  if (!isSignedIn) return <p>Please log in</p>
  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-48 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      </div>
    )
  }

  const filteredClusters = clusters.filter((cluster) => {
    const haystack = `${cluster.name} ${cluster.symbol} ${cluster.creator} ${cluster.description}`.toLowerCase()
    return haystack.includes(searchTerm.toLowerCase())
  })

  const openClusters = clusters.filter((cluster) => !cluster.metrics?.isClosed).length
  const closedClusters = clusters.length - openClusters

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="triomac60 cluster investment"
        icon={Layers3}
        title="Cluster market"
        description="Buy one or more cells at the active layer price. A completed layer opens the next one."
        actions={isAdmin && (
          <Button onClick={() => router.push("/admin/clusters/new")}>
            <PlusCircle className="h-4 w-4" />
            Create a cluster
          </Button>
        )}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total clusters" value={clusters.length} icon={CircleDollarSign} />
        <StatCard label="Open clusters" value={openClusters} icon={TrendingUp} accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Closed clusters" value={closedClusters} icon={TrendingDown} accent="text-muted-foreground" />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search a cluster" className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {filteredClusters.length === 0 ? (
        <EmptyState icon={Search} title="No cluster matches your search" description="Try a different name or symbol." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClusters.map((cluster) => {
            const metrics = cluster.metrics
            const clusterKey = getClusterId(cluster, 0)

            return (
              <Link key={clusterKey} href={`/market/${clusterKey}`}>
                <Card className="h-full border-border shadow-sm transition-colors hover:border-primary/40">
                  <CardContent className="pt-6">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{cluster.name}</p>
                        <p className="text-xs text-muted-foreground">{cluster.symbol} • {cluster.creator}</p>
                      </div>
                      <Badge variant={metrics.isClosed ? "outline" : "secondary"} className="shrink-0 text-xs">
                        {metrics.isClosed ? "Closed" : "Open"}
                      </Badge>
                    </div>

                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{cluster.description}</p>

                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entry per cell</span>
                      <span className="font-semibold text-foreground">{formatCurrency(metrics.currentCellPrice)}</span>
                    </div>

                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${metrics.progress}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{metrics.remainingCells} cells left</span>
                      <span>layer {metrics.currentLayer}/{metrics.maxLayers}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

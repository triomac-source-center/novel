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
import { Input } from "@/components/ui/input"
import { CircleDollarSign, Layers3, PlusCircle, Search, TrendingDown, TrendingUp } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusters as fetchClustersApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"

const CLUSTER_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-400" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  { bg: "bg-amber-500/15", text: "text-amber-400" },
  { bg: "bg-purple-500/15", text: "text-purple-400" },
  { bg: "bg-pink-500/15", text: "text-pink-400" },
  { bg: "bg-cyan-500/15", text: "text-cyan-400" },
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
  const [clusters, setClusters] = useState([])
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

        if (isActive) setClusters(remoteClusters)
      } catch (err) {
        console.error(err)
        if (isActive) setClusters([])
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

      {clusters.length === 0 ? (
        <EmptyState icon={Layers3} title="No clusters yet" description="Published clusters will show up here." />
      ) : filteredClusters.length === 0 ? (
        <EmptyState icon={Search} title="No cluster matches your search" description="Try a different name or symbol." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {filteredClusters.map((cluster, index) => {
            const metrics = cluster.metrics
            const clusterKey = getClusterId(cluster, 0)
            const isClosed = metrics.isClosed
            const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length]

            return (
              <Link
                key={clusterKey}
                href={`/market/${clusterKey}`}
                className={cn(
                  "flex items-center gap-3 border-b border-border bg-card px-4 py-3 transition-colors last:border-b-0 hover:bg-accent",
                  isClosed && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                    isClosed ? "bg-muted text-muted-foreground" : `${color.bg} ${color.text}`
                  )}
                >
                  {cluster.symbol.slice(0, 2)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", isClosed ? "text-muted-foreground" : "text-foreground")}>{cluster.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{cluster.symbol} • {cluster.creator}</p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className={cn("text-sm font-semibold", isClosed ? "text-muted-foreground" : "text-foreground")}>{formatCurrency(metrics.currentCellPrice)}</p>
                  <p className="text-xs text-muted-foreground">{metrics.remainingCells} left • layer {metrics.currentLayer}/{metrics.maxLayers}</p>
                </div>

                <Badge variant={isClosed ? "outline" : "secondary"} className="shrink-0 text-xs">
                  {isClosed ? "Closed" : "Open"}
                </Badge>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CircleDollarSign, FileClock, Layers3, PlusCircle, Radio, XCircle } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusters } from "@/lib/api-client"

function normalizeStatus(cluster) {
  return cluster.status ?? "offline"
}

export default function AdminOverviewPage() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function load() {
      try {
        const data = await fetchClusters()
        const payload = Array.isArray(data?.data) ? data.data : []
        if (isActive) setClusters(payload)
      } catch (err) {
        console.error(err)
        if (isActive) setClusters([])
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-muted/30" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      </div>
    )
  }

  const drafts = clusters.filter((c) => normalizeStatus(c) === "offline")
  const online = clusters.filter((c) => normalizeStatus(c) === "online")
  const closed = clusters.filter((c) => normalizeStatus(c) === "closed")

  const netLiquidity = online.reduce((sum, cluster) => {
    const metrics = calculateClusterMetrics({
      cellCount: Number(cluster.expVolume ?? 0),
      cellValue: Number(cluster.entryPoint ?? 0),
    })
    return sum + metrics.netLiquidity
  }, 0)

  const recentDrafts = drafts.slice(0, 5)

  return (
    <div>
      <PageHeader
        eyebrow="Admin overview"
        icon={Layers3}
        title="Cluster operations"
        description="Create, publish and monitor every cluster in the system."
        actions={
          <Link href="/admin/clusters/new">
            <Button>
              <PlusCircle className="h-4 w-4" />
              New cluster
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clusters" value={clusters.length} icon={Layers3} />
        <StatCard label="Drafts" value={drafts.length} icon={FileClock} accent="text-amber-600 dark:text-amber-400" description="Not yet published" />
        <StatCard label="Live" value={online.length} icon={Radio} accent="text-emerald-600 dark:text-emerald-400" description="Open for investment" />
        <StatCard label="Closed" value={closed.length} icon={XCircle} accent="text-muted-foreground" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Live net liquidity
            </CardTitle>
            <CardDescription>Sum of net liquidity across published clusters</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{formatCurrency(netLiquidity)}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Drafts awaiting publish
            </CardTitle>
            <CardDescription>Created but not yet visible to investors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending drafts.</p>
            ) : (
              recentDrafts.map((cluster) => (
                <div key={cluster._id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{cluster.name || cluster.symbol}</span>
                  <Badge variant="outline" className="text-xs">Draft</Badge>
                </div>
              ))
            )}
            <Link href="/admin/clusters" className="mt-2 block text-sm text-primary hover:underline">
              Manage all clusters →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

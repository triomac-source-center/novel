"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, History, Layers3 } from "lucide-react"
import { fetchClusterById, fetchUsersByClerkIds } from "@/lib/api-client"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"

const STATUS_META = {
  offline: { label: "Draft", variant: "outline" },
  online: { label: "Live", variant: "default" },
  closed: { label: "Closed", variant: "secondary" },
}

const ACTIVITY_LABEL = {
  created: "Cluster created",
  published: "Cluster published",
  closed: "Cluster closed",
  invest: "Cells purchased",
  transfer: "Cell payout",
  layer_advance: "Layer advanced",
}

function displayName(clerkId, usersById) {
  if (!clerkId) return "—"
  const user = usersById[clerkId]
  if (!user) return clerkId
  if (user.username) return user.username
  if (user.firstName || user.lastName) return [user.firstName, user.lastName].filter(Boolean).join(" ")
  return clerkId
}

export default function AdminClusterActivityPage() {
  const params = useParams()
  const id = params?.id

  const [cluster, setCluster] = useState(null)
  const [usersById, setUsersById] = useState({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let isActive = true

    async function load() {
      try {
        setLoading(true)
        setNotFound(false)
        const data = await fetchClusterById(id)
        if (isActive && data?.data) setCluster(data.data)
        else if (isActive) setNotFound(true)
      } catch (err) {
        console.error(err)
        if (isActive) setNotFound(true)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [id])

  useEffect(() => {
    if (!cluster) return
    let isActive = true

    async function loadUsers() {
      try {
        const ids = new Set()
        for (const entry of cluster.activityLog || []) {
          if (entry.clerkId) ids.add(entry.clerkId)
          if (entry.counterpartyClerkId) ids.add(entry.counterpartyClerkId)
        }
        for (const holder of cluster.holders || []) if (holder.clerkId) ids.add(holder.clerkId)
        const result = await fetchUsersByClerkIds([...ids])
        if (!isActive) return
        const map = {}
        for (const user of result?.data || []) map[user.clerkId] = user
        setUsersById(map)
      } catch (err) {
        console.error(err)
      }
    }

    loadUsers()
    return () => {
      isActive = false
    }
  }, [cluster])

  const timeline = useMemo(() => {
    if (!cluster) return []
    return [...(cluster.activityLog || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [cluster])

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
  }
  if (notFound || !cluster) {
    return <EmptyState title="Cluster not found" description="This cluster doesn't exist or was removed." />
  }

  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.expVolume ?? 0),
    cellValue: Number(cluster.entryPoint ?? 0),
    filledCells: Number(cluster.holderPoint ?? 0),
    currentLayer: Number(cluster.currentLayer ?? 1),
    maxLayers: Number(cluster.maxLayers ?? 1),
    layerStep: Number(cluster.layerStep ?? 0),
  })
  const status = cluster.status ?? "offline"
  const statusMeta = STATUS_META[status] ?? STATUS_META.offline

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/clusters">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{cluster.name || cluster.symbol}</h1>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Layer {metrics.currentLayer} / {metrics.maxLayers}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{cluster.symbol} • full activity log</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Gross liquidity</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(metrics.brutLiquidity)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Net liquidity</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(metrics.netLiquidity)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Cells filled</p>
            <p className="text-lg font-semibold text-foreground">{cluster.holderPoint ?? 0} / {cluster.expVolume ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Entry per cell</p>
            <p className="text-lg font-semibold text-primary">{formatCurrency(metrics.currentCellPrice)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" />
            Current holders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(cluster.holders) && cluster.holders.length > 0 ? (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Cells</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cluster.holders.map((holder, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-foreground">{displayName(holder.clerkId, usersById)}</TableCell>
                      <TableCell className="text-right text-foreground">{holder.cells}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(holder.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No current-layer holders" description="Holders reset at the start of each new layer." />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Full activity log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Every purchase, payout and layer transition will show up here." />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead className="text-right">Cells</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Gain</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeline.map((entry, index) => {
                    const gain = entry.type === "transfer" ? Number(entry.amount || 0) - Number(entry.costBasis || 0) : null
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ACTIVITY_LABEL[entry.type] || entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">{displayName(entry.clerkId, usersById)}</TableCell>
                        <TableCell className="text-muted-foreground">{displayName(entry.counterpartyClerkId, usersById)}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.layer ?? "—"}</TableCell>
                        <TableCell className="text-right text-foreground">{entry.cells || "—"}</TableCell>
                        <TableCell className="text-right text-foreground">{entry.amount ? formatCurrency(entry.amount) : "—"}</TableCell>
                        <TableCell className={`text-right ${gain === null ? "text-muted-foreground" : gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {gain === null ? "—" : formatCurrency(gain)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

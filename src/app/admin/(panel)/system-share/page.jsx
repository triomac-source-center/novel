"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CircleDollarSign, Layers3, PiggyBank, Receipt } from "lucide-react"
import { fetchClusters } from "@/lib/api-client"
import { formatCurrency } from "@/lib/cluster-utils"

export default function AdminSystemSharePage() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function load() {
      try {
        const data = await fetchClusters()
        if (isActive) setClusters(Array.isArray(data?.data) ? data.data : [])
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

  const totalSystemShare = clusters.reduce((sum, cluster) => sum + Number(cluster.systemReserve || 0), 0)
  const contributingClusters = clusters.filter((cluster) => Number(cluster.systemReserve || 0) > 0).length

  const entries = useMemo(() => {
    const rows = []
    for (const cluster of clusters) {
      for (const entry of cluster.activityLog || []) {
        if (entry.type !== "system_fee") continue
        rows.push({
          key: `${cluster._id}-${entry.createdAt}-${entry.layer}`,
          clusterId: cluster._id,
          symbol: cluster.symbol,
          layer: entry.layer,
          cells: entry.cells,
          amount: Number(entry.amount || 0),
          createdAt: entry.createdAt,
        })
      }
    }
    return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [clusters])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl border border-border bg-muted/30" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="System revenue"
        icon={PiggyBank}
        title="System share"
        description="16% is taken on every layer of every cluster — this is where it accumulates."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total system share" value={formatCurrency(totalSystemShare)} icon={CircleDollarSign} accent="text-primary" />
        <StatCard label="Contributing clusters" value={contributingClusters} icon={Layers3} description={`of ${clusters.length} total`} />
        <StatCard label="Fee entries" value={entries.length} icon={Receipt} />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Per-cluster balance</CardTitle>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <EmptyState icon={Layers3} title="No clusters yet" description="System share accumulates as clusters are traded." />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead className="text-right">System share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clusters
                    .slice()
                    .sort((a, b) => Number(b.systemReserve || 0) - Number(a.systemReserve || 0))
                    .map((cluster) => (
                      <TableRow key={cluster._id}>
                        <TableCell>
                          <Link href={`/admin/clusters/${cluster._id}`} className="font-medium text-foreground hover:text-primary">
                            {cluster.name || cluster.symbol}
                          </Link>
                          <p className="text-xs text-muted-foreground">{cluster.symbol}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cluster.currentLayer} / {cluster.maxLayers}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{formatCurrency(cluster.systemReserve || 0)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <CardTitle>Fee entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState icon={Receipt} title="No fee entries yet" description="Every purchase across every layer logs an entry here." />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead className="text-right">Cells</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell>
                        <Link href={`/admin/clusters/${entry.clusterId}`} className="font-medium text-foreground hover:text-primary">
                          {entry.symbol}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{entry.layer}</TableCell>
                      <TableCell className="text-right text-foreground">{entry.cells}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

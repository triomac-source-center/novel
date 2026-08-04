"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Award, CircleDollarSign, Clock3, Layers3, PackageCheck } from "lucide-react"
import { fetchBlocks } from "@/lib/api-client"
import { formatCurrency } from "@/lib/cluster-utils"

const STATUS_META = {
  available: { label: "Available", variant: "secondary" },
  sold: { label: "In circulation", variant: "outline" },
  paid_out: { label: "Paid out", variant: "outline" },
}

export default function AdminAuthorshipBlocksPage() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function load() {
      try {
        const data = await fetchBlocks({ all: true })
        if (isActive) setBlocks(Array.isArray(data?.data) ? data.data : [])
      } catch (err) {
        console.error(err)
        if (isActive) setBlocks([])
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [])

  // System revenue from block sales = the ORIGINAL (first, from-system) sale price of every block
  // that's ever been sold at least once — resales afterward are peer-to-peer and don't count here.
  const totalBlockRevenue = useMemo(
    () => blocks.filter((block) => block.status !== "available").reduce((sum, block) => sum + Number(block.originalPrice || 0), 0),
    [blocks]
  )
  const soldCount = blocks.filter((block) => block.status !== "available").length
  const availableCount = blocks.filter((block) => block.status === "available").length
  const circulatingCount = blocks.filter((block) => block.status === "sold").length

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
        eyebrow="Pre-sold future revenue"
        icon={Award}
        title="Authorship blocks"
        description="One block per cluster layer, sold at half its expected 16% system share — this is where that revenue and its future payouts are tracked."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="System revenue from sales" value={formatCurrency(totalBlockRevenue)} icon={CircleDollarSign} accent="text-primary" />
        <StatCard label="Total blocks" value={blocks.length} icon={Layers3} />
        <StatCard label="Sold" value={soldCount} icon={PackageCheck} />
        <StatCard label="Available" value={availableCount} icon={Award} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-1">
        <StatCard
          label="In circulation (sold, layer not yet reached)"
          value={circulatingCount}
          icon={Clock3}
          accent="text-amber-600 dark:text-amber-400"
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>All blocks</CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <EmptyState icon={Award} title="No blocks yet" description="Blocks are created automatically when a cluster is created." />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead className="text-right">Expected share</TableHead>
                    <TableHead className="text-right">Sale price</TableHead>
                    <TableHead className="text-right">Paid out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks
                    .slice()
                    .sort((a, b) => a.clusterSymbol.localeCompare(b.clusterSymbol) || a.layer - b.layer)
                    .map((block) => {
                      const statusMeta = STATUS_META[block.status] ?? STATUS_META.available
                      return (
                        <TableRow key={block._id}>
                          <TableCell>
                            <Link href={`/admin/clusters/${block.clusterId}`} className="font-medium text-foreground hover:text-primary">
                              {block.clusterSymbol}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{block.layer}</TableCell>
                          <TableCell className="text-right text-foreground">{formatCurrency(block.expectedShareAmount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(block.originalPrice)}</TableCell>
                          <TableCell className="text-right font-semibold text-foreground">{formatCurrency(block.paidOutAmount || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={statusMeta.variant} className="text-xs">
                              {statusMeta.label}
                            </Badge>
                          </TableCell>
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

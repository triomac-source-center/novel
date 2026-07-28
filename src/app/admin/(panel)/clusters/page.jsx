"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Layers3, PlusCircle, Radio, XCircle } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusters, publishCluster, closeCluster } from "@/lib/api-client"
import { getAdminAccessCode } from "@/lib/admin"

const STATUS_LABEL = {
  offline: { label: "Draft", variant: "outline" },
  online: { label: "Live", variant: "default" },
  closed: { label: "Closed", variant: "secondary" },
}

export default function AdminClustersPage() {
  const { user: clerkUser } = useUser()
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionTarget, setActionTarget] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  const loadClusters = async () => {
    try {
      setLoading(true)
      const data = await fetchClusters()
      const payload = Array.isArray(data?.data) ? data.data : []
      setClusters(payload)
    } catch (err) {
      console.error(err)
      setClusters([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClusters()
  }, [])

  const handleConfirm = async () => {
    if (!actionTarget || !clerkUser?.id) return
    setProcessing(true)
    setError("")

    try {
      const payload = { clerkId: clerkUser.id, adminCode: getAdminAccessCode() }
      if (actionTarget.type === "publish") {
        await publishCluster(actionTarget.cluster._id, payload)
      } else {
        await closeCluster(actionTarget.cluster._id, payload)
      }
      setActionTarget(null)
      await loadClusters()
    } catch (err) {
      setError(err.message || "Action failed")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cluster management"
        icon={Layers3}
        title="All clusters"
        description="Publish drafts to open them for investment, or close a cluster manually."
        actions={
          <Link href="/admin/clusters/new">
            <Button>
              <PlusCircle className="h-4 w-4" />
              New cluster
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      ) : clusters.length === 0 ? (
        <EmptyState
          icon={Layers3}
          title="No clusters yet"
          description="Create your first cluster to get started."
          action={
            <Link href="/admin/clusters/new">
              <Button size="sm">Create a cluster</Button>
            </Link>
          }
        />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Layer</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Net liquidity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clusters.map((cluster) => {
                const metrics = calculateClusterMetrics({
                  cellCount: Number(cluster.expVolume ?? 0),
                  cellValue: Number(cluster.entryPoint ?? 0),
                  filledCells: Number(cluster.holderPoint ?? 0),
                  currentLayer: Number(cluster.currentLayer ?? 1),
                  maxLayers: Number(cluster.maxLayers ?? 1),
                  layerStep: Number(cluster.layerStep ?? 0),
                })
                const status = cluster.status ?? "offline"
                const statusMeta = STATUS_LABEL[status] ?? STATUS_LABEL.offline

                return (
                  <TableRow key={cluster._id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{cluster.name || cluster.symbol}</p>
                      <p className="text-xs text-muted-foreground">{cluster.symbol}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMeta.variant} className="text-xs">
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {metrics.currentLayer} / {metrics.maxLayers}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{metrics.progress.toFixed(0)}%</TableCell>
                    <TableCell className="text-sm text-foreground">{formatCurrency(metrics.netLiquidity)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link href={`/market/${cluster._id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {status === "offline" && (
                          <Button size="sm" onClick={() => setActionTarget({ cluster, type: "publish" })}>
                            <Radio className="h-3.5 w-3.5" />
                            Publish
                          </Button>
                        )}
                        {status !== "closed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setActionTarget({ cluster, type: "close" })}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.type === "publish" ? "Publish this cluster?" : "Close this cluster?"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.type === "publish"
                ? `${actionTarget?.cluster?.name || actionTarget?.cluster?.symbol} will become visible and open for investment on the market.`
                : `${actionTarget?.cluster?.name || actionTarget?.cluster?.symbol} will be closed immediately, regardless of its current layer progress. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              variant={actionTarget?.type === "close" ? "destructive" : "default"}
            >
              {processing ? "Working..." : actionTarget?.type === "publish" ? "Publish" : "Close cluster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

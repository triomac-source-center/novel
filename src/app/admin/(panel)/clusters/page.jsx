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
import { AlertTriangle, Layers3, PlusCircle, Radio, Trash2, XCircle } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusters, publishCluster, closeCluster, deleteCluster, deleteAllClusters, resetAllData } from "@/lib/api-client"
import { getAdminAccessCode } from "@/lib/admin"
import { useToast } from "@/lib/toast-context"

const STATUS_LABEL = {
  offline: { label: "Draft", variant: "outline" },
  online: { label: "Live", variant: "default" },
  closed: { label: "Closed", variant: "secondary" },
}

export default function AdminClustersPage() {
  const { user: clerkUser } = useUser()
  const toast = useToast()
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionTarget, setActionTarget] = useState(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [resetAllOpen, setResetAllOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

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

    try {
      const payload = { clerkId: clerkUser.id, adminCode: getAdminAccessCode() }
      if (actionTarget.type === "publish") {
        await publishCluster(actionTarget.cluster._id, payload)
        toast.success(`${actionTarget.cluster.name || actionTarget.cluster.symbol} published.`)
      } else if (actionTarget.type === "close") {
        await closeCluster(actionTarget.cluster._id, payload)
        toast.success(`${actionTarget.cluster.name || actionTarget.cluster.symbol} closed.`)
      } else {
        await deleteCluster(actionTarget.cluster._id, payload)
        toast.success(`${actionTarget.cluster.name || actionTarget.cluster.symbol} deleted.`)
      }
      setActionTarget(null)
      await loadClusters()
    } catch (err) {
      toast.error(err.message || "Action failed")
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!clerkUser?.id) return
    setProcessing(true)

    try {
      const result = await deleteAllClusters({ clerkId: clerkUser.id, adminCode: getAdminAccessCode() })
      toast.success(`${result?.deletedCount ?? 0} cluster(s) deleted.`)
      setDeleteAllOpen(false)
      await loadClusters()
    } catch (err) {
      toast.error(err.message || "Could not delete all clusters")
    } finally {
      setProcessing(false)
    }
  }

  // Nuclear option: clusters, authorship blocks, AND every user's wallet (balance + transaction
  // history) — everyone genuinely starts from zero and has to deposit again.
  const handleResetAll = async () => {
    if (!clerkUser?.id) return
    setProcessing(true)

    try {
      const result = await resetAllData({ clerkId: clerkUser.id, adminCode: getAdminAccessCode() })
      toast.success(
        `Reset complete: ${result?.deletedClusters ?? 0} cluster(s), ${result?.deletedBlocks ?? 0} block(s), ${result?.resetUsers ?? 0} user wallet(s).`
      )
      setResetAllOpen(false)
      await loadClusters()
    } catch (err) {
      toast.error(err.message || "Could not reset all data")
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
        description="Publish drafts to open them for investment, or close/delete a cluster manually."
        actions={
          <>
            {clusters.length > 0 && (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteAllOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Delete all
              </Button>
            )}
            <Button variant="destructive" onClick={() => setResetAllOpen(true)}>
              <AlertTriangle className="h-4 w-4" />
              Reset everything
            </Button>
            <Link href="/admin/clusters/new">
              <Button>
                <PlusCircle className="h-4 w-4" />
                New cluster
              </Button>
            </Link>
          </>
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
                        <Link href={`/admin/clusters/${cluster._id}`}>
                          <Button variant="outline" size="sm">
                            Activity
                          </Button>
                        </Link>
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setActionTarget({ cluster, type: "delete" })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
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
              {actionTarget?.type === "publish" ? "Publish this cluster?" : actionTarget?.type === "close" ? "Close this cluster?" : "Delete this cluster?"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.type === "publish" &&
                `${actionTarget?.cluster?.name || actionTarget?.cluster?.symbol} will become visible and open for investment on the market.`}
              {actionTarget?.type === "close" &&
                `${actionTarget?.cluster?.name || actionTarget?.cluster?.symbol} will be closed immediately, regardless of its current layer progress. This cannot be undone.`}
              {actionTarget?.type === "delete" &&
                `${actionTarget?.cluster?.name || actionTarget?.cluster?.symbol} will be permanently deleted, along with its activity log and holder records. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              variant={actionTarget?.type === "close" || actionTarget?.type === "delete" ? "destructive" : "default"}
            >
              {processing ? "Working..." : actionTarget?.type === "publish" ? "Publish" : actionTarget?.type === "close" ? "Close cluster" : "Delete cluster"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete every cluster?</DialogTitle>
            <DialogDescription>
              This permanently deletes all {clusters.length} cluster(s), including their activity logs and holder records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleDeleteAll} disabled={processing} variant="destructive">
              {processing ? "Deleting..." : "Delete all clusters"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetAllOpen} onOpenChange={setResetAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset absolutely everything?</DialogTitle>
            <DialogDescription>
              This deletes every cluster and authorship block, AND resets every user's real and demo balance
              to zero with their full transaction history cleared. Everyone will need to deposit again. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetAllOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleResetAll} disabled={processing} variant="destructive">
              {processing ? "Resetting..." : "Reset everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

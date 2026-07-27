"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { ArrowLeft, Share2, Users } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusterById, investInCluster } from "@/lib/api-client"

const STATUS_META = {
  offline: { label: "Draft", variant: "outline" },
  online: { label: "Open", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
}

function normalize(cluster) {
  const cellCount = Number(cluster.expVolume ?? cluster.cellCount ?? 10)
  const cellValue = Number(cluster.entryPoint ?? cluster.cellValue ?? 1000)
  const filledCells = Number(cluster.holderPoint ?? cluster.filledCells ?? 0)
  const currentLayer = Number(cluster.currentLayer ?? cluster.layer ?? 1)
  const maxLayers = Number(cluster.maxLayers ?? cluster.layers ?? 1)
  const layerStep = Number(cluster.layerStep ?? cluster.layerIncrement ?? 0)
  const metrics = calculateClusterMetrics({ cellCount, cellValue, filledCells, currentLayer, maxLayers, layerStep })

  return { ...cluster, id: cluster._id ?? cluster.id, name: cluster.name ?? cluster.symbol, cellCount, cellValue, filledCells, metrics }
}

export default function ClusterPage() {
  const params = useParams()
  const router = useRouter()
  const { user: clerkUser, isSignedIn } = useUser()
  const id = params?.id

  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [cells, setCells] = useState("1")
  const [investing, setInvesting] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    let isActive = true

    async function load() {
      try {
        setLoading(true)
        setNotFound(false)
        const data = await fetchClusterById(id)
        if (isActive && data?.data) setCluster(normalize(data.data))
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

  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    )
  }
  if (notFound || !cluster) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <EmptyState title="Cluster not found" description="This cluster doesn't exist or was removed." />
      </div>
    )
  }

  const { metrics } = cluster
  const status = cluster.status ?? "offline"
  const statusMeta = STATUS_META[status] ?? STATUS_META.offline
  const canInvest = status === "online" && !metrics.isClosed

  async function handleInvest() {
    const parsedCells = Number(cells)
    if (!Number.isInteger(parsedCells) || parsedCells <= 0) {
      setError("Enter a valid number of cells.")
      return
    }
    if (parsedCells > metrics.remainingCells) {
      setError(`Only ${metrics.remainingCells} cell(s) remaining.`)
      return
    }
    if (!isSignedIn || !clerkUser?.id) {
      setError("You must be logged in to invest.")
      return
    }

    setInvesting(true)
    setError("")
    setFeedback("")

    try {
      const result = await investInCluster(cluster.id, { clerkId: clerkUser.id, cells: parsedCells })
      setCluster(normalize(result.data))
      setCells("1")
      setFeedback(`Invested ${formatCurrency(parsedCells * metrics.currentCellPrice)} in layer ${metrics.currentLayer}.`)
      window.dispatchEvent(new CustomEvent("wallet-balance-updated", { detail: { balance: result?.wallet?.balance } }))
    } catch (err) {
      setError(err.message || "Investment failed")
    } finally {
      setInvesting(false)
    }
  }

  return (
    <div className="bgmain p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{cluster.name}</h1>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{cluster.symbol} • created by {cluster.creator ?? "triomac60"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (typeof window !== "undefined") {
              navigator.clipboard?.writeText(window.location.href)
              setFeedback("Link copied to clipboard.")
            }
          }}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Cluster cells</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-12">
                {Array.from({ length: cluster.cellCount }).map((_, i) => {
                  const filled = i < cluster.filledCells
                  return (
                    <div
                      key={i}
                      title={filled ? "Filled by an investor" : "Empty cell"}
                      className={`aspect-square rounded-md border ${filled ? "border-primary bg-primary/70" : "border-border bg-muted/40"}`}
                    />
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>{cluster.filledCells} / {cluster.cellCount} cells filled</span>
                <span>{metrics.progress.toFixed(0)}% complete</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Holders
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
                          <TableCell className="text-muted-foreground">{holder.clerkId}</TableCell>
                          <TableCell className="text-right text-foreground">{holder.cells}</TableCell>
                          <TableCell className="text-right font-medium text-foreground">{formatCurrency(holder.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState icon={Users} title="No investors yet" description="Be the first to fund this cluster." />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active layer</span>
                  <span className="font-semibold text-primary">{metrics.currentLayer} / {metrics.maxLayers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry per cell</span>
                  <span className="font-semibold text-primary">{formatCurrency(metrics.currentCellPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross liquidity</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.brutLiquidity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">System share (16%)</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.systemShare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net liquidity</span>
                  <span className="font-semibold text-foreground">{formatCurrency(metrics.netLiquidity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cells remaining</span>
                  <span className="font-semibold text-foreground">{metrics.remainingCells}</span>
                </div>

                {!canInvest && (
                  <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    {status === "offline" ? "This cluster hasn't been published yet." : "This cluster is closed to new investment."}
                  </p>
                )}

                <div className="space-y-2 pt-2">
                  <Input type="number" min="1" step="1" max={metrics.remainingCells} value={cells} onChange={(e) => setCells(e.target.value)} disabled={!canInvest} placeholder="Number of cells" />
                  <p className="text-xs text-muted-foreground">Total: {formatCurrency((Number(cells) || 0) * metrics.currentCellPrice)}</p>
                  <Button className="w-full" onClick={handleInvest} disabled={investing || !canInvest}>
                    {!canInvest ? statusMeta.label : investing ? "Investing..." : "Fund this cluster"}
                  </Button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {feedback && <p className="text-sm text-primary">{feedback}</p>}
              </div>
            </CardContent>
          </Card>

          <Link href="/transactions">
            <Button variant="outline" className="w-full">View transactions</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

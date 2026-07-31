"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import useSWR, { mutate as mutateGlobal } from "swr"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { ArrowLeft, CheckCircle2, Share2, Users } from "lucide-react"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusterById, fetchUsersByClerkIds, investInCluster } from "@/lib/api-client"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/lib/toast-context"

const STATUS_META = {
  offline: { label: "Draft", variant: "outline" },
  online: { label: "Open", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
}

function displayName(clerkId, usersById) {
  const user = usersById[clerkId]
  if (!user) return clerkId
  if (user.username) return user.username
  if (user.firstName || user.lastName) return [user.firstName, user.lastName].filter(Boolean).join(" ")
  return clerkId
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
  const { real, setBalance } = useWallet()
  const toast = useToast()
  const id = params?.id

  const [usersById, setUsersById] = useState({})
  const [cells, setCells] = useState("1")
  const [investing, setInvesting] = useState(false)

  // Polled short so this page updates live for anyone viewing it, not just the person trading —
  // e.g. two people looking at the same cluster both see a purchase land within a few seconds,
  // no F5 needed. mutateGlobal("clusters") after a successful invest keeps Dashboard/Trade in sync
  // the same way; mutate() below does the same for this page's own key immediately after a trade.
  const { data, error: fetchError, isLoading, mutate } = useSWR(
    id ? ["cluster", id] : null,
    () => fetchClusterById(id),
    { refreshInterval: 4000, revalidateOnFocus: true }
  )
  const cluster = useMemo(() => (data?.data ? normalize(data.data) : null), [data])
  const loading = !data && isLoading
  const notFound = Boolean(fetchError) && !data

  useEffect(() => {
    if (!cluster?.holders?.length) return
    let isActive = true

    async function loadUsers() {
      try {
        const clerkIds = cluster.holders.map((holder) => holder.clerkId)
        const result = await fetchUsersByClerkIds(clerkIds)
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
  }, [cluster?.holders])

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
      toast.error("Enter a valid number of cells.")
      return
    }
    if (parsedCells > metrics.remainingCells) {
      toast.error(`Purchase impossible: only ${metrics.remainingCells} cell(s) are available at this layer, you requested ${parsedCells}.`)
      return
    }
    if (!isSignedIn || !clerkUser?.id) {
      toast.error("You must be logged in to invest.")
      return
    }

    const total = parsedCells * metrics.currentCellPrice
    // Fail fast client-side so a purchase never gets a chance to send a request that would drive
    // the balance negative — the backend enforces this too, this just avoids the round trip.
    if (real.balance < total) {
      toast.error("Insufficient balance.")
      return
    }

    setInvesting(true)

    try {
      const result = await investInCluster(cluster.id, { clerkId: clerkUser.id, cells: parsedCells })
      mutate(result, { revalidate: false })
      setCells("1")
      toast.success(`Bought ${parsedCells} cell(s) in ${cluster.symbol}, layer ${metrics.currentLayer}, for ${formatCurrency(total)}.`)
      if (result?.wallet?.balance !== undefined) setBalance("real", result.wallet.balance)
      // Revalidate the shared "clusters" SWR key so Trade/Dashboard/Portfolio/Market pick up this
      // trade immediately instead of waiting for their own next poll tick.
      mutateGlobal("clusters")
    } catch (err) {
      toast.error(err.message || "Investment failed")
    } finally {
      setInvesting(false)
    }
  }

  const completedLayers = Array.isArray(cluster.layerHistory)
    ? cluster.layerHistory.filter((entry) => entry.completedAt)
    : []

  const summaryTiles = [
    { label: "Entry per cell", value: formatCurrency(metrics.currentCellPrice), accent: "text-primary" },
    { label: "Cells remaining", value: metrics.remainingCells, accent: "text-foreground" },
    { label: "Gross liquidity", value: formatCurrency(metrics.brutLiquidity), accent: "text-foreground" },
    { label: "System share (16%)", value: formatCurrency(metrics.systemShare), accent: "text-foreground" },
    { label: "Net liquidity", value: formatCurrency(metrics.netLiquidity), accent: "text-foreground" },
    { label: "Progress", value: `${metrics.progress.toFixed(0)}%`, accent: "text-foreground" },
  ]

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
              <Badge variant="outline" className="border-primary/30 text-primary">
                Layer {metrics.currentLayer} / {metrics.maxLayers}
              </Badge>
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
              toast.success("Link copied to clipboard.")
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
              {completedLayers.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  {completedLayers.map((entry) => (
                    <div key={entry.layer} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">Layer {entry.layer}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{entry.filledCells} cells</span>
                        <span>{formatCurrency(entry.pricePerCell)}/cell</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mb-2 text-xs font-medium text-muted-foreground">Layer {metrics.currentLayer} — active</p>
              <div className="flex flex-wrap gap-[3px]">
                {Array.from({ length: cluster.cellCount }).map((_, i) => {
                  const filled = i < cluster.filledCells
                  return (
                    <div
                      key={i}
                      title={filled ? "Filled by an investor" : "Empty cell"}
                      className={`h-2 w-2 rounded-[2px] ${filled ? "bg-primary" : "border border-border bg-muted/40"}`}
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
                          <TableCell className="text-foreground">{displayName(holder.clerkId, usersById)}</TableCell>
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
              <div className="grid grid-cols-2 gap-2">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className="rounded-lg border border-border bg-muted/30 p-2.5">
                    <p className="text-[11px] text-muted-foreground">{tile.label}</p>
                    <p className={`text-sm font-semibold ${tile.accent}`}>{tile.value}</p>
                  </div>
                ))}
              </div>

              {!canInvest && (
                <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {status === "offline" ? "This cluster hasn't been published yet." : "This cluster is closed to new investment."}
                </p>
              )}

              <div className="mt-3 space-y-2">
                <Input type="number" min="1" step="1" max={metrics.remainingCells} value={cells} onChange={(e) => setCells(e.target.value)} disabled={!canInvest} placeholder="Number of cells" />
                <p className="text-xs text-muted-foreground">Total: {formatCurrency((Number(cells) || 0) * metrics.currentCellPrice)}</p>
                <Button className="w-full" onClick={handleInvest} disabled={investing || !canInvest}>
                  {!canInvest ? statusMeta.label : investing ? "Investing..." : "Fund this cluster"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Link href="/portfolio">
            <Button variant="outline" className="w-full">View portfolio</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

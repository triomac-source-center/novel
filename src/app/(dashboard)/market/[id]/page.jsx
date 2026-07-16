"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { fetchClusterById, investInCluster } from "@/lib/api-client"

function normalize(cluster) {
  const cellCount = Number(cluster.expVolume ?? cluster.cellCount ?? 10)
  const cellValue = Number(cluster.entryPoint ?? cluster.cellValue ?? 1000)
  const filledCells = Number(cluster.holderPoint ?? cluster.filledCells ?? 0)

  const currentLayer = Number(cluster.currentLayer ?? cluster.layer ?? 1)
  const maxLayers = Number(cluster.maxLayers ?? cluster.layers ?? 1)
  const layerStep = Number(cluster.layerStep ?? cluster.layerIncrement ?? 0)
  const metrics = calculateClusterMetrics({ cellCount, cellValue, filledCells, currentLayer, maxLayers, layerStep })

  return {
    ...cluster,
    id: cluster._id ?? cluster.id,
    name: cluster.name ?? cluster.symbol,
    cellCount,
    cellValue,
    filledCells,
    metrics,
  }
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
        if (isActive && data?.data) {
          setCluster(normalize(data.data))
        }
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

  if (loading) return <div className="p-6">Loading...</div>
  if (notFound || !cluster) return <div className="p-6">Cluster not found</div>

  const { metrics } = cluster

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
      const result = await investInCluster(cluster.id, {
        clerkId: clerkUser.id,
        cells: parsedCells,
      })

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

  function renderCells() {
    const cellNodes = []
    for (let i = 0; i < cluster.cellCount; i++) {
      const filled = i < cluster.filledCells
      cellNodes.push(
        <div
          key={i}
          title={filled ? "Filled by an investor" : "Empty cell"}
          className={`h-10 flex-1 border ${filled ? "bg-primary/70 border-primary" : "bg-muted/40 border-border/30"} flex items-center justify-center text-xs font-medium`}
        >
          {filled ? "\u25CF" : ""}
        </div>
      )
    }

    return (
      <div className="w-full overflow-hidden rounded-md border">
        <div className="flex w-full">{cellNodes}</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bgmain">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{cluster.name}</h1>
          <p className="text-sm text-muted-foreground">{cluster.symbol} \u2022 created by {cluster.creator ?? "triomac60"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>Back</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Cluster Cells</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {renderCells()}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{cluster.filledCells} / {cluster.cellCount} cells filled</span>
                  <span>{metrics.progress.toFixed(0)}% complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Holders</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(cluster.holders) && cluster.holders.length > 0 ? (
                <div className="space-y-2">
                  {cluster.holders.map((holder, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{holder.clerkId}</span>
                      <span className="font-medium">{holder.cells} cell(s) \u2022 {formatCurrency(holder.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No investors yet. Be the first to fund this cluster.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50">
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
                  <span className="font-semibold">{formatCurrency(metrics.brutLiquidity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">System share (16%)</span>
                  <span className="font-semibold">{formatCurrency(metrics.systemShare)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net liquidity</span>
                  <span className="font-semibold">{formatCurrency(metrics.netLiquidity)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cells remaining</span>
                  <span className="font-semibold">{metrics.remainingCells}</span>
                </div>

                <div className="space-y-2 pt-2">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    max={metrics.remainingCells}
                    value={cells}
                    onChange={(e) => setCells(e.target.value)}
                    disabled={metrics.isClosed}
                    placeholder="Number of cells"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency((Number(cells) || 0) * metrics.currentCellPrice)}
                  </p>
                  <Button className="w-full" onClick={handleInvest} disabled={investing || metrics.isClosed}>
                    {metrics.isClosed ? "Cluster closed" : investing ? "Investing..." : "Fund this cluster"}
                  </Button>
                </div>
                {error && <div className="text-sm text-destructive">{error}</div>}
                {feedback && <div className="text-sm text-primary">{feedback}</div>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Link href="/transactions">
                  <Button variant="outline" className="w-full">View transactions</Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard?.writeText(window.location.href)
                      setFeedback("Link copied to clipboard.")
                    }
                  }}
                >
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

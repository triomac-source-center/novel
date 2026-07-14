"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react"

export default function ClusterPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id
  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    if (!id) return

    let isActive = true

    async function load() {
      try {
        setLoading(true)
        const res = await fetch("https://novel-server-cdcp.onrender.com/api/all/clusters")
        const data = await res.json()
        const found = Array.isArray(data?.data)
          ? data.data.find((c) => c.id === id || c._id === id || c.signature === id || c.id === `cluster-${id}`)
          : null

        if (isActive) {
          if (found) {
            const metrics = calculateClusterMetrics({
              cellCount: Number(found.cellCount ?? found.totalCells ?? found.expVolume ?? 10),
              cellValue: Number(found.cellValue ?? found.valuePerCell ?? found.entryPoint ?? 1000),
              filledCells: Number(found.filledCells ?? found.filled ?? found.holderPoint ?? 0),
            })

            setCluster({ ...found, metrics })
          } else {
            // fallback: simple demo cluster
            const demo = {
              id,
              symbol: id,
              name: `Cluster ${id}`,
              cellCount: 10,
              cellValue: 1000,
              filledCells: 3,
            }
            demo.metrics = calculateClusterMetrics(demo)
            setCluster(demo)
          }
        }
      } catch (err) {
        console.error(err)
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
  if (!cluster) return <div className="p-6">Cluster not found</div>

  const { metrics } = cluster

  function handleInvest() {
    setFeedback(`Invest: ${formatCurrency(Number(metrics.cellValue))} (placeholder)`)
  }

  function renderCells() {
    const cells = []
    for (let i = 0; i < metrics.brutLiquidity / (metrics.brutLiquidity / metrics.brutLiquidity || 1) && i < cluster.cellCount; i++) {
      // this loop is safe but we'll render by index
      break
    }

    for (let i = 0; i < cluster.cellCount; i++) {
      const filled = i < cluster.filledCells
      cells.push(
        <div
          key={i}
          title={filled ? `Filled by investor` : `Empty cell`}
          className={`h-10 flex-1 border ${filled ? "bg-primary/70 border-primary" : "bg-muted/40 border-border/30"} flex items-center justify-center text-xs font-medium`}
        >
          {filled ? "●" : ""}
        </div>
      )
    }

    return (
      <div className="w-full overflow-hidden rounded-md border">
        <div className="flex w-full">{cells}</div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 bgmain">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{cluster.name}</h1>
          <p className="text-sm text-muted-foreground">{cluster.symbol} • created by {cluster.creator ?? "triomac60"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>Back</Button>
          <Button onClick={handleInvest}>Invest</Button>
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
                  <span>{metrics.filledValue ? `${cluster.filledCells} / ${cluster.cellCount} cells filled` : `${cluster.filledCells} / ${cluster.cellCount}`}</span>
                  <span>{metrics.progress.toFixed(0)}% complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Price / Activity (Preview)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 w-full bg-muted/20 rounded-md flex items-center justify-center text-sm text-muted-foreground">
                Candlestick chart placeholder
              </div>
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
                <div className="pt-2">
                  <Button className="w-full" onClick={handleInvest}>Fund a cell</Button>
                </div>
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
                <Button onClick={() => setFeedback('Requesting withdraw (placeholder)')}>Request withdraw</Button>
                <Button variant="outline" onClick={() => setFeedback('Viewing transactions (placeholder)')}>View transactions</Button>
                <Button variant="ghost" onClick={() => setFeedback('Sharing link (placeholder)')}>Share</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

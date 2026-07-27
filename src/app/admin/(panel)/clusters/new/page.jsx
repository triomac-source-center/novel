"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Layers3 } from "lucide-react"
import { createCluster } from "@/lib/api-client"
import { formatCurrency } from "@/lib/cluster-utils"

const ALGORITHMS = ["mean-reversion", "momentum", "grid", "scalping", "trend-following"]

export default function AdminNewClusterPage() {
  const { user: clerkUser } = useUser()
  const router = useRouter()

  const [symbol, setSymbol] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [algorythm, setAlgorythm] = useState(ALGORITHMS[0])
  const [cellCount, setCellCount] = useState("10")
  const [cellValue, setCellValue] = useState("1000")
  const [maxLayers, setMaxLayers] = useState("3")
  const [layerStep, setLayerStep] = useState("100")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const parsedCellCount = Number(cellCount)
  const parsedCellValue = Number(cellValue)
  const parsedMaxLayers = Number(maxLayers)
  const parsedLayerStep = Number(layerStep)
  const totalTarget = (Number.isFinite(parsedCellCount) ? parsedCellCount : 0) * (Number.isFinite(parsedCellValue) ? parsedCellValue : 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!symbol.trim()) {
      setError("Symbol is required.")
      return
    }
    if (!Number.isInteger(parsedCellCount) || parsedCellCount <= 0) {
      setError("Cell count must be a positive whole number.")
      return
    }
    if (!Number.isFinite(parsedCellValue) || parsedCellValue <= 0) {
      setError("Cell value must be a positive amount.")
      return
    }
    if (!Number.isInteger(parsedMaxLayers) || parsedMaxLayers <= 0 || !Number.isFinite(parsedLayerStep) || parsedLayerStep < 0) {
      setError("Layers and layer increment must be valid.")
      return
    }
    if (!clerkUser?.id) {
      setError("You must be signed in.")
      return
    }

    setSubmitting(true)
    try {
      await createCluster({
        clerkId: clerkUser.id,
        symbol,
        name,
        description,
        algorythm,
        cellCount: parsedCellCount,
        cellValue: parsedCellValue,
        maxLayers: parsedMaxLayers,
        layerStep: parsedLayerStep,
        creator: "triomac60",
      })

      router.push("/admin/clusters")
    } catch (err) {
      setError(err.message || "Cluster creation failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cluster management"
        icon={Layers3}
        title="Create a cluster"
        description="New clusters start as a draft — publish them from the clusters list once you're ready."
      />

      <Card className="max-w-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle>Cluster details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="symbol">Symbol</Label>
                <Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. TRI-04" maxLength={12} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Momentum Cluster" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="maxLayers">Maximum layers</Label>
                <Input id="maxLayers" type="number" min="1" step="1" value={maxLayers} onChange={(e) => setMaxLayers(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="layerStep">Layer increment ($)</Label>
                <Input id="layerStep" type="number" min="0" step="1" value={layerStep} onChange={(e) => setLayerStep(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short pitch for investors"
                rows={3}
                className="h-auto w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="algorythm">Strategy / algorithm</Label>
              <select
                id="algorythm"
                value={algorythm}
                onChange={(e) => setAlgorythm(e.target.value)}
                className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {ALGORITHMS.map((algo) => (
                  <option key={algo} value={algo} className="bg-background text-foreground">
                    {algo}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cellCount">Number of cells</Label>
                <Input id="cellCount" type="number" min="1" step="1" value={cellCount} onChange={(e) => setCellCount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cellValue">Value per cell ($)</Label>
                <Input id="cellValue" type="number" min="1" step="1" value={cellValue} onChange={(e) => setCellValue(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Target liquidity: </span>
              <span className="font-semibold text-foreground">{formatCurrency(totalTarget || 0)}</span>
              <p className="mt-1 text-xs text-muted-foreground">
                Layer 1 starts at {formatCurrency(parsedCellValue || 0)}; each completed layer adds {formatCurrency(parsedLayerStep || 0)}.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create draft cluster"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

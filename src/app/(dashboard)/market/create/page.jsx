"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Layers3 } from "lucide-react"
import { createCluster } from "@/lib/api-client"
import { formatCurrency } from "@/lib/cluster-utils"

const ALGORITHMS = ["mean-reversion", "momentum", "grid", "scalping", "trend-following"]

export default function CreateClusterPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const router = useRouter()

  const [symbol, setSymbol] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [algorythm, setAlgorythm] = useState(ALGORITHMS[0])
  const [cellCount, setCellCount] = useState("10")
  const [cellValue, setCellValue] = useState("1000")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (!isSignedIn) return <p className="p-8">Please log in</p>

  const parsedCellCount = Number(cellCount)
  const parsedCellValue = Number(cellValue)
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

    setSubmitting(true)
    try {
      const result = await createCluster({
        clerkId: clerkUser.id,
        symbol,
        name,
        description,
        algorythm,
        cellCount: parsedCellCount,
        cellValue: parsedCellValue,
      })

      const newId = result?.data?._id || result?.data?.id
      router.push(newId ? `/market/${newId}` : "/market")
    } catch (err) {
      setError(err.message || "Cluster creation failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 bgmain">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/market")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to market
      </Button>

      <div className="mb-6 flex items-center gap-2">
        <div className="rounded-full bg-primary/20 p-2">
          <Layers3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create a cluster</h1>
          <p className="text-sm text-muted-foreground">Define the structure investors will fund.</p>
        </div>
      </div>

      <Card className="max-w-2xl border-border/50">
        <CardHeader>
          <CardTitle>Cluster details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. TRI-04"
                  maxLength={12}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Momentum Cluster"
                />
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
                className="border-input h-auto w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="algorythm">Strategy / algorithm</Label>
              <select
                id="algorythm"
                value={algorythm}
                onChange={(e) => setAlgorythm(e.target.value)}
                className="border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
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
                <Input
                  id="cellCount"
                  type="number"
                  min="1"
                  step="1"
                  value={cellCount}
                  onChange={(e) => setCellCount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cellValue">Value per cell ($)</Label>
                <Input
                  id="cellValue"
                  type="number"
                  min="1"
                  step="1"
                  value={cellValue}
                  onChange={(e) => setCellValue(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              <span className="text-muted-foreground">Target liquidity: </span>
              <span className="font-semibold">{formatCurrency(totalTarget || 0)}</span>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create cluster"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

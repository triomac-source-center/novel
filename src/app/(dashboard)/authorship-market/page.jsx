"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR, { mutate as mutateGlobal } from "swr"
import { useUser, useAuth } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Award, CircleDollarSign, Tag } from "lucide-react"
import { fetchBlocks, buyBlocks } from "@/lib/api-client"
import { formatCurrency } from "@/lib/cluster-utils"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/lib/toast-context"

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

export default function AuthorshipMarketPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { real, setBalance } = useWallet()
  const toast = useToast()

  const [clusterFilter, setClusterFilter] = useState("all")
  const [layerMin, setLayerMin] = useState("")
  const [layerMax, setLayerMax] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [quantity, setQuantity] = useState("")
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [buying, setBuying] = useState(false)

  const { data, isLoading } = useSWR("authorship-blocks", () => fetchBlocks(), { revalidateOnFocus: true, refreshInterval: 5000 })
  const blocks = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])
  const purchasable = useMemo(
    () => blocks.filter((block) => block.status === "available" || (block.status === "sold" && block.listedForResale)),
    [blocks]
  )
  const loading = !data && isLoading

  const clusterOptions = useMemo(() => {
    const map = new Map()
    for (const block of purchasable) map.set(block.clusterId, block.clusterSymbol)
    return [...map.entries()]
  }, [purchasable])

  const priced = purchasable.map((block) => ({
    ...block,
    price: block.status === "sold" && block.listedForResale ? Number(block.resalePrice || 0) : block.originalPrice,
  }))

  const filtered = priced.filter((block) => {
    if (clusterFilter !== "all" && block.clusterId !== clusterFilter) return false
    if (layerMin && block.layer < Number(layerMin)) return false
    if (layerMax && block.layer > Number(layerMax)) return false
    if (priceMax && block.price > Number(priceMax)) return false
    return true
  })
  const filteredSortedByPrice = filtered.slice().sort((a, b) => a.price - b.price)
  const filteredTotal = filtered.reduce((sum, block) => sum + block.price, 0)

  const parsedQuantity = Number(quantity)
  const quantityValid = Number.isInteger(parsedQuantity) && parsedQuantity > 0
  const cheapestN = quantityValid ? filteredSortedByPrice.slice(0, parsedQuantity) : []
  const cheapestNTotal = cheapestN.reduce((sum, block) => sum + block.price, 0)

  async function runPurchase(blockIds, total) {
    if (!isSignedIn || !clerkUser?.id) {
      toast.error("You must be logged in to buy blocks.")
      return
    }
    if (blockIds.length === 0) return
    if (real.balance < total) {
      toast.error("Insufficient balance.")
      return
    }
    setBuying(true)
    try {
      const token = await getToken()
      const result = await buyBlocks(token, { blockIds })
      toast.success(`Acquired ${result.data.length} authorship block(s) for ${formatCurrency(total)}.`)
      if (result?.wallet?.balance !== undefined) setBalance("real", result.wallet.balance)
      mutateGlobal("authorship-blocks")
    } catch (err) {
      toast.error(err.message || "Purchase failed")
    } finally {
      setBuying(false)
      setConfirmingAll(false)
    }
  }

  if (!isSignedIn) return <p>Please log in</p>

  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    )
  }

  const availableCount = purchasable.filter((block) => block.status === "available").length
  const resaleCount = purchasable.filter((block) => block.listedForResale).length

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Pre-sold future revenue"
        icon={Award}
        title="Authorship market"
        description="Each block represents a cluster layer's future 16% system share, sold in advance at half price. When that layer is reached, the full share is paid to whoever holds the block."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Blocks for sale" value={purchasable.length} icon={Award} />
        <StatCard label="First-sale (from system)" value={availableCount} icon={CircleDollarSign} accent="text-primary" />
        <StatCard label="Listed for resale" value={resaleCount} icon={Tag} accent="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Bulk purchase: filters narrow the pool, then either "buy the N cheapest" or "buy
          everything currently filtered" — no per-block checkboxes, since selecting hundreds of
          blocks one by one doesn't scale. */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Bulk purchase</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Cluster</label>
            <select className={selectClass} value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)}>
              <option value="all">All clusters</option>
              {clusterOptions.map(([id, symbol]) => (
                <option key={id} value={id}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Layer min</label>
            <Input type="number" min="1" value={layerMin} onChange={(e) => setLayerMin(e.target.value)} placeholder="Any" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Layer max</label>
            <Input type="number" min="1" value={layerMax} onChange={(e) => setLayerMax(e.target.value)} placeholder="Any" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Max price</label>
            <Input type="number" min="0" step="0.01" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Any" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">Quantity (cheapest first)</label>
            <Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length} block(s) match — {formatCurrency(filteredTotal)} total
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!quantityValid || cheapestN.length === 0 || buying}
              onClick={() => runPurchase(cheapestN.map((b) => b._id), cheapestNTotal)}
            >
              {buying ? "Buying..." : `Buy ${quantityValid ? Math.min(parsedQuantity, filteredSortedByPrice.length) : "N"} cheapest (${formatCurrency(cheapestNTotal)})`}
            </Button>
            {!confirmingAll ? (
              <Button disabled={filtered.length === 0 || buying} onClick={() => setConfirmingAll(true)}>
                Buy all filtered ({formatCurrency(filteredTotal)})
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground">Confirm buying {filtered.length} block(s) for {formatCurrency(filteredTotal)}?</span>
                <Button disabled={buying} onClick={() => runPurchase(filtered.map((b) => b._id), filteredTotal)}>
                  {buying ? "Buying..." : "Confirm"}
                </Button>
                <Button variant="outline" disabled={buying} onClick={() => setConfirmingAll(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Award} title="No blocks match" description="Adjust the filters above, or check back once a cluster is published." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((block) => {
            const isResale = block.status === "sold" && block.listedForResale
            return (
              <Link
                key={block._id}
                href={`/authorship-market/${block._id}`}
                className="group rounded-lg border border-border/60 bg-[oklch(0.16_0.014_50)] p-4 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.7)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_-14px_rgba(0,0,0,0.8)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {block.clusterSymbol.slice(0, 2)}
                  </span>
                  <Badge variant={isResale ? "outline" : "secondary"} className="text-xs">
                    {isResale ? "Resale" : "New"}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{block.clusterSymbol} — Layer {block.layer}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pays out {formatCurrency(block.expectedShareAmount)} when reached</p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(block.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{isResale ? "resale price" : "half price"}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR, { mutate as mutateGlobal } from "swr"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, CircleDollarSign, Layers3, Tag } from "lucide-react"
import { fetchBlocks, buyBlocks } from "@/lib/api-client"
import { formatCurrency } from "@/lib/cluster-utils"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/lib/toast-context"
import { cn } from "@/lib/utils"

export default function AuthorshipMarketPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { real, setBalance } = useWallet()
  const toast = useToast()
  const [selected, setSelected] = useState(new Set())
  const [buying, setBuying] = useState(false)

  // Public marketplace: only blocks belonging to published clusters, purchasable right now
  // (available for the first time, or listed for resale by their current owner).
  const { data, isLoading } = useSWR("authorship-blocks", () => fetchBlocks(), { revalidateOnFocus: true, refreshInterval: 5000 })
  const blocks = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])
  const purchasable = useMemo(
    () => blocks.filter((block) => block.status === "available" || (block.status === "sold" && block.listedForResale)),
    [blocks]
  )
  const loading = !data && isLoading

  const selectedBlocks = purchasable.filter((block) => selected.has(block._id))
  const selectedTotal = selectedBlocks.reduce(
    (sum, block) => sum + (block.status === "available" ? block.originalPrice : Number(block.resalePrice || 0)),
    0
  )

  function toggle(blockId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }

  async function handleBuy() {
    if (!isSignedIn || !clerkUser?.id) {
      toast.error("You must be logged in to buy blocks.")
      return
    }
    if (selectedBlocks.length === 0) return
    if (real.balance < selectedTotal) {
      toast.error("Insufficient balance.")
      return
    }

    setBuying(true)
    try {
      const result = await buyBlocks({ clerkId: clerkUser.id, blockIds: [...selected] })
      toast.success(`Acquired ${result.data.length} authorship block(s) for ${formatCurrency(selectedTotal)}.`)
      if (result?.wallet?.balance !== undefined) setBalance("real", result.wallet.balance)
      setSelected(new Set())
      mutateGlobal("authorship-blocks")
    } catch (err) {
      toast.error(err.message || "Purchase failed")
    } finally {
      setBuying(false)
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

      {purchasable.length === 0 ? (
        <EmptyState icon={Award} title="No blocks for sale" description="Blocks appear here once a cluster is published." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {purchasable.map((block) => {
            const isResale = block.status === "sold" && block.listedForResale
            const price = isResale ? Number(block.resalePrice || 0) : block.originalPrice
            const checked = selected.has(block._id)
            return (
              <div
                key={block._id}
                className={cn(
                  "flex items-center gap-3 border-b border-border bg-card px-4 py-3 transition-colors last:border-b-0 hover:bg-accent",
                  checked && "bg-primary/[0.06]"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={checked}
                  onChange={() => toggle(block._id)}
                />
                <Link href={`/authorship-market/${block._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {block.clusterSymbol.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{block.clusterSymbol} — Layer {block.layer}</p>
                    <p className="truncate text-xs text-muted-foreground">Pays out {formatCurrency(block.expectedShareAmount)} when this layer is reached</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(price)}</p>
                    <p className="text-xs text-muted-foreground">{isResale ? "resale" : "half price"}</p>
                  </div>
                  <Badge variant={isResale ? "outline" : "secondary"} className="shrink-0 text-xs">
                    {isResale ? "Resale" : "New"}
                  </Badge>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {selectedBlocks.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-6 py-4 backdrop-blur lg:pl-72">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <p className="text-sm text-foreground">
              {selectedBlocks.length} block(s) selected — <span className="font-semibold">{formatCurrency(selectedTotal)}</span>
            </p>
            <Button onClick={handleBuy} disabled={buying}>
              {buying ? "Buying..." : "Buy selected blocks"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

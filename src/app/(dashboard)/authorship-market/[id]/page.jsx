"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import useSWR, { mutate as mutateGlobal } from "swr"
import { useUser, useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { ArrowLeft, Award } from "lucide-react"
import { formatCurrency } from "@/lib/cluster-utils"
import { fetchBlockById, buyBlocks, listBlockForResale, unlistBlock } from "@/lib/api-client"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/lib/toast-context"

const STATUS_META = {
  available: { label: "Available", variant: "secondary" },
  sold: { label: "Held", variant: "outline" },
  paid_out: { label: "Paid out", variant: "outline" },
}

export default function AuthorshipBlockPage() {
  const params = useParams()
  const router = useRouter()
  const { user: clerkUser, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { real, setBalance } = useWallet()
  const toast = useToast()
  const id = params?.id

  const [resalePrice, setResalePrice] = useState("")
  const [busy, setBusy] = useState(false)

  const { data, error, isLoading, mutate } = useSWR(id ? ["block", id] : null, () => fetchBlockById(id), {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
  const block = data?.data ?? null
  const loading = !data && isLoading
  const notFound = Boolean(error) && !data

  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      </div>
    )
  }
  if (notFound || !block) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <EmptyState title="Block not found" description="This authorship block doesn't exist or was removed." />
      </div>
    )
  }

  const statusMeta = STATUS_META[block.status] ?? STATUS_META.available
  const isOwner = isSignedIn && block.ownerClerkId === clerkUser?.id
  const isResale = block.status === "sold" && block.listedForResale
  const canBuy = (block.status === "available" || isResale) && !isOwner
  const price = isResale ? Number(block.resalePrice || 0) : block.originalPrice

  async function handleBuy() {
    if (!isSignedIn || !clerkUser?.id) {
      toast.error("You must be logged in to buy a block.")
      return
    }
    if (real.balance < price) {
      toast.error("Insufficient balance.")
      return
    }
    setBusy(true)
    try {
      const token = await getToken()
      const result = await buyBlocks(token, { blockIds: [block._id] })
      mutate({ success: true, data: result.data[0] }, { revalidate: false })
      toast.success(`Acquired the layer ${block.layer} block in ${block.clusterSymbol} for ${formatCurrency(price)}.`)
      if (result?.wallet?.balance !== undefined) setBalance("real", result.wallet.balance)
      mutateGlobal("authorship-blocks")
    } catch (err) {
      toast.error(err.message || "Purchase failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleList() {
    const parsed = Number(resalePrice)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid resale price.")
      return
    }
    setBusy(true)
    try {
      const result = await listBlockForResale(block._id, { clerkId: clerkUser.id, resalePrice: parsed })
      mutate({ success: true, data: result.data }, { revalidate: false })
      toast.success("Block listed for resale.")
      mutateGlobal("authorship-blocks")
    } catch (err) {
      toast.error(err.message || "Listing failed")
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlist() {
    setBusy(true)
    try {
      const result = await unlistBlock(block._id, { clerkId: clerkUser.id })
      mutate({ success: true, data: result.data }, { revalidate: false })
      toast.success("Listing cancelled.")
      mutateGlobal("authorship-blocks")
    } catch (err) {
      toast.error(err.message || "Failed to cancel listing")
    } finally {
      setBusy(false)
    }
  }

  const infoTiles = [
    { label: "Cluster", value: block.clusterSymbol },
    { label: "Layer", value: block.layer },
    { label: "Pays out (this layer's system share)", value: formatCurrency(block.expectedShareAmount), accent: "text-primary" },
    { label: "Price", value: formatCurrency(price) },
    { label: "Status", value: statusMeta.label },
    { label: "Paid out so far", value: formatCurrency(block.paidOutAmount || 0) },
  ]

  return (
    <div className="bgmain p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {block.clusterSymbol} — Layer {block.layer} authorship block
            </h1>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>
          <Link href={`/market/${block.clusterId}`} className="text-sm text-muted-foreground hover:text-primary">
            View {block.clusterSymbol} cluster
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Block details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {infoTiles.map((tile) => (
                  <div key={tile.label} className="rounded-lg border border-border bg-muted/30 p-2.5">
                    <p className="text-[11px] text-muted-foreground">{tile.label}</p>
                    <p className={`text-sm font-semibold ${tile.accent ?? "text-foreground"}`}>{tile.value}</p>
                  </div>
                ))}
              </div>
              {block.status === "paid_out" && (
                <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  This layer has been reached — the full system share was paid to the block owner on {new Date(block.paidOutAt).toLocaleString()}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {canBuy && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>{isResale ? "Buy (resale)" : "Buy from system"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {isResale
                    ? "Paid directly to the current owner."
                    : "Half of this layer's expected system share, paid to the system."}
                </p>
                <Button className="w-full" onClick={handleBuy} disabled={busy}>
                  {busy ? "Buying..." : `Buy for ${formatCurrency(price)}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {isOwner && block.status === "sold" && (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Resell this block</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {block.listedForResale ? (
                  <>
                    <p className="text-xs text-muted-foreground">Listed for {formatCurrency(block.resalePrice)}.</p>
                    <Button variant="outline" className="w-full" onClick={handleUnlist} disabled={busy}>
                      Cancel listing
                    </Button>
                  </>
                ) : (
                  <>
                    <Input type="number" min="0.01" step="0.01" placeholder="Resale price" value={resalePrice} onChange={(e) => setResalePrice(e.target.value)} />
                    <Button className="w-full" onClick={handleList} disabled={busy}>
                      List for resale
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Link href="/authorship-market">
            <Button variant="outline" className="w-full">Back to market</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

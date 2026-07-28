"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Layers3, TrendingUp, Wallet } from "lucide-react"
import { fetchClusters } from "@/lib/api-client"
import { useWallet } from "@/lib/wallet-context"
import { calculateClusterMetrics, formatCurrency } from "@/lib/cluster-utils"
import { InvestmentHistory } from "@/components/investment-history"

const STATUS_LABEL = { offline: "Draft", online: "Open", closed: "Closed" }

export default function PortfolioPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { real } = useWallet()
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function load() {
      try {
        const data = await fetchClusters()
        if (isActive) setClusters(Array.isArray(data?.data) ? data.data : [])
      } catch (err) {
        console.error(err)
        if (isActive) setClusters([])
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()
    return () => {
      isActive = false
    }
  }, [])

  const positions = useMemo(() => {
    if (!clerkUser?.id) return []
    return clusters
      .map((cluster) => {
        const myCells = (cluster.cells || []).filter((cell) => cell.ownerClerkId === clerkUser.id)
        if (myCells.length === 0) return null
        const costBasis = myCells.reduce((sum, cell) => sum + Number(cell.acquiredPrice || 0), 0)
        const metrics = calculateClusterMetrics({
          cellCount: Number(cluster.expVolume ?? 0),
          cellValue: Number(cluster.entryPoint ?? 0),
          filledCells: Number(cluster.holderPoint ?? 0),
          currentLayer: Number(cluster.currentLayer ?? 1),
          maxLayers: Number(cluster.maxLayers ?? 1),
          layerStep: Number(cluster.layerStep ?? 0),
        })
        return {
          id: cluster._id,
          name: cluster.name || cluster.symbol,
          symbol: cluster.symbol,
          status: cluster.status ?? "offline",
          cells: myCells.length,
          costBasis,
          currentPrice: metrics.currentCellPrice,
          currentValue: myCells.length * metrics.currentCellPrice,
        }
      })
      .filter(Boolean)
  }, [clusters, clerkUser?.id])

  const investmentTransactions = useMemo(
    () =>
      real.transactions
        .filter((tx) => tx.category === "investment")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [real.transactions]
  )

  const totalInvested = investmentTransactions
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const realizedGains = investmentTransactions
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + (Number(tx.amount || 0) - Number(tx.costBasis || 0)), 0)
  const openPositionsValue = positions.reduce((sum, position) => sum + position.currentValue, 0)

  if (!isSignedIn) return <p>Please log in</p>

  if (loading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-20 animate-pulse rounded-2xl border border-border bg-muted/30" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Investment activity"
        icon={LineChart}
        title="Portfolio"
        description="Your cluster positions and realized gains — separate from wallet deposits and withdrawals."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Open positions" value={formatCurrency(openPositionsValue)} icon={Layers3} description={`${positions.length} cluster(s)`} />
        <StatCard label="Total invested" value={formatCurrency(totalInvested)} icon={Wallet} accent="text-blue-600 dark:text-blue-400" />
        <StatCard
          label="Realized gains"
          value={formatCurrency(realizedGains)}
          icon={TrendingUp}
          accent={realizedGains >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" />
            Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <EmptyState icon={Layers3} title="No open positions" description="Cells you own across clusters will show up here." />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cells</TableHead>
                    <TableHead className="text-right">Cost basis</TableHead>
                    <TableHead className="text-right">Current value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <Link href={`/market/${position.id}`} className="font-medium text-foreground hover:text-primary">
                          {position.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{position.symbol}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {STATUS_LABEL[position.status] ?? position.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-foreground">{position.cells}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(position.costBasis)}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(position.currentValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <InvestmentHistory transactions={investmentTransactions} />
      </div>
    </div>
  )
}

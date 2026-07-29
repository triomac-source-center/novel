"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { TrendChart } from "@/components/chart"
import { useUser } from "@clerk/nextjs"
import { useWallet } from "@/lib/wallet-context"
import { fetchClusters } from "@/lib/api-client"
import { calculateClusterMetrics } from "@/lib/cluster-utils"
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Clock3,
  History,
  Layers3,
  LineChart,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react"

const quickActions = [
  { href: "/wallet", label: "Wallet", description: "Manage real and demo balances", icon: Wallet },
  { href: "/market", label: "Market", description: "Browse available clusters", icon: Layers3 },
  { href: "/portfolio", label: "Portfolio", description: "See your positions and PnL", icon: LineChart },
  { href: "/transactions", label: "Activity", description: "See your account history", icon: History },
  { href: "/profile", label: "Profile", description: "Manage your personal info", icon: UserRound },
]

function getClusterId(cluster, index) {
  return cluster.id ?? cluster._id ?? cluster.signature ?? `cluster-${index + 1}`
}

function normalizeCluster(cluster, index) {
  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume ?? 10),
    cellValue: Number(cluster.cellValue ?? cluster.valuePerCell ?? cluster.entryPoint ?? cluster.recette ?? 1000),
    filledCells: Number(cluster.filledCells ?? cluster.filled ?? cluster.holderPoint ?? cluster.actualVolume ?? 0),
    currentLayer: Number(cluster.currentLayer ?? cluster.layer ?? 1),
    maxLayers: Number(cluster.maxLayers ?? cluster.layers ?? 1),
    layerStep: Number(cluster.layerStep ?? cluster.layerIncrement ?? 0),
  })

  return {
    id: getClusterId(cluster, index),
    name: cluster.name ?? `Cluster ${index + 1}`,
    symbol: cluster.symbol ?? `TRI-${String(index + 1).padStart(2, "0")}`,
    status: cluster.status ?? (metrics.isClosed ? "Closed" : "Open"),
    metrics,
  }
}

export default function DashboardPage() {
  const { isSignedIn } = useUser()
  const { user } = useAuth()
  const { real, demo, loading: walletLoading } = useWallet()
  const [clusters, setClusters] = useState([])
  const [clustersLoading, setClustersLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    async function loadClusters() {
      try {
        setClustersLoading(true)
        const data = await fetchClusters()
        const payload = Array.isArray(data?.data) ? data.data.filter((c) => c.status !== "offline") : []
        if (isActive) setClusters(payload.map((cluster, index) => normalizeCluster(cluster, index)))
      } catch (err) {
        console.error(err)
        if (isActive) setClusters([])
      } finally {
        if (isActive) setClustersLoading(false)
      }
    }

    loadClusters()
    return () => {
      isActive = false
    }
  }, [])

  if (!user) return null
  if (!isSignedIn) return <p>Please log in</p>
  if (walletLoading || clustersLoading) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-20 animate-pulse rounded-2xl border border-border bg-muted/30" />
          <div className="grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/30" />
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/30" />
          </div>
        </div>
      </div>
    )
  }

  const realBalance = real.balance
  const demoBalance = demo.balance
  const totalBalance = realBalance + demoBalance
  const availableFunds = Math.round(realBalance * 0.7)
  const invested = realBalance - availableFunds

  const accountCards = [
    { title: "Real account", value: `$${realBalance.toLocaleString()}`, subtitle: "Live funds", icon: Banknote, accent: "text-primary", badge: "Live" },
    { title: "Demo account", value: `$${demoBalance.toLocaleString()}`, subtitle: "Practice balance", icon: CircleDollarSign, accent: "text-amber-600 dark:text-amber-400", badge: "Demo" },
    { title: "Available", value: `$${availableFunds.toLocaleString()}`, subtitle: "Ready to deploy", icon: Wallet, accent: "text-emerald-600 dark:text-emerald-400", badge: "Liquid" },
    { title: "Invested", value: `$${invested.toLocaleString()}`, subtitle: "In clusters", icon: Layers3, accent: "text-blue-600 dark:text-blue-400", badge: "Active" },
  ]

  const displayClusters = clusters.slice(0, 3).map((cluster) => ({
    id: cluster.id,
    name: cluster.name,
    progress: Math.round(cluster.metrics?.progress ?? 0),
    invested: cluster.metrics?.filledValue ?? 0,
    target: cluster.metrics?.brutLiquidity ?? 0,
    status: cluster.status,
    symbol: cluster.symbol,
  }))

  const recentTransactions = [...real.transactions]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 5)

  const trendPoints = recentTransactions.length > 0
    ? recentTransactions
        .slice()
        .reverse()
        .map((tx, index) => ({ index, value: Number(tx.balanceAfter || totalBalance || 0) }))
    : [{ index: 0, value: totalBalance }, { index: 1, value: totalBalance }]

  const formatDate = (value) => {
    if (!value) return "—"
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Portfolio overview"
        icon={Sparkles}
        title="Dashboard"
        description="Your accounts, clusters and recent activity, in one place."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {accountCards.map((card) => (
          <StatCard key={card.title} label={card.title} value={card.value} description={card.subtitle} icon={card.icon} accent={card.accent} badge={card.badge} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Balance trend
            </CardTitle>
            <CardDescription>Latest movements across your real account</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tracking-tight text-foreground">${totalBalance.toLocaleString()}</p>
            <TrendChart data={trendPoints} height={140} />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-primary" />
              Active clusters
            </CardTitle>
            <CardDescription>Open clusters and current progress</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {displayClusters.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Layers3} title="No clusters yet" description="Published clusters will show up here." />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayClusters.map((cluster) => (
                  <Link
                    key={cluster.id ?? cluster.name}
                    href={`/market/${cluster.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {cluster.symbol.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{cluster.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{cluster.symbol} • {cluster.progress}% filled</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-primary">${cluster.invested.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{cluster.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Recent activity
            </CardTitle>
            <CardDescription>Latest updates around your accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, index) => {
                const isDebit = tx.type === "debit"
                return (
                  <div key={`${tx.description || tx.type || "transaction"}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isDebit ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                        {isDebit ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tx.description || tx.type || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isDebit ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {isDebit ? "-" : "+"}${Number(tx.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance {Number(tx.balanceAfter || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState icon={Clock3} title="No activity yet" description="Deposits, withdrawals and investments will show up here." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Quick actions
            </CardTitle>
            <CardDescription>Jump to what you need</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <action.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

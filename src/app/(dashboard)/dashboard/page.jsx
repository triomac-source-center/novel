"use client"
import Link from "next/link"
import { useMemo } from "react"
import useSWR from "swr"
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
  // Use the backend's actual field names directly. The previous fallback chains (e.g.
  // `cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume`) accidentally
  // picked up `cluster.cells` — the raw cell-objects ARRAY the API always returns — before ever
  // reaching `expVolume`, since `??` only skips null/undefined and an array is neither. `Number(array)`
  // is NaN, which zeroed out every downstream liquidity figure. This is what showed "$0" for every
  // real cluster on the dashboard.
  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.expVolume ?? 10),
    cellValue: Number(cluster.entryPoint ?? 1000),
    filledCells: Number(cluster.holderPoint ?? 0),
    currentLayer: Number(cluster.currentLayer ?? 1),
    maxLayers: Number(cluster.maxLayers ?? 1),
    layerStep: Number(cluster.layerStep ?? 0),
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
  const { real, demo, loading: walletLoading, error: walletError, refresh: refreshWallet } = useWallet()
  // Same "clusters" SWR key as the Trade page and market/[id]'s invest handler: a trade made on
  // the cluster detail page calls the global mutate("clusters") right after it succeeds, so the
  // actor sees it immediately. The short refreshInterval on top of that is what makes changes made
  // by OTHER users (e.g. someone else buying into a cluster you're watching) show up live without
  // an F5 — safe to poll now that the loading gate below settles on data/error, not a raw flag, so
  // a background refresh can never re-trigger the skeleton or flash stale zeros.
  const { data, isLoading: clustersIsLoading } = useSWR("clusters", fetchClusters, {
    revalidateOnFocus: true,
    refreshInterval: 5000,
  })
  // Same reasoning as WalletProvider: `isLoading` clears after the first attempt settles even on
  // failure, so gate the skeleton on data presence instead of the flag alone.
  const clustersLoading = !data && clustersIsLoading
  const clusters = useMemo(() => {
    const payload = Array.isArray(data?.data) ? data.data.filter((c) => c.status !== "offline") : []
    return payload.map((cluster, index) => normalizeCluster(cluster, index))
  }, [data])

  if (!user) return null
  if (!isSignedIn) return <p>Please log in</p>
  if (walletError) {
    return (
      <div className="bgmain p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/30 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Couldn&apos;t reach the server</p>
            <p className="text-xs text-muted-foreground">The account service didn&apos;t respond. It may still be waking up.</p>
            <button
              type="button"
              onClick={() => refreshWallet()}
              className="mt-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
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

  // The trend must track the real account balance specifically — not real+demo combined, which
  // would make the chart jump for reasons that have nothing to do with the real balance.
  const trendPoints = recentTransactions.length > 0
    ? recentTransactions
        .slice()
        .reverse()
        .map((tx, index) => ({ index, value: Number(tx.balanceAfter ?? realBalance) }))
    : [{ index: 0, value: realBalance }, { index: 1, value: realBalance }]

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
            <p className="mb-2 text-2xl font-semibold tracking-tight text-foreground">${realBalance.toLocaleString()}</p>
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

"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@clerk/nextjs"
import { fetchAccount, fetchClusters } from "@/lib/api-client"
import { calculateClusterMetrics } from "@/lib/cluster-utils"
import { TrendingUp, Wallet, Sparkles, Layers3, Activity, CircleDollarSign, Banknote, Clock3 } from "lucide-react"

const fallbackClusters = [
  { id: "cluster-alpha", name: "Triomac 60", progress: 78, invested: 12800, target: 20000, status: "Open", symbol: "TRI-01" },
  { id: "cluster-beta", name: "Alpha Cell", progress: 54, invested: 8400, target: 16000, status: "Open", symbol: "TRI-02" },
  { id: "cluster-gamma", name: "Momentum X", progress: 92, invested: 15400, target: 18000, status: "Closing", symbol: "TRI-03" },
]

function getClusterId(cluster, index) {
  return cluster.id ?? cluster._id ?? cluster.signature ?? `cluster-${index + 1}`
}

function normalizeCluster(cluster, index) {
  const metrics = calculateClusterMetrics({
    cellCount: Number(cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume ?? 10),
    cellValue: Number(cluster.cellValue ?? cluster.valuePerCell ?? cluster.entryPoint ?? cluster.recette ?? 1000),
    filledCells: Number(cluster.filledCells ?? cluster.filled ?? cluster.holderPoint ?? cluster.actualVolume ?? 0),
  })

  return {
    id: getClusterId(cluster, index),
    name: cluster.name ?? `Cluster ${index + 1}`,
    symbol: cluster.symbol ?? `TRI-${String(index + 1).padStart(2, "0")}`,
    status: cluster.status ?? (metrics.isClosed ? "Closed" : "Open"),
    cellCount: Number(cluster.cellCount ?? cluster.totalCells ?? cluster.cells ?? cluster.expVolume ?? 10),
    cellValue: Number(cluster.cellValue ?? cluster.valuePerCell ?? cluster.entryPoint ?? cluster.recette ?? 1000),
    filledCells: Number(cluster.filledCells ?? cluster.filled ?? cluster.holderPoint ?? cluster.actualVolume ?? 0),
    creator: cluster.creator ?? "triomac60",
    description: cluster.description ?? "Cluster ready for investment.",
    metrics,
  }
}

export default function DashboardPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const [userData, setUserData] = useState(null)
  const [clusters, setClusters] = useState([])
  const [accountLoading, setAccountLoading] = useState(true)
  const [clustersLoading, setClustersLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return

    let isActive = true

    async function fetchUser() {
      try {
        setAccountLoading(true)
        setError("")
        const data = await fetchAccount(clerkUser.id, "real")
        if (isActive) {
          setUserData({
            ...data,
            username: data?.username || data?.name || clerkUser?.fullName || "User",
            email: data?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || "",
            wallet: {
              ...(data?.wallet || {}),
              balance: Number(data?.wallet?.balance ?? data?.balance ?? data?.account?.balance ?? 0),
            },
          })
        }
      } catch (err) {
        console.error(err)
        if (isActive) {
          setUserData({
            username: clerkUser?.fullName || "User",
            email: clerkUser?.emailAddresses?.[0]?.emailAddress || "",
            wallet: { balance: 0, transactions: [] },
          })
          setError("")
        }
      } finally {
        if (isActive) {
          setAccountLoading(false)
        }
      }
    }

    fetchUser()
    return () => {
      isActive = false
    }
  }, [clerkUser?.id, isSignedIn])

  useEffect(() => {
    let isActive = true

    async function loadClusters() {
      try {
        setClustersLoading(true)
        const data = await fetchClusters()
        const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
        const normalized = payload.map((cluster, index) => normalizeCluster(cluster, index))

        if (isActive) {
          setClusters(normalized.length > 0 ? normalized : [])
        }
      } catch (err) {
        console.error(err)
        if (isActive) {
          setClusters([])
        }
      } finally {
        if (isActive) {
          setClustersLoading(false)
        }
      }
    }

    loadClusters()
    return () => {
      isActive = false
    }
  }, [])

  if (!user) return null
  if (!isSignedIn) return <p>Please log in</p>
  if (accountLoading || clustersLoading) {
    return (
      <div className="p-6 lg:p-8 bgmain">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-24 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
          <div className="grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-32 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
            <div className="h-80 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
          </div>
        </div>
      </div>
    )
  }

  if (!userData) return <p>User not found</p>

  const realBalance = Number(userData?.accounts?.real?.balance ?? userData?.wallet?.balance ?? 0)
  const demoBalance = Number(userData?.accounts?.demo?.balance ?? 10000)
  const totalBalance = realBalance + demoBalance
  const availableFunds = Math.round(totalBalance * 0.7)
  const invested = totalBalance - availableFunds

  const accountCards = [
    {
      title: "Real Account",
      value: `$${realBalance.toLocaleString()}`,
      subtitle: "Live funds",
      icon: Banknote,
      accent: "text-primary",
      badge: "Live",
    },
    {
      title: "Demo Account",
      value: `$${demoBalance.toLocaleString()}`,
      subtitle: "Practice balance",
      icon: CircleDollarSign,
      accent: "text-amber-400",
      badge: "Demo",
    },
    {
      title: "Available",
      value: `$${availableFunds.toLocaleString()}`,
      subtitle: "Ready to deploy",
      icon: Wallet,
      accent: "text-emerald-400",
      badge: "Liquid",
    },
    {
      title: "Invested",
      value: `$${invested.toLocaleString()}`,
      subtitle: "In clusters",
      icon: Layers3,
      accent: "text-blue-400",
      badge: "Active",
    },
  ]

  const displayClusters = clusters.length
    ? clusters.slice(0, 3).map((cluster) => ({
        id: cluster.id,
        name: cluster.name,
        progress: Math.round(cluster.metrics?.progress ?? 0),
        invested: cluster.metrics?.filledValue ?? 0,
        target: cluster.metrics?.brutLiquidity ?? 0,
        status: cluster.status,
        symbol: cluster.symbol,
      }))
    : fallbackClusters

  const transactions = Array.isArray(userData?.account?.transactions)
    ? userData.account.transactions
    : Array.isArray(userData?.wallet?.transactions)
      ? userData.wallet.transactions
      : []

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    .slice(0, 4)

  const trendPoints = recentTransactions.length > 0
    ? recentTransactions
        .slice()
        .reverse()
        .map((tx, index) => ({ index, value: Number(tx.balanceAfter || totalBalance || 0) }))
    : [{ index: 0, value: totalBalance }, { index: 1, value: totalBalance + 1200 }]

  const chartMax = Math.max(...trendPoints.map((point) => point.value), totalBalance || 1)
  const chartMin = Math.min(...trendPoints.map((point) => point.value), 0)
  const chartHeight = 80
  const chartWidth = 220
  const chartRange = chartMax - chartMin || 1
  const trendPath = trendPoints
    .map((point, index) => {
      const x = trendPoints.length > 1 ? (index / (trendPoints.length - 1)) * chartWidth : chartWidth / 2
      const y = chartHeight - ((point.value - chartMin) / chartRange) * chartHeight
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  const formatDate = (value) => {
    if (!value) return "—"
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  return (
    <div className="p-6 lg:p-8 bgmain">
      <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background/70 to-background p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Portfolio overview</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Everything is now gathered in one place: your accounts, clusters, recent actions and momentum.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Balance trend</p>
              <p className="text-lg font-semibold text-white">+$3.2k this week</p>
            </div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-16 w-40">
              <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {accountCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <CardDescription>{card.subtitle}</CardDescription>
                </div>
                <div className={`rounded-full bg-background/70 p-2 ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{card.badge}</Badge>
                  <span className="text-xs text-muted-foreground">Updated now</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-primary" />
              Active Clusters
            </CardTitle>
            <CardDescription>Open clusters and current progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayClusters.map((cluster) => (
              <div key={cluster.id ?? cluster.name} className="rounded-xl border border-border/50 bg-background/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{cluster.name}</p>
                    <p className="text-xs text-muted-foreground">{cluster.symbol} • {cluster.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">${cluster.invested.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${cluster.progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{cluster.progress}% filled</span>
                  <span>Target: ${cluster.target.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates around your accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx, index) => (
                <div key={`${tx.description || tx.type || "transaction"}-${index}`} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/60 px-3 py-3">
                  <div>
                    <p className="font-medium text-foreground">{tx.description || tx.type || "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === "debit" ? "text-destructive" : "text-primary"}`}>
                      {tx.type === "debit" ? "-" : "+"}${Number(tx.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Balance {Number(tx.balanceAfter || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No transactions yet for this account.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump directly to wallet, market or transactions</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <a href="/wallet" className="rounded-xl border border-border/50 bg-background/60 p-3 hover:bg-primary/10">
              <p className="font-medium">Go to Wallet</p>
              <p className="text-xs text-muted-foreground">Manage real and demo balances</p>
            </a>
            <a href="/market" className="rounded-xl border border-border/50 bg-background/60 p-3 hover:bg-primary/10">
              <p className="font-medium">Open Market</p>
              <p className="text-xs text-muted-foreground">See available clusters</p>
            </a>
            <a href="/transactions" className="rounded-xl border border-border/50 bg-background/60 p-3 hover:bg-primary/10">
              <p className="font-medium">View Transactions</p>
              <p className="text-xs text-muted-foreground">See account history</p>
            </a>
            <a href="/profile" className="rounded-xl border border-border/50 bg-background/60 p-3 hover:bg-primary/10">
              <p className="font-medium">Profile</p>
              <p className="text-xs text-muted-foreground">Manage your personal info</p>
            </a>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Snapshot
            </CardTitle>
            <CardDescription>This week’s summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 to-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Latest balance trend</p>
                  <p className="text-xl font-semibold text-white">${totalBalance.toLocaleString()}</p>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">Live</div>
              </div>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-20 w-full">
                <path d={trendPath} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
              </svg>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Success rate</p>
                <p className="mt-1 text-lg font-semibold text-white">84%</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Hold time</p>
                <p className="mt-1 text-lg font-semibold text-white">3.2d</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Signals</p>
                <p className="mt-1 text-lg font-semibold text-white">+7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

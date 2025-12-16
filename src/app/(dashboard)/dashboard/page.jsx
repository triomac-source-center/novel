"use client"
import {  useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Activity, Wallet, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/mainheader"
import { Sidebar } from "@/components/mainsidebar"
import { useUser } from "@clerk/nextjs"
import MainLayoutDashboard from "../layout"

export default function DashboardPage() {

  const { user: clerkUser, isSignedIn } = useUser();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth()
  const [showBalance, setShowBalance] = useState(true)

  useEffect(() => {
    if (!clerkUser) return;

    async function fetchUser() {
      try {
        const res = await fetch(`https://novel-server-cdcp.onrender.com/api/${clerkUser.id}`);
        const data = await res.json();
        setUserData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [clerkUser]);

  if (!user) {
    return null
  }

  if (!isSignedIn) return <p>Please log in</p>;
  if (loading) return <p>Loading...</p>;
  if (!userData) return <p>User not found</p>;

  if (!user) {
    return null
  }

  const stats = [
    {
      title: "Total Balance",
      value: `$${user.balance.toLocaleString()}`,
      change: "+12.5%",
      isPositive: true,
      icon: DollarSign,
    },
    {
      title: "Total Profit",
      value: "$4,100",
      change: "+8.2%",
      isPositive: true,
      icon: TrendingUp,
    },
    {
      title: "Active Positions",
      value: "12",
      change: "+3",
      isPositive: true,
      icon: Activity,
    },
    {
      title: "Available Funds",
      value: `$${(user.balance * 0.7).toLocaleString()}`,
      change: "-5.1%",
      isPositive: false,
      icon: Wallet,
    },
  ]

  const positions = [
    { symbol: "AAPL", name: "Apple Inc.", shares: 50, avgPrice: 170, currentPrice: 178.72, type: "long" },
    { symbol: "GOOGL", name: "Alphabet Inc.", shares: 30, avgPrice: 140, currentPrice: 142.83, type: "long" },
    { symbol: "TSLA", name: "Tesla Inc.", shares: 20, avgPrice: 252, currentPrice: 248.42, type: "short" },
    { symbol: "MSFT", name: "Microsoft Corp.", shares: 40, avgPrice: 365, currentPrice: 378.91, type: "long" },
    { symbol: "AMZN", name: "Amazon.com", shares: 25, avgPrice: 175, currentPrice: 178.35, type: "long" },
    { symbol: "NVDA", name: "NVIDIA Corp.", shares: 15, avgPrice: 480, currentPrice: 495.22, type: "long" },
    { symbol: "META", name: "Meta Platforms", shares: 10, avgPrice: 520, currentPrice: 512.42, type: "short" },
    { symbol: "JPM", name: "JPMorgan Chase", shares: 60, avgPrice: 195, currentPrice: 198.73, type: "long" },
  ]

  const pendingOrders = [
    { symbol: "AAPL", type: "Buy Limit", price: 175.0, shares: 25, status: "pending" },
    { symbol: "TSLA", type: "Sell Stop", price: 245.0, shares: 10, status: "pending" },
    { symbol: "NVDA", type: "Buy Limit", price: 490.0, shares: 5, status: "pending" },
    { symbol: "META", type: "Sell Limit", price: 515.0, shares: 8, status: "pending" },
  ]

  const watchlist = [
    { symbol: "NFLX", price: 478.32, change: 2.34 },
    { symbol: "DIS", price: 93.42, change: -0.87 },
    { symbol: "COIN", price: 245.83, change: 5.21 },
    { symbol: "AMD", price: 182.45, change: 1.92 },
    { symbol: "INTC", price: 43.21, change: -1.23 },
    { symbol: "PYPL", price: 62.34, change: 0.45 },
  ]

  const marketStats = [
    { name: "S&P 500", value: "5,234.18", change: "+0.82%" },
    { name: "Nasdaq", value: "16,832.62", change: "+1.21%" },
    { name: "Dow Jones", value: "39,512.84", change: "+0.45%" },
    { name: "VIX", value: "13.42", change: "-2.34%" },
  ]


  return (
    <MainLayoutDashboard>
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{userData.firstName}</h1>
          <p className="text-muted-foreground">Welcome back, {userData.lastname}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowBalance(!showBalance)}>
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData ? userData.wallet.balance  : "••••••"}</div>
              <p className="flex items-center text-xs text-muted-foreground">
                {stat.isPositive ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-primary" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-destructive" />
                )}
                <span className={stat.isPositive ? "text-primary" : "text-destructive"}>{stat.change}</span>
                <span className="ml-1">from last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Indices */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {marketStats.map((stat) => (
          <Card key={stat.name} className="border-border/50 bg-secondary/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.name}</p>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-lg font-bold">{stat.value}</p>
                <p
                  className={`text-sm font-medium ${stat.change.startsWith("+") ? "text-primary" : "text-destructive"}`}
                >
                  {stat.change}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Positions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
            <CardDescription>Your current trading positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positions.map((position) => {
                const profit =
                  (position.currentPrice - position.avgPrice) * position.shares * (position.type === "short" ? -1 : 1)
                const profitPercent =
                  ((position.currentPrice - position.avgPrice) / position.avgPrice) *
                  100 *
                  (position.type === "short" ? -1 : 1)
                return (
                  <div
                    key={position.symbol}
                    className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                        {position.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{position.symbol}</p>
                          <Badge variant={position.type === "long" ? "default" : "destructive"} className="text-xs">
                            {position.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {position.shares} shares @ ${position.avgPrice}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${position.currentPrice.toFixed(2)}</p>
                      <p className={`text-xs ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                        {profit >= 0 ? "+" : ""}
                        {profit.toFixed(0)} ({profitPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Orders waiting to be executed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOrders.map((order, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-sm font-semibold">
                      {order.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.symbol}</p>
                        <Badge variant="outline" className="text-xs">
                          {order.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.shares} shares @ ${order.price}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Watchlist */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Stocks you're monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {watchlist.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                      {stock.symbol.substring(0, 2)}
                    </div>
                    <p className="font-medium">{stock.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${stock.price.toFixed(2)}</p>
                    <p className={`text-xs ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}>
                      {stock.change >= 0 ? "+" : ""}
                      {stock.change.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Summary */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>Breakdown of your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total Equity</span>
                <span className="font-semibold">${showBalance ? user.balance.toLocaleString() : "••••••"}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Cash Balance</span>
                <span className="font-semibold">${showBalance ? (user.balance * 0.7).toLocaleString() : "••••••"}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Margin Used</span>
                <span className="font-semibold">${showBalance ? (user.balance * 0.3).toLocaleString() : "••••••"}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Day's P/L</span>
                <span className="font-semibold text-primary">+$432.18</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total P/L</span>
                <span className="font-semibold text-primary">+$4,100.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span className="font-semibold">68.4%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </MainLayoutDashboard>
  )
}

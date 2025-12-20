"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
// import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRight, ArrowDownRight, Search, TrendingUp, TrendingDown, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@clerk/nextjs"

const marketData = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.72,
    change: 2.34,
    changePercent: 1.33,
    volume: "52.3M",
    category: "tech",
    marketCap: "2.8T",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 142.83,
    change: 1.87,
    changePercent: 1.32,
    volume: "28.1M",
    category: "tech",
    marketCap: "1.8T",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.42,
    change: -3.21,
    changePercent: -1.28,
    volume: "118.5M",
    category: "auto",
    marketCap: "788B",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 378.91,
    change: 4.12,
    changePercent: 1.1,
    volume: "23.7M",
    category: "tech",
    marketCap: "2.9T",
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.35,
    change: 2.15,
    changePercent: 1.22,
    volume: "45.2M",
    category: "tech",
    marketCap: "1.8T",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 495.22,
    change: 8.73,
    changePercent: 1.79,
    volume: "62.8M",
    category: "tech",
    marketCap: "1.2T",
  },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    price: 512.42,
    change: -2.85,
    changePercent: -0.55,
    volume: "18.3M",
    category: "tech",
    marketCap: "1.3T",
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    price: 198.73,
    change: 1.42,
    changePercent: 0.72,
    volume: "9.8M",
    category: "finance",
    marketCap: "582B",
  },
  {
    symbol: "BAC",
    name: "Bank of America",
    price: 38.92,
    change: 0.34,
    changePercent: 0.88,
    volume: "41.2M",
    category: "finance",
    marketCap: "298B",
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil",
    price: 112.38,
    change: -0.92,
    changePercent: -0.81,
    volume: "15.7M",
    category: "energy",
    marketCap: "468B",
  },
  {
    symbol: "CVX",
    name: "Chevron Corp.",
    price: 152.34,
    change: -1.23,
    changePercent: -0.8,
    volume: "8.4M",
    category: "energy",
    marketCap: "282B",
  },
  {
    symbol: "WMT",
    name: "Walmart Inc.",
    price: 168.54,
    change: 1.87,
    changePercent: 1.12,
    volume: "7.2M",
    category: "retail",
    marketCap: "458B",
  },
  {
    symbol: "PG",
    name: "Procter & Gamble",
    price: 162.45,
    change: 0.92,
    changePercent: 0.57,
    volume: "5.8M",
    category: "consumer",
    marketCap: "385B",
  },
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    price: 152.83,
    change: -0.45,
    changePercent: -0.29,
    volume: "6.1M",
    category: "healthcare",
    marketCap: "376B",
  },
  {
    symbol: "V",
    name: "Visa Inc.",
    price: 275.92,
    change: 3.21,
    changePercent: 1.18,
    volume: "6.9M",
    category: "finance",
    marketCap: "568B",
  },
  {
    symbol: "MA",
    name: "Mastercard Inc.",
    price: 456.73,
    change: 4.82,
    changePercent: 1.07,
    volume: "2.9M",
    category: "finance",
    marketCap: "428B",
  },
  {
    symbol: "UNH",
    name: "UnitedHealth Group",
    price: 528.34,
    change: 2.45,
    changePercent: 0.47,
    volume: "2.3M",
    category: "healthcare",
    marketCap: "488B",
  },
  {
    symbol: "HD",
    name: "Home Depot",
    price: 385.92,
    change: -1.34,
    changePercent: -0.35,
    volume: "3.1M",
    category: "retail",
    marketCap: "392B",
  },
  {
    symbol: "DIS",
    name: "Walt Disney Co.",
    price: 93.42,
    change: -0.87,
    changePercent: -0.92,
    volume: "11.2M",
    category: "entertainment",
    marketCap: "171B",
  },
  {
    symbol: "NFLX",
    name: "Netflix Inc.",
    price: 478.32,
    change: 5.92,
    changePercent: 1.25,
    volume: "4.8M",
    category: "entertainment",
    marketCap: "208B",
  },
  {
    symbol: "ADBE",
    name: "Adobe Inc.",
    price: 562.83,
    change: 7.21,
    changePercent: 1.3,
    volume: "2.5M",
    category: "tech",
    marketCap: "258B",
  },
  {
    symbol: "CRM",
    name: "Salesforce Inc.",
    price: 285.42,
    change: 3.82,
    changePercent: 1.36,
    volume: "5.2M",
    category: "tech",
    marketCap: "278B",
  },
  {
    symbol: "INTC",
    name: "Intel Corp.",
    price: 43.21,
    change: -0.52,
    changePercent: -1.19,
    volume: "42.8M",
    category: "tech",
    marketCap: "182B",
  },
  {
    symbol: "AMD",
    name: "Advanced Micro",
    price: 182.45,
    change: 3.42,
    changePercent: 1.91,
    volume: "68.4M",
    category: "tech",
    marketCap: "294B",
  },
  {
    symbol: "PYPL",
    name: "PayPal Holdings",
    price: 62.34,
    change: 0.82,
    changePercent: 1.33,
    volume: "12.4M",
    category: "finance",
    marketCap: "67B",
  },
  {
    symbol: "COIN",
    name: "Coinbase Global",
    price: 245.83,
    change: 12.34,
    changePercent: 5.29,
    volume: "15.8M",
    category: "crypto",
    marketCap: "58B",
  },
  {
    symbol: "SQ",
    name: "Block Inc.",
    price: 78.92,
    change: 2.14,
    changePercent: 2.79,
    volume: "9.2M",
    category: "finance",
    marketCap: "46B",
  },
  {
    symbol: "UBER",
    name: "Uber Technologies",
    price: 78.34,
    change: 1.92,
    changePercent: 2.51,
    volume: "24.3M",
    category: "transportation",
    marketCap: "158B",
  },
  {
    symbol: "ABNB",
    name: "Airbnb Inc.",
    price: 142.83,
    change: -1.23,
    changePercent: -0.85,
    volume: "6.2M",
    category: "travel",
    marketCap: "90B",
  },
  {
    symbol: "SHOP",
    name: "Shopify Inc.",
    price: 74.21,
    change: 2.82,
    changePercent: 3.95,
    volume: "8.9M",
    category: "tech",
    marketCap: "93B",
  },
  {
    symbol: "SPOT",
    name: "Spotify Technology",
    price: 312.45,
    change: 8.23,
    changePercent: 2.71,
    volume: "3.2M",
    category: "entertainment",
    marketCap: "59B",
  },
  {
    symbol: "ZM",
    name: "Zoom Video",
    price: 68.92,
    change: 1.42,
    changePercent: 2.11,
    volume: "5.4M",
    category: "tech",
    marketCap: "20B",
  },
  {
    symbol: "DOCU",
    name: "DocuSign Inc.",
    price: 56.34,
    change: 0.92,
    changePercent: 1.66,
    volume: "4.1M",
    category: "tech",
    marketCap: "11B",
  },
  {
    symbol: "SNAP",
    name: "Snap Inc.",
    price: 11.23,
    change: -0.34,
    changePercent: -2.94,
    volume: "28.4M",
    category: "social",
    marketCap: "17B",
  },
  {
    symbol: "TWTR",
    name: "Twitter Inc.",
    price: 42.83,
    change: 1.23,
    changePercent: 2.96,
    volume: "15.2M",
    category: "social",
    marketCap: "32B",
  },
  {
    symbol: "PINS",
    name: "Pinterest Inc.",
    price: 28.92,
    change: 0.82,
    changePercent: 2.92,
    volume: "12.8M",
    category: "social",
    marketCap: "19B",
  },
]

const topData = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.72,
    change: 2.34,
    changePercent: 1.33,
    volume: "52.3M",
    category: "tech",
    marketCap: "2.8T",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 142.83,
    change: 1.87,
    changePercent: 1.32,
    volume: "28.1M",
    category: "tech",
    marketCap: "1.8T",
  }
]

const positions = [
    { symbol: "aapl", name: "Apple Inc.", shares: 50, avgPrice: 170, currentPrice: 178.72, type: "long" },
    { symbol: "googl", name: "Alphabet Inc.", shares: 30, avgPrice: 140, currentPrice: 142.83, type: "long" },
    { symbol: "tsla", name: "Tesla Inc.", shares: 20, avgPrice: 252, currentPrice: 248.42, type: "short" },
    { symbol: "msft", name: "Microsoft Corp.", shares: 40, avgPrice: 365, currentPrice: 378.91, type: "long" }
  ]

  const pendingOrders = [
    { symbol: "aapl", type: "Buy Limit", price: 175.0, shares: 25, status: "pending" },
    { symbol: "tsla", type: "Sell Stop", price: 245.0, shares: 10, status: "pending" },
    { symbol: "nvda", type: "Buy Limit", price: 490.0, shares: 5, status: "pending" },
    { symbol: "meta", type: "Sell Limit", price: 515.0, shares: 8, status: "pending" },
  ]
export default function MarketPage() {

  const { user: clerkUser, isSignedIn } = useUser();
  const [userData, setUserData] = useState(null);
  const { user } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStock, setSelectedStock] = useState(marketData[0])
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (!clerkUser) return;

    async function fetchUser() {
      try {
        const res = await fetch(`https://novel-server-cdcp.onrender.com/api/all/clusters`);
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

  if (!isSignedIn) return <p>Please log in</p>;
  if (loading) return <p>Loading...</p>;
  if (!userData) return <p>User not found</p>;


  const filteredData = marketData.filter((stock) => {
    const matchesSearch =
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === "all" || stock.category === activeTab
    return matchesSearch && matchesTab
  })

  const topGainers = [...marketData].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5)
  const topLosers = [...marketData].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5)
  const mostActive = [...marketData]
    .sort((a, b) => Number.parseFloat(b.volume) - Number.parseFloat(a.volume))
    .slice(0, 5)

  return (
        <div className="p-6 lg:p-8 bgmain">
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                          {/* <Badge variant={position.type === "long" ? "default" : "destructive"} className="text-xs">
                            {position.type}
                          </Badge> */}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {position.shares} shares @ ${position.avgPrice}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${position.currentPrice.toFixed(2)}</p>
                      <p className={`text-xs font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                        online
                      </p>
                    </div>
                  </div>
                )
              })}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                          offline
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.shares} shares | ${order.price}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    complete
                  </Badge>
                </div>
              ))}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Most Active
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topData.map((stock) => (
                      <button
                        key={stock.symbol}
                        className={`w-full border-b border-border/50 p-4 text-left transition-colors bg-accent`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{stock.symbol}</p>
                              <Badge variant="outline" className="text-xs">
                                {stock.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">Vol: {stock.volume}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-semibold">${stock.price}</p>
                            <p
                              className={`flex items-center justify-end text-sm ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}
                            >
                              {stock.change >= 0 ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {stock.change >= 0 ? "+" : ""}
                              {stock.change.toFixed(2)} ({stock.changePercent >= 0 ? "+" : ""}
                              {stock.changePercent.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Market List */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Markets</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search stocks..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent p-0 flex-wrap h-auto">
                      <TabsTrigger
                        value="all"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        All
                      </TabsTrigger>
                      <TabsTrigger
                        value="tech"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        Tech
                      </TabsTrigger>
                      <TabsTrigger
                        value="finance"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        Finance
                      </TabsTrigger>
                      <TabsTrigger
                        value="energy"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        Energy
                      </TabsTrigger>
                      <TabsTrigger
                        value="healthcare"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        Health
                      </TabsTrigger>
                      <TabsTrigger
                        value="retail"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        Retail
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="max-h-[800px] overflow-y-auto invisible-scrollbar">
                    {userData.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => setSelectedStock(stock)}
                        className={`w-full border-b border-border/50 p-4 text-left transition-colors hover:bg-accent ${
                          selectedStock.symbol === stock.symbol ? "bg-accent" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{stock.symbol}</p>
                              <Badge variant="outline" className="text-xs">
                                {stock.algorythm}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{stock.algorythm}</p>
                            <p className="text-xs text-muted-foreground mt-1">Vol: {stock.expVolume}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-semibold">${stock.entryPoint}</p>
                            <p
                              className={`flex items-center justify-end text-sm ${stock.holderRemain >= 0 ? "text-primary" : "text-destructive"}`}
                            >
                              {stock.holderRemain >= 0 ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}
                              {stock.holderRemain >= 0 ? "+" : ""}
                              {stock.holderRemain.toFixed(2)} ({stock.actualVolume >= 0 ? "+" : ""}
                              {stock.actualVolume.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Panel */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl">{selectedStock.symbol}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">${selectedStock.price}</p>
                      <p
                        className={`flex items-center justify-end text-sm ${selectedStock.change >= 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {selectedStock.change >= 0 ? (
                          <ArrowUpRight className="mr-1 h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="mr-1 h-4 w-4" />
                        )}
                        {selectedStock.change >= 0 ? "+" : ""}
                        {selectedStock.change.toFixed(2)} ({selectedStock.changePercent >= 0 ? "+" : ""}
                        {selectedStock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Open</p>
                      <p className="text-lg font-semibold">
                        ${(selectedStock.price - selectedStock.change).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">High</p>
                      <p className="text-lg font-semibold">
                        ${(selectedStock.price + Math.abs(selectedStock.change) * 0.5).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Low</p>
                      <p className="text-lg font-semibold">
                        ${(selectedStock.price - Math.abs(selectedStock.change) * 0.8).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Close</p>
                      <p className="text-lg font-semibold">${selectedStock.price.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="text-lg font-semibold">{selectedStock.volume}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">Market Cap</p>
                      <p className="text-lg font-semibold">${selectedStock.marketCap}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">P/E Ratio</p>
                      <p className="text-lg font-semibold">{(Math.random() * 30 + 10).toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">52W High</p>
                      <p className="text-lg font-semibold">${(selectedStock.price * 1.25).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Block */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Place Order</CardTitle>
                  <p className="text-sm text-muted-foreground">Buy or sell {selectedStock.symbol}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        className="h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => router.push(`/market/trade?symbol=${selectedStock.symbol}&type=buy`)}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Buy
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                        onClick={() => router.push(`/market/trade?symbol=${selectedStock.symbol}&type=sell`)}
                      >
                        <TrendingDown className="mr-2 h-4 w-4" />
                        Sell
                      </Button>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className="font-semibold">100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Buying Power</span>
                        <span className="font-semibold">100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Shares</span>
                        <span className="font-semibold">100</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Book Preview */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Order Book</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-primary mb-2">Bids</p>
                      <div className="space-y-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-primary">${(selectedStock.price - (i + 1) * 0.5).toFixed(2)}</span>
                            <span className="text-muted-foreground">{(Math.random() * 1000).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-destructive mb-2">Asks</p>
                      <div className="space-y-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-destructive">
                              ${(selectedStock.price + (i + 1) * 0.5).toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">{(Math.random() * 1000).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
  )
}

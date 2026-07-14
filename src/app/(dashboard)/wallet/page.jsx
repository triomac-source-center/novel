"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, TrendingUp, ShieldCheck, Clock3, RotateCcw, BadgeDollarSign } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { fetchUserProfile, postDeposit, fetchAccount, postFundAccount, postSetDemoBalance } from "@/lib/api-client"

export default function WalletPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const [userData, setUserData] = useState(null)
  const { user, updateUser } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [accountType, setAccountType] = useState("real") // 'real' or 'demo'
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [demoSetAmount, setDemoSetAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 4

  useEffect(() => {
    setMounted(true)
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return

    let isActive = true

    async function loadProfile() {
      try {
        setLoading(true)

        // prefer fetching account by type (demo vs real)
        let data = null
        try {
          data = await fetchAccount(clerkUser.id, accountType)
        } catch (err) {
          // fallback to user profile
          data = await fetchUserProfile(clerkUser.id)
        }

        if (isActive) {
          // If real account and no wallet info, default to zero (new user)
          if (accountType === "real") {
            const balance = data?.wallet?.balance ?? data?.balance ?? 0
            setUserData({ ...(data || {}), wallet: { ...(data?.wallet || {}), balance } })
          } else {
            // demo account: if backend doesn't provide, seed with demo balance
            const balance = data?.wallet?.balance ?? data?.balance ?? 10000
            setUserData({ ...(data || {}), wallet: { ...(data?.wallet || {}), balance } })
          }
        }
      } catch (err) {
        console.error(err)
        if (isActive) {
          setError("Unable to load your wallet data right now.")
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  }, [clerkUser, isSignedIn, accountType])

  if (!mounted || !user) {
    return null
  }

  const balance = userData?.wallet?.balance ?? user?.balance ?? 0
  const transactions = userData?.account?.transactions || userData?.wallet?.transactions || []
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const visibleTransactions = transactions.slice().reverse().slice((page - 1) * pageSize, page * pageSize)
  const chartPoints = transactions.length > 0
    ? transactions.slice().reverse().slice(0, 8).map((tx, index) => {
        const value = Number(tx.balanceAfter || balance || 0)
        return { index, value }
      })
    : [{ index: 0, value: balance }, { index: 1, value: balance }]
  const chartMax = Math.max(...chartPoints.map((point) => point.value), balance || 1)
  const chartMin = Math.min(...chartPoints.map((point) => point.value), 0)
  const chartHeight = 140
  const chartWidth = 320
  const chartPath = chartPoints.map((point, index) => {
    const x = chartPoints.length > 1 ? (index / (chartPoints.length - 1)) * chartWidth : chartWidth / 2
    const range = chartMax - chartMin || 1
    const y = chartHeight - ((point.value - chartMin) / range) * chartHeight
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  const formatDate = (value) => {
    if (!value) return "—"
    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  const handleDeposit = async () => {
    const amount = Number(depositAmount)

    if (!depositAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount")
      return
    }

    try {
      setLoading(true)
      setError("")
      setFeedback("")

      if (accountType === "demo") {
        const result = await postFundAccount({
          clerkId: clerkUser.id,
          amount,
          type: "demo",
          description: "Demo account funding",
        })

        const updatedBalance = result?.balance ?? balance + amount
        setUserData((prev) =>
          prev
            ? {
                ...prev,
                wallet: {
                  ...prev.wallet,
                  balance: updatedBalance,
                },
              }
            : prev
        )
        updateUser({ balance: updatedBalance })
        setDepositAmount("")
        setFeedback(`Demo deposit applied: $${amount.toFixed(2)}`)
      } else {
        await postDeposit({
          clerkId: clerkUser.id,
          amount,
          description: "Wallet deposit",
        })

        const updatedBalance = balance + amount
        setUserData((prev) =>
          prev
            ? {
                ...prev,
                wallet: {
                  ...prev.wallet,
                  balance: updatedBalance,
                },
              }
            : prev
        )
        updateUser({ balance: updatedBalance })
        setDepositAmount("")
        setFeedback(`Deposit successful: $${amount.toFixed(2)}`)
      }
    } catch (err) {
      setError(err.message || "Deposit failed")
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (amount > balance) {
      setError("Insufficient funds")
      return
    }

    const updatedBalance = balance - amount
    updateUser({ balance: updatedBalance })
    setUserData((prev) =>
      prev
        ? {
            ...prev,
            wallet: {
              ...prev.wallet,
              balance: updatedBalance,
            },
          }
        : prev
    )
    setWithdrawAmount("")
    setFeedback(`Withdrawal successful: $${amount.toFixed(2)}`)
    setError("")
  }

  const handleSetDemoBalance = async () => {
    const amount = Number(demoSetAmount)

    if (!demoSetAmount || Number.isNaN(amount) || amount < 0) {
      setError("Please enter a valid demo balance")
      return
    }

    try {
      setLoading(true)
      setError("")
      setFeedback("")

      const result = await postSetDemoBalance({
        clerkId: clerkUser.id,
        amount,
        description: "Demo balance set by user",
      })

      const updatedBalance = result?.balance ?? amount
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              wallet: {
                ...prev.wallet,
                balance: updatedBalance,
              },
            }
          : prev
      )
      updateUser({ balance: updatedBalance })
      setDemoSetAmount("")
      setFeedback(`Demo balance set to $${updatedBalance.toFixed(2)}`)
    } catch (err) {
      setError(err.message || "Could not update demo balance")
    } finally {
      setLoading(false)
    }
  }

  const handleResetDemoBalance = async () => {
    if (!clerkUser?.id) return
    try {
      setLoading(true)
      setError("")
      setFeedback("")
      const result = await postSetDemoBalance({
        clerkId: clerkUser.id,
        amount: 10000,
        description: "Demo balance reset",
      })
      const updatedBalance = result?.balance ?? 10000
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              wallet: {
                ...prev.wallet,
                balance: updatedBalance,
              },
            }
          : prev
      )
      updateUser({ balance: updatedBalance })
      setFeedback("Demo balance reset to $10,000")
    } catch (err) {
      setError(err.message || "Could not reset demo balance")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 bgmain">
      <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background/60 to-background p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Live balance management</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Wallet</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your funds, update the demo balance and keep the sidebar synced automatically.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 p-1">
            <button
              className={`rounded-full px-3 py-1.5 text-sm transition ${accountType === "real" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setAccountType("real")}
            >
              Real
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-sm transition ${accountType === "demo" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setAccountType("demo")}
            >
              Demo
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        {(error || feedback) && (
          <div
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {error || feedback}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="rounded-full bg-primary/20 p-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </div>
                Deposit Funds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pl-7 h-9"
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9"
                  onClick={handleDeposit}
                  disabled={!depositAmount || Number.parseFloat(depositAmount) <= 0 || loading}
                >
                  {loading ? "Processing..." : "Deposit"}
                </Button>
              </div>
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setDepositAmount(amount.toString())}
                    className="flex-1 h-8 text-xs"
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-transparent shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="rounded-full bg-destructive/20 p-2">
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                </div>
                Withdraw Funds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="pl-7 h-9"
                    min="0"
                    step="0.01"
                    max={balance}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9"
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0 || Number.parseFloat(withdrawAmount) > balance}
                >
                  Withdraw
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Available</span>
                <span className="font-semibold text-foreground">${balance.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {accountType === "demo" && (
          <Card className="mt-4 border-primary/30 bg-primary/5 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Set Demo Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={demoSetAmount}
                    onChange={(e) => setDemoSetAmount(e.target.value)}
                    className="pl-7 h-9"
                    min="0"
                    step="0.01"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9"
                  onClick={handleSetDemoBalance}
                  disabled={!demoSetAmount || Number.parseFloat(demoSetAmount) < 0 || loading}
                >
                  {loading ? "Saving..." : "Set balance"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={handleResetDemoBalance}
                  disabled={loading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset demo balance
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Set any value or reset the demo balance back to $10,000.</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-2">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                  <p className="text-xl font-bold">${balance.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Available</p>
                  <p className="text-xl font-bold text-primary">${balance.toLocaleString()}</p>
                </div>
                <div className="rounded-full bg-primary/10 p-2">
                  <BadgeDollarSign className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">In Positions</p>
                  <p className="text-xl font-bold">$0</p>
                </div>
                <div className="rounded-full bg-amber-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Profit/Loss</p>
                  <p className="text-xl font-bold text-primary">+$0</p>
                </div>
                <div className="rounded-full bg-emerald-500/10 p-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="rounded-full bg-primary/20 p-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                </div>
                Recent Transactions
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{accountType === "demo" ? "Demo account" : "Real account"}</span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-background/80 to-background p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Balance trend</p>
                  <p className="text-lg font-semibold text-foreground">${balance.toLocaleString()}</p>
                </div>
                <div className="rounded-full border border-primary/20 bg-background/70 px-2.5 py-1 text-xs text-primary">{transactions.length} updates</div>
              </div>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-36 w-full">
                <path d={chartPath} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
              </svg>
            </div>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  <span>Showing page {page} of {totalPages}</span>
                  <span>{transactions.length} entries</span>
                </div>
                {visibleTransactions.map((tx, index) => (
                  <div key={`${tx.description || tx.type}-${index}`} className="flex items-center justify-between rounded-xl border border-border/40 bg-gradient-to-r from-background/70 to-background/40 px-3 py-3 shadow-sm">
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
                ))}
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No transactions yet for this account.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

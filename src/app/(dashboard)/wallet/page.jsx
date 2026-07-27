"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { EmptyState } from "@/components/empty-state"
import { TrendChart } from "@/components/chart"
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, BadgeDollarSign, RotateCcw, Clock3 } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { fetchUserProfile, postDeposit, fetchAccount, postFundAccount, postSetDemoBalance, postWithdraw } from "@/lib/api-client"

export default function WalletPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const [userData, setUserData] = useState(null)
  const { user, updateUser } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [accountType, setAccountType] = useState("real")
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [demoSetAmount, setDemoSetAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 6

  useEffect(() => {
    setMounted(true)
    if (!user) router.push("/login")
  }, [user, router])

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return
    let isActive = true

    async function loadProfile() {
      try {
        setLoading(true)
        let data = null
        try {
          data = await fetchAccount(clerkUser.id, accountType)
        } catch {
          data = await fetchUserProfile(clerkUser.id)
        }
        if (isActive) {
          const balance = data?.wallet?.balance ?? data?.balance ?? (accountType === "demo" ? 10000 : 0)
          setUserData({ ...(data || {}), wallet: { ...(data?.wallet || {}), balance } })
        }
      } catch (err) {
        console.error(err)
        if (isActive) setError("Unable to load your wallet data right now.")
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadProfile()
    setPage(1)
    return () => {
      isActive = false
    }
  }, [clerkUser, isSignedIn, accountType])

  if (!mounted || !user) return null

  const balance = userData?.wallet?.balance ?? user?.balance ?? 0
  const transactions = userData?.account?.transactions || userData?.wallet?.transactions || []
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize))
  const orderedTransactions = transactions.slice().reverse()
  const visibleTransactions = orderedTransactions.slice((page - 1) * pageSize, page * pageSize)
  const chartPoints = transactions.length > 0
    ? orderedTransactions.slice(0, 10).reverse().map((tx, index) => ({ index, value: Number(tx.balanceAfter || balance || 0) }))
    : [{ index: 0, value: balance }, { index: 1, value: balance }]

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
        const result = await postFundAccount({ clerkId: clerkUser.id, amount, type: "demo", description: "Demo account funding" })
        const updatedBalance = result?.balance ?? balance + amount
        setUserData((prev) => (prev ? { ...prev, wallet: { ...prev.wallet, balance: updatedBalance } } : prev))
        updateUser({ balance: updatedBalance })
        setDepositAmount("")
        setFeedback(`Demo deposit applied: $${amount.toFixed(2)}`)
      } else {
        await postDeposit({ clerkId: clerkUser.id, amount, description: "Wallet deposit" })
        const updatedBalance = balance + amount
        setUserData((prev) => (prev ? { ...prev, wallet: { ...prev.wallet, balance: updatedBalance } } : prev))
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

  const handleWithdraw = async () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }
    if (amount > balance) {
      setError("Insufficient funds")
      return
    }
    if (accountType === "demo") {
      setError("Withdrawals are only available on the real account.")
      return
    }
    if (!clerkUser?.id) {
      setError("You must be logged in to withdraw funds.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await postWithdraw({ clerkId: clerkUser.id, amount, description: "Wallet withdrawal" })
      const updatedBalance = result?.wallet?.balance ?? balance - amount
      updateUser({ balance: updatedBalance })
      setUserData((prev) =>
        prev
          ? { ...prev, wallet: { ...prev.wallet, balance: updatedBalance, transactions: result?.wallet?.transactions || prev.wallet?.transactions } }
          : prev
      )
      setWithdrawAmount("")
      setFeedback(`Withdrawal successful: $${amount.toFixed(2)}`)
    } catch (err) {
      setError(err.message || "Withdrawal failed")
    } finally {
      setLoading(false)
    }
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
      const result = await postSetDemoBalance({ clerkId: clerkUser.id, amount, description: "Demo balance set by user" })
      const updatedBalance = result?.balance ?? amount
      setUserData((prev) => (prev ? { ...prev, wallet: { ...prev.wallet, balance: updatedBalance } } : prev))
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
      const result = await postSetDemoBalance({ clerkId: clerkUser.id, amount: 10000, description: "Demo balance reset" })
      const updatedBalance = result?.balance ?? 10000
      setUserData((prev) => (prev ? { ...prev, wallet: { ...prev.wallet, balance: updatedBalance } } : prev))
      updateUser({ balance: updatedBalance })
      setFeedback("Demo balance reset to $10,000")
    } catch (err) {
      setError(err.message || "Could not reset demo balance")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Live balance management"
        icon={Sparkles}
        title="Wallet"
        description="Manage your funds and switch between your real and demo accounts."
        actions={
          <Tabs value={accountType} onValueChange={setAccountType}>
            <TabsList>
              <TabsTrigger value="real">Real</TabsTrigger>
              <TabsTrigger value="demo">Demo</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {(error || feedback) && (
        <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"}`}>
          {error || feedback}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <StatCard label="Total balance" value={`$${balance.toLocaleString()}`} description={accountType === "demo" ? "Demo balance" : "Real account"} icon={Wallet} />
        <StatCard label="Available" value={`$${balance.toLocaleString()}`} description="Ready to invest" icon={BadgeDollarSign} accent="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/25 bg-primary/[0.04] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="rounded-full bg-primary/20 p-2">
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              Deposit funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" placeholder="0.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="h-9 pl-7" min="0" step="0.01" />
              </div>
              <Button type="button" size="sm" className="h-9" onClick={handleDeposit} disabled={!depositAmount || Number.parseFloat(depositAmount) <= 0 || loading}>
                {loading ? "Processing..." : "Deposit"}
              </Button>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 5000].map((amount) => (
                <Button key={amount} variant="outline" size="sm" onClick={() => setDepositAmount(amount.toString())} className="h-8 flex-1 text-xs">
                  ${amount}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/25 bg-destructive/[0.04] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="rounded-full bg-destructive/20 p-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              Withdraw funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-9 pl-7" min="0" step="0.01" max={balance} />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-9"
                onClick={handleWithdraw}
                disabled={loading || accountType === "demo" || !withdrawAmount || Number.parseFloat(withdrawAmount) <= 0 || Number.parseFloat(withdrawAmount) > balance}
              >
                Withdraw
              </Button>
            </div>
            {accountType === "demo" && <p className="text-xs text-muted-foreground">Switch to your real account to withdraw funds.</p>}
          </CardContent>
        </Card>
      </div>

      {accountType === "demo" && (
        <Card className="mt-4 border-primary/25 bg-primary/[0.04] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Set demo balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" placeholder="10000" value={demoSetAmount} onChange={(e) => setDemoSetAmount(e.target.value)} className="h-9 pl-7" min="0" step="0.01" />
              </div>
              <Button type="button" size="sm" className="h-9" onClick={handleSetDemoBalance} disabled={!demoSetAmount || Number.parseFloat(demoSetAmount) < 0 || loading}>
                {loading ? "Saving..." : "Set balance"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-9" onClick={handleResetDemoBalance} disabled={loading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to $10,000
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock3 className="h-5 w-5 text-primary" />
            Balance trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={chartPoints} height={140} />
        </CardContent>
      </Card>

      <Card className="mt-4 border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <>
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance after</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTransactions.map((tx, index) => (
                      <TableRow key={`${tx.description || tx.type}-${index}`}>
                        <TableCell className="font-medium text-foreground">{tx.description || tx.type || "Transaction"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(tx.createdAt || tx.date)}</TableCell>
                        <TableCell className={`text-right font-semibold ${tx.type === "debit" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {tx.type === "debit" ? "-" : "+"}${Number(tx.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">${Number(tx.balanceAfter || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </>
          ) : (
            <EmptyState icon={Wallet} title="No transactions yet" description="Deposit funds to see your wallet history here." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
import { ArrowUpRight, ArrowDownRight, Wallet, Sparkles, BadgeDollarSign, RotateCcw, Clock3, Copy, Check } from "lucide-react"
import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs"
import { useWallet } from "@/lib/wallet-context"
import { useToast } from "@/lib/toast-context"
import { postFundAccount, postSetDemoBalance, fetchDepositAddress, postWithdrawCrypto } from "@/lib/api-client"

export default function WalletPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { getToken } = useClerkAuth()
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const { real, demo, setBalance, refresh } = useWallet()
  const [mounted, setMounted] = useState(false)
  const [accountType, setAccountType] = useState("real")
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawToAddress, setWithdrawToAddress] = useState("")
  const [demoSetAmount, setDemoSetAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 6

  // Crypto deposit-address flow (real account only) — separate from `loading` above so it doesn't
  // fight with the demo-tab buttons for the same flag.
  const [depositAddress, setDepositAddress] = useState(null)
  const [depositAddressLoading, setDepositAddressLoading] = useState(false)
  const [depositAddressError, setDepositAddressError] = useState("")
  const [addressCopied, setAddressCopied] = useState(false)

  // Real-money crypto withdrawal flow — separate loading/result state from the mocked handleWithdraw
  // below, since this one calls a different, auth-gated endpoint.
  const [withdrawCryptoLoading, setWithdrawCryptoLoading] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState(null)

  useEffect(() => {
    setMounted(true)
    if (!user) router.push("/login")
  }, [user, router])

  useEffect(() => {
    setPage(1)
  }, [accountType])

  if (!mounted || !user) return null

  const account = accountType === "demo" ? demo : real
  const balance = account.balance
  const transactions = account.transactions.filter((tx) => !tx.category || tx.category === "wallet")
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
    // Real-account deposits no longer go through this amount-based mock flow — see
    // handleGetDepositAddress below. This handler now only serves the demo tab.
    const amount = Number(depositAmount)
    if (!depositAmount || Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid deposit amount")
      return
    }

    try {
      setLoading(true)
      const result = await postFundAccount({ clerkId: clerkUser.id, amount, type: "demo", description: "Demo account funding" })
      setBalance("demo", result?.balance ?? balance + amount, result?.wallet?.transactions)
      setDepositAmount("")
      toast.success(`Demo deposit applied: $${amount.toFixed(2)}`)
    } catch (err) {
      toast.error(err.message || "Deposit failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGetDepositAddress = async () => {
    if (!clerkUser?.id) {
      toast.error("You must be logged in to get a deposit address.")
      return
    }
    try {
      setDepositAddressLoading(true)
      setDepositAddressError("")
      const result = await fetchDepositAddress(clerkUser.id)
      setDepositAddress(result?.data?.address || null)
    } catch (err) {
      setDepositAddressError(err.message || "Could not load your deposit address")
    } finally {
      setDepositAddressLoading(false)
    }
  }

  const handleCopyAddress = async () => {
    if (!depositAddress) return
    try {
      await navigator.clipboard.writeText(depositAddress)
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 2000)
    } catch {
      toast.error("Could not copy address")
    }
  }

  const handleWithdraw = async () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    if (amount > balance) {
      toast.error("Insufficient funds")
      return
    }
    if (accountType === "demo") {
      toast.error("Withdrawals are only available on the real account.")
      return
    }
    if (!withdrawToAddress.trim()) {
      toast.error("Please enter a destination TRON address")
      return
    }
    if (!clerkUser?.id) {
      toast.error("You must be logged in to withdraw funds.")
      return
    }

    setWithdrawCryptoLoading(true)
    setWithdrawResult(null)

    try {
      // This endpoint requires a real verified Clerk session (unlike every other call on this
      // page, which trusts the plain clerkId) because it moves real USDT out to an external
      // address the caller supplies.
      const token = await getToken()
      const result = await postWithdrawCrypto(token, { amount, toAddress: withdrawToAddress.trim() })
      setWithdrawResult({ status: result?.data?.status || null, error: null })
      setWithdrawAmount("")
      setWithdrawToAddress("")
      await refresh("real")
      toast.success(`Withdrawal requested: $${amount.toFixed(2)} (status: ${result?.data?.status})`)
    } catch (err) {
      setWithdrawResult({ status: null, error: err.message || "Withdrawal failed" })
      toast.error(err.message || "Withdrawal failed")
    } finally {
      setWithdrawCryptoLoading(false)
    }
  }

  const handleSetDemoBalance = async () => {
    const amount = Number(demoSetAmount)
    if (!demoSetAmount || Number.isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid demo balance")
      return
    }

    try {
      setLoading(true)
      const result = await postSetDemoBalance({ clerkId: clerkUser.id, amount, description: "Demo balance set by user" })
      setBalance("demo", result?.balance ?? amount, result?.wallet?.transactions)
      setDemoSetAmount("")
      toast.success(`Demo balance set to $${(result?.balance ?? amount).toFixed(2)}`)
    } catch (err) {
      toast.error(err.message || "Could not update demo balance")
    } finally {
      setLoading(false)
    }
  }

  const handleResetDemoBalance = async () => {
    if (!clerkUser?.id) return
    try {
      setLoading(true)
      const result = await postSetDemoBalance({ clerkId: clerkUser.id, amount: 10000, description: "Demo balance reset" })
      setBalance("demo", result?.balance ?? 10000, result?.wallet?.transactions)
      toast.success("Demo balance reset to $10,000")
    } catch (err) {
      toast.error(err.message || "Could not reset demo balance")
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

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <StatCard label="Total balance" value={`$${balance.toLocaleString()}`} description={accountType === "demo" ? "Demo balance" : "Real account"} icon={Wallet} />
        <StatCard label="Available" value={`$${balance.toLocaleString()}`} description="Ready to invest" icon={BadgeDollarSign} accent="text-emerald-600 dark:text-emerald-400" />
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:divide-x sm:divide-border">
          <div className="space-y-2 sm:pr-5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              Deposit
            </div>
            {accountType === "real" ? (
              <div className="space-y-2">
                {!depositAddress ? (
                  <Button size="sm" className="h-8" onClick={handleGetDepositAddress} disabled={depositAddressLoading}>
                    {depositAddressLoading ? "Loading..." : "Get deposit address"}
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
                      <code className="flex-1 truncate text-[11px] text-foreground">{depositAddress}</code>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Copy address"
                      >
                        {addressCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Send only <span className="font-medium text-foreground">USDT on the TRON (TRC20) network</span> to this address. Funds sent on any other network will be lost.
                    </p>
                  </div>
                )}
                {depositAddressError && <p className="text-[11px] text-destructive">{depositAddressError}</p>}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input type="number" placeholder="0.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="h-8 pl-6 text-sm" min="0" step="0.01" />
                  </div>
                  <Button size="sm" className="h-8" onClick={handleDeposit} disabled={!depositAmount || Number.parseFloat(depositAmount) <= 0 || loading}>
                    {loading ? "..." : "Add"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setDepositAmount(amount.toString())}
                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 sm:pl-5">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ArrowDownRight className="h-3.5 w-3.5 text-muted-foreground" />
              Withdraw
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input type="number" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-8 pl-6 text-sm" min="0" step="0.01" max={balance} disabled={withdrawCryptoLoading} />
              </div>
            </div>
            <Input
              type="text"
              placeholder="Destination TRON address"
              value={withdrawToAddress}
              onChange={(e) => setWithdrawToAddress(e.target.value)}
              className="h-8 text-sm"
              disabled={accountType === "demo" || withdrawCryptoLoading}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full"
              onClick={handleWithdraw}
              disabled={
                withdrawCryptoLoading ||
                accountType === "demo" ||
                !withdrawAmount ||
                Number.parseFloat(withdrawAmount) <= 0 ||
                Number.parseFloat(withdrawAmount) > balance ||
                !withdrawToAddress.trim()
              }
            >
              {withdrawCryptoLoading ? "Sending..." : "Send"}
            </Button>
            {accountType === "demo" && <p className="text-[11px] text-muted-foreground">Switch to your real account to withdraw funds.</p>}
            {withdrawResult && (
              <p className={`text-[11px] ${withdrawResult.error ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                {withdrawResult.error ? withdrawResult.error : `Withdrawal status: ${withdrawResult.status}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {accountType === "demo" && (
        <Card className="mt-4 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Set demo balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[160px] flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input type="number" placeholder="10000" value={demoSetAmount} onChange={(e) => setDemoSetAmount(e.target.value)} className="h-8 pl-6 text-sm" min="0" step="0.01" />
              </div>
              <Button type="button" size="sm" className="h-8" onClick={handleSetDemoBalance} disabled={!demoSetAmount || Number.parseFloat(demoSetAmount) < 0 || loading}>
                {loading ? "Saving..." : "Set balance"}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleResetDemoBalance} disabled={loading}>
                <RotateCcw className="h-3.5 w-3.5" />
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

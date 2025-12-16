"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react"
import { useUser } from "@clerk/nextjs"

export default function WalletPage() {
  const { user: clerkUser, isSignedIn } = useUser();
  const [userData, setUserData] = useState(null);
  const { user, updateUser } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  //const userData = useUserData()

  useEffect(() => {
    setMounted(true)
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!mounted || !user) {
    return null
  }

  const handleDeposit = async () => {
  if (!amount || Number(amount) <= 0) {
    setError("Invalid amount");
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const res = await fetch(
      "https://novel-server-cdcp.onrender.com/api/deposit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: clerkUser.id,          // 🔑 clé principale
          amount: Number(amount),    // ⚠️ convertir en Number
          description: "Wallet deposit",
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Deposit failed");
    }

    console.log("Deposit success:", data);
    alert(`Successfully deposited $${data}`)
    setAmount(""); // reset input

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};



  const handleWithdraw = () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (amount > user.balance) {
      alert("Insufficient funds")
      return
    }

    updateUser({ balance: user.balance - amount })
    setWithdrawAmount("")
    alert(`Successfully withdrew $${amount.toFixed(2)}`)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Wallet</h1>
        <p className="text-muted-foreground">Manage your funds and transactions</p>
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Deposit Card */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
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
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9"
                  onClick={handleDeposit}
                  disabled={!depositAmount || Number.parseFloat(depositAmount) <= 0}
                >
                  Deposit
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

          {/* Withdraw Card */}
          <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-transparent">
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
                    max={user.balance}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9"
                  onClick={handleWithdraw}
                  disabled={
                    !withdrawAmount ||
                    Number.parseFloat(withdrawAmount) <= 0 ||
                    Number.parseFloat(withdrawAmount) > user.balance
                  }
                >
                  Withdraw
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Available</span>
                <span className="font-semibold text-foreground">${user.balance.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-2">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                  <p className="text-xl font-bold">${user.balance.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Available</p>
                <p className="text-xl font-bold text-primary">${user.balance.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">In Positions</p>
                <p className="text-xl font-bold">$0</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Profit/Loss</p>
                <p className="text-xl font-bold text-primary">+$0</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

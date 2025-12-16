"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useUser } from "@clerk/nextjs"


export default function HistoryPage() {

  const { user: clerkUser, isSignedIn } = useUser();
  const [userData, setUserData] = useState(null);

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

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground">View all your past transactions</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Complete history of your trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          {userData.wallet.transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">Start deposit to see your history here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userData.wallet.transactions.map((trade) => (
                <div
                  key={`${trade.createdAt}-${trade.type}`}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        trade.type === "credit" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {trade.type === "credit" ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{trade.type}</p>
                        <Badge variant={trade.type === "credit" ? "default" : "destructive"} className="capitalize">
                          {trade.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        deposit  ${trade.amount}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${trade.total.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(trade.createdAt).toLocaleString("en-US", {dateStyle: "medium",timeStyle: "short",})} {new Date(trade.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

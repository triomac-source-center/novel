"use client"

import { useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownToLine, Globe2, TrendingUp } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"
import { formatCurrency } from "@/lib/cluster-utils"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "buy", label: "Buys" },
  { value: "profit", label: "Profits" },
]

// Every trading-related money movement — cell purchases/payouts AND authorship block
// purchases/payouts, merged into one chronological feed (tx.category still distinguishes them for
// display) — deposits/withdrawals live on the separate /transactions page and are excluded here.
export default function GlobalHistoryPage() {
  const { isSignedIn } = useUser()
  const { real, loading } = useWallet()
  const [filter, setFilter] = useState("all")

  const entries = useMemo(() => {
    return real.transactions
      .filter((tx) => tx.category === "investment" || tx.category === "block")
      .map((tx) => ({
        ...tx,
        kind: tx.type === "credit" ? "profit" : "buy",
        // A realized-profit credit's amount is already the net gain (server-side credits only the
        // gain, not the full sale proceeds) — costBasis on the transaction is informational only.
        gain: tx.type === "credit" ? Number(tx.amount || 0) : null,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [real.transactions])

  const filtered = entries.filter((entry) => filter === "all" || entry.kind === filter)

  if (!isSignedIn) return <p>Please log in</p>

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader
        eyebrow="Trading history"
        icon={Globe2}
        title="Global History"
        description="Every cell purchase and realized profit across your clusters, in chronological order."
      />

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      ) : entries.length === 0 ? (
        <EmptyState icon={Globe2} title="No trading history yet" description="Cell purchases and realized profits will show up here." />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Tabs value={filter} onValueChange={setFilter} className="mb-4">
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <EmptyState icon={Globe2} title="Nothing here" description="Try a different filter." />
          ) : (
            <div className="rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Layer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry, index) => {
                    const isBuy = entry.kind === "buy"
                    return (
                      <TableRow key={`${entry.createdAt}-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isBuy ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isBuy ? <ArrowDownToLine className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {isBuy ? "Buy" : "Profit"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.category === "block" ? "Block" : "Cell"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">{entry.clusterSymbol || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.layer ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            isBuy
                              ? "text-blue-600 dark:text-blue-400"
                              : entry.gain >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                          }`}
                        >
                          {isBuy ? formatCurrency(entry.amount) : `${entry.gain >= 0 ? "+" : ""}${formatCurrency(entry.gain)}`}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

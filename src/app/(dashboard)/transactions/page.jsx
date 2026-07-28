"use client"

import { useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownRight, ArrowUpRight, History, Search } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "credit", label: "Credits" },
  { value: "debit", label: "Debits" },
]

export default function TransactionsPage() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { real, loading } = useWallet()
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 8

  const transactions = useMemo(() => real.transactions.filter((tx) => !tx.category || tx.category === "wallet"), [real.transactions])

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => (filter === "all" ? true : (tx.type === "credit" ? "credit" : "debit") === filter))
      .filter((tx) => (tx.description || tx.type || "").toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [transactions, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  if (!clerkUser) return null
  if (!isSignedIn) return <p>Please log in</p>

  return (
    <div className="bgmain p-6 lg:p-8">
      <PageHeader eyebrow="Account history" icon={History} title="Transactions" description="Your wallet deposits and withdrawals — investment activity lives on the Portfolio page." />

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted/30" />
      ) : transactions.length === 0 ? (
        <EmptyState icon={History} title="No transactions yet" description="Deposit funds to start seeing your history here." />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={filter}
              onValueChange={(value) => {
                setFilter(value)
                setPage(1)
              }}
            >
              <TabsList>
                {FILTERS.map((f) => (
                  <TabsTrigger key={f.value} value={f.value}>
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions"
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matching transactions" description="Try a different filter or search term." />
          ) : (
            <>
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance after</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((tx, index) => {
                      const isCredit = tx.type === "credit"
                      return (
                        <TableRow key={`${tx.createdAt}-${index}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isCredit ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                                {isCredit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              </div>
                              <Badge variant={isCredit ? "default" : "destructive"} className="text-xs capitalize">
                                {tx.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{tx.description || "Transaction"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            {isCredit ? "+" : "-"}${Number(tx.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">${Number(tx.balanceAfter || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
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
          )}
        </div>
      )}
    </div>
  )
}

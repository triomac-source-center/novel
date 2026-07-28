import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/empty-state"
import { TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/cluster-utils"

export function InvestmentHistory({ transactions, title = "PnL history" }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investment activity yet"
            description="Buying cells and cell transfers will show up here, separate from your wallet history."
          />
        ) : (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Realized gain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, index) => {
                  const isCredit = tx.type === "credit"
                  const gain = isCredit ? Number(tx.amount || 0) - Number(tx.costBasis || 0) : null
                  return (
                    <TableRow key={`${tx.createdAt}-${index}`}>
                      <TableCell className="text-foreground">{tx.clusterSymbol || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className={`text-right font-semibold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {isCredit ? "+" : "-"}${Number(tx.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right ${gain === null ? "text-muted-foreground" : gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {gain === null ? "—" : `${gain >= 0 ? "+" : ""}$${gain.toLocaleString()}`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Award, CandlestickChart, Globe2, History, LayoutDashboard, Layers3, LineChart, Menu, ShieldCheck, UserRound, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hasAdminAccess } from "@/lib/admin"
import { useWallet } from "@/lib/wallet-context"
import { useEffect, useState } from "react"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Cluster market", href: "/market", icon: Layers3 },
  { name: "Trade", href: "/trade", icon: CandlestickChart },
  { name: "Authorship market", href: "/authorship-market", icon: Award },
  { name: "Portfolio", href: "/portfolio", icon: LineChart },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Activity", href: "/transactions", icon: History },
  { name: "Global History", href: "/global-history", icon: Globe2 },
  { name: "Profile", href: "/profile", icon: UserRound },
]

export function Sidebar() {
  const pathname = usePathname()
  const { real } = useWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAdminLink, setShowAdminLink] = useState(false)

  useEffect(() => setShowAdminLink(hasAdminAccess()), [pathname])

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border px-5 py-6">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Capital available</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">${real.balance.toLocaleString()}</p>
        <Link
          href="/wallet"
          className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Manage funds <Wallet className="h-3.5 w-3.5" />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Workspace</p>
        {navigation.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}

        {showAdminLink && (
          <>
            <p className="px-3 pt-4 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Admin</p>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname?.startsWith("/admin")
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Cluster admin
            </Link>
          </>
        )}
      </nav>
    </aside>
  )

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-3 top-3 z-50 bg-card lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X /> : <Menu />}
      </Button>
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 pt-16 lg:block">{sidebar}</div>
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 w-72 pt-16 lg:hidden">{sidebar}</div>
        </>
      )}
    </>
  )
}

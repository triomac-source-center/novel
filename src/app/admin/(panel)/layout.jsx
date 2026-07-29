"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Layers3, Lock, PiggyBank, PlusCircle, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Clusters", href: "/admin/clusters", icon: Layers3 },
  { name: "New cluster", href: "/admin/clusters/new", icon: PlusCircle },
  { name: "System share", href: "/admin/system-share", icon: PiggyBank },
]

export default function AdminPanelLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLock = async () => {
    await fetch("/api/admin/access", { method: "DELETE" })
    router.push("/admin/access")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">triomac60 · Admin</p>
              <p className="text-xs text-muted-foreground">Cluster creation & lifecycle management</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
            {navigation.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Back to app
            </Link>
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Lock className="h-3.5 w-3.5" />
              Lock
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}

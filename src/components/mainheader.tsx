"use client"
import Link from "next/link"
import { Layers3, UserRound } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"

export function Header({ userdata }) {
  const name = userdata?.[0] || "Investor"
  const email = userdata?.[1] || ""

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center justify-between px-5 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <Layers3 className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">triomac60</span>
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-accent"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="max-w-36 truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <UserRound className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}

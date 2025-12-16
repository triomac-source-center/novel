"use client"

import { useAuth } from "@/lib/auth-context"
import { TrendingUp, User } from "lucide-react"
import Link from "next/link"

export function Header({userdata}) {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-30 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-6 lg:px-8">
        {/* Logo - Left side */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-white">Ogence</span>
        </div>

        {/* Profile - Right side */}
        <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{userdata[0]}</p>
            <p className="text-xs text-muted-foreground">{userdata[1]}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20">
            <User className="h-5 w-5" />
          </div>
        </Link>
      </div>
    </header>
  )
}

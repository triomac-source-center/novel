"use client"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/mainheader"
import { Sidebar } from "@/components/mainsidebar"
import { useUser } from "@clerk/nextjs"
import { useWallet } from "@/lib/wallet-context"

export default function MainLayoutDashboard({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const { loading } = useWallet()
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (!isSignedIn) return <p>Please log in</p>
  if (loading) {
    return (
      <div className="min-h-screen bgmain p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-16 animate-pulse rounded-2xl border border-border bg-muted/30" />
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="h-80 animate-pulse rounded-2xl border border-border bg-muted/30" />
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30" />
              <div className="h-24 animate-pulse rounded-2xl border border-border bg-muted/30" />
              <div className="h-24 animate-pulse rounded-2xl border border-border bg-muted/30" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const username = clerkUser?.fullName || clerkUser?.username || "User"
  const email = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || ""

  return (
    <div className="min-h-screen bgmain">
      <Header userdata={[username, email]} />
      <Sidebar />
      <main className="lg:pl-64 pt-16">
        {children}
      </main>
    </div>
  )
}

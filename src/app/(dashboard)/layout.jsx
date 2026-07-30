"use client"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/mainheader"
import { Sidebar } from "@/components/mainsidebar"
import { useUser } from "@clerk/nextjs"
import { useWallet } from "@/lib/wallet-context"

export default function MainLayoutDashboard({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const { loading, error, refresh } = useWallet()
  const { user } = useAuth()

  if (!user) {
    return null
  }

  if (!isSignedIn) return <p>Please log in</p>
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bgmain p-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/30 p-10 text-center">
          <p className="text-sm font-medium text-foreground">Couldn&apos;t reach the server</p>
          <p className="text-xs text-muted-foreground">The account service didn&apos;t respond. It may still be waking up.</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
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

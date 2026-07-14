"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/mainheader"
import { Sidebar } from "@/components/mainsidebar"
import { useUser } from "@clerk/nextjs"
import { fetchAccount } from "@/lib/api-client"

export default function MainLayoutDashboard({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return

    let isActive = true

    async function fetchUser() {
      try {
        setLoading(true)
        setError("")
        const data = await fetchAccount(clerkUser.id, "real")
        if (isActive) {
          const normalized = {
            ...data,
            username: data?.username || data?.name || clerkUser?.fullName || "User",
            email: data?.email || clerkUser?.emailAddresses?.[0]?.emailAddress || "",
            wallet: {
              ...(data?.wallet || {}),
              balance: Number(data?.wallet?.balance ?? data?.balance ?? data?.account?.balance ?? 0),
            },
          }
          setUserData(normalized)
        }
      } catch (err) {
        console.error(err)
        if (isActive) {
          setUserData({
            username: clerkUser?.fullName || "User",
            email: clerkUser?.emailAddresses?.[0]?.emailAddress || "",
            wallet: { balance: 0, transactions: [] },
          })
          setError("")
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    const handleBalanceRefresh = () => {
      fetchUser()
    }

    window.addEventListener("wallet-balance-updated", handleBalanceRefresh)

    return () => {
      isActive = false
      window.removeEventListener("wallet-balance-updated", handleBalanceRefresh)
    }
  }, [clerkUser?.id, isSignedIn])

  if (!user) {
    return null
  }

  if (!isSignedIn) return <p>Please log in</p>
  if (loading) {
    return (
      <div className="min-h-screen bgmain p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-16 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="h-80 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
              <div className="h-24 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
              <div className="h-24 animate-pulse rounded-2xl border border-border/50 bg-background/70" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (!userData) return <p>User not found</p>

  return (
    <div className="min-h-screen bgmain">
      <Header userdata={[userData.username || userData.firstName || "User", userData.email]} />
      <Sidebar wallet={userData.wallet} />
      <main className="lg:pl-64 pt-16">
        {children}
      </main>
    </div>
  )
}

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
          setUserData(data)
        }
      } catch (err) {
        console.error(err)
        if (isActive) {
          setError("Unable to load your profile data.")
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
  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>
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

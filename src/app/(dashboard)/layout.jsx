"use client"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/mainheader"
import { Sidebar } from "@/components/mainsidebar"
import { useUser } from "@clerk/nextjs"
import { fetchUserProfile } from "@/lib/api-client"

export default function MainLayoutDashboard({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    if (!clerkUser) return

    async function fetchUser() {
      try {
        setLoading(true)
        setError("")
        const data = await fetchUserProfile(clerkUser.id)
        setUserData(data)
      } catch (err) {
        console.error(err)
        setError("Unable to load your profile data.")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [clerkUser])

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

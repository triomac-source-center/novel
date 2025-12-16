"use client"
import {  useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Activity, Wallet, Eye, EyeOff } from "lucide-react"
import { Header } from "@/components/mainheader"
import { Sidebar } from "@/components/mainsidebar"
import { useUser } from "@clerk/nextjs"
import { UserProvider } from "@/context/usercontext"

export default function MainLayoutDashboard({children}) {

  const { user: clerkUser, isSignedIn } = useUser();
  const [userData, setUserData] = useState(null);
  const { user } = useAuth()
  const [showBalance, setShowBalance] = useState(true)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clerkUser) return;

    async function fetchUser() {
      try {
        const res = await fetch(`https://novel-server-cdcp.onrender.com/api/${clerkUser.id}`);
        const data = await res.json();
        setUserData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [clerkUser]);

  if (!user) {
    return null
  }

//   if (!isSignedIn) return <p>Please log in</p>;
//   if (loading) return <p>Loading...</p>;
//   if (!userData) return <p>User not found</p>;


  return (
    <UserProvider user={userData}>
    <div className="min-h-screen bgmain">
      <Header/>
      <Sidebar wallet={userData.wallet}/>
      <main className="lg:pl-64 pt-16">
        {children}
    </main>
    </div>
    </UserProvider>
  )
}

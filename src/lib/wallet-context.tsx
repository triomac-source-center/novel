"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { API_BASE_URL, fetchAccount } from "@/lib/api-client"

const defaultAccount = { balance: 0, transactions: [] }
const BACKGROUND_REFRESH_MS = 30000

const WalletContext = createContext(undefined)

export function WalletProvider({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const [real, setReal] = useState(defaultAccount)
  const [demo, setDemo] = useState(defaultAccount)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(
    async (type) => {
      if (!clerkUser?.id) return
      const types = type ? [type] : ["real", "demo"]

      await Promise.all(
        types.map(async (accountType) => {
          try {
            const data = await fetchAccount(clerkUser.id, accountType)
            const next = {
              balance: Number(data?.wallet?.balance ?? data?.balance ?? (accountType === "demo" ? 10000 : 0)),
              transactions: Array.isArray(data?.wallet?.transactions) ? data.wallet.transactions : [],
            }
            if (accountType === "demo") setDemo(next)
            else setReal(next)
          } catch (err) {
            console.error(`Failed to refresh ${accountType} account:`, err)
          }
        })
      )
    },
    [clerkUser?.id]
  )

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return
    let isActive = true
    setLoading(true)
    refresh().finally(() => {
      if (isActive) setLoading(false)
    })
    return () => {
      isActive = false
    }
  }, [clerkUser?.id, isSignedIn, refresh])

  // Safety net: even if the initial load's retries (api-client.js) run out while the backend is
  // still cold-starting, a fresh account fetch every 30s self-heals a stuck $0 display without
  // requiring the user to trigger a mutation first.
  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return
    const interval = setInterval(() => refresh(), BACKGROUND_REFRESH_MS)
    return () => clearInterval(interval)
  }, [clerkUser?.id, isSignedIn, refresh])

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn || typeof window === "undefined") return

    const source = new EventSource(`${API_BASE_URL}/api/account/stream?clerkId=${encodeURIComponent(clerkUser.id)}`)

    const handleBalanceUpdate = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const accountType = payload.accountType === "demo" ? "demo" : "real"
        // Re-fetch the full account (not just patch the balance number in place) so transaction-
        // derived views (Portfolio, Trade's invested/profit lists) also update live — this fires
        // whenever balance changes for any reason, including someone else buying your cell.
        refresh(accountType)
      } catch (err) {
        console.error("Failed to parse balance-update event:", err)
      }
    }

    source.addEventListener("balance-update", handleBalanceUpdate)

    return () => {
      source.removeEventListener("balance-update", handleBalanceUpdate)
      source.close()
    }
  }, [clerkUser?.id, isSignedIn, refresh])

  const setBalance = useCallback((type, balance, transactions) => {
    const setter = type === "demo" ? setDemo : setReal
    setter((prev) => ({ balance, transactions: transactions ?? prev.transactions }))
  }, [])

  return (
    <WalletContext.Provider value={{ real, demo, loading, refresh, setBalance }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

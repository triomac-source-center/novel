"use client"

import { createContext, useCallback, useContext } from "react"
import useSWR from "swr"
import { useUser } from "@clerk/nextjs"
import { fetchAccount } from "@/lib/api-client"

const WalletContext = createContext(undefined)

const REFRESH_INTERVAL_MS = 7000

function toAccount(data, accountType) {
  return {
    balance: Number(data?.wallet?.balance ?? data?.balance ?? (accountType === "demo" ? 10000 : 0)),
    transactions: Array.isArray(data?.wallet?.transactions) ? data.wallet.transactions : [],
  }
}

export function WalletProvider({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const clerkId = isSignedIn ? clerkUser?.id : null

  // SWR handles the retry/backoff, request de-duplication and polling itself instead of the
  // hand-rolled fetch+setInterval logic this used to have — it re-fetches every 7s, on window
  // focus, and reruns automatically after a transient failure (e.g. the free-tier backend cold-
  // starting), so the dashboard can no longer get permanently stuck showing $0.
  const realSWR = useSWR(clerkId ? ["account", clerkId, "real"] : null, () => fetchAccount(clerkId, "real"), {
    refreshInterval: REFRESH_INTERVAL_MS,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })
  const demoSWR = useSWR(clerkId ? ["account", clerkId, "demo"] : null, () => fetchAccount(clerkId, "demo"), {
    refreshInterval: REFRESH_INTERVAL_MS,
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })

  const real = toAccount(realSWR.data, "real")
  const demo = toAccount(demoSWR.data, "demo")
  const loading = Boolean(clerkId) && (realSWR.isLoading || demoSWR.isLoading)

  // Call this right after any mutation (deposit/withdraw/invest) to force an immediate revalidate
  // instead of waiting for the next polling tick.
  const refresh = useCallback(
    async (type) => {
      if (type === "demo") await demoSWR.mutate()
      else if (type === "real") await realSWR.mutate()
      else await Promise.all([realSWR.mutate(), demoSWR.mutate()])
    },
    [realSWR, demoSWR]
  )

  // Optimistic local patch (using the response we already have from a deposit/withdraw/invest
  // call) so the UI updates instantly, still followed by SWR's own revalidation to stay in sync.
  const setBalance = useCallback(
    (type, balance, transactions) => {
      const swr = type === "demo" ? demoSWR : realSWR
      swr.mutate(
        (current) => ({
          ...(current || {}),
          balance,
          wallet: { balance, transactions: transactions ?? current?.wallet?.transactions ?? [] },
        }),
        { revalidate: true }
      )
    },
    [realSWR, demoSWR]
  )

  return <WalletContext.Provider value={{ real, demo, loading, refresh, setBalance }}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

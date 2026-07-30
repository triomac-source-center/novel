"use client"

import { createContext, useCallback, useContext } from "react"
import useSWR from "swr"
import { useUser } from "@clerk/nextjs"
import { fetchAccount } from "@/lib/api-client"

const WalletContext = createContext(undefined)

function toAccount(data, accountType) {
  return {
    balance: Number(data?.wallet?.balance ?? data?.balance ?? (accountType === "demo" ? 10000 : 0)),
    transactions: Array.isArray(data?.wallet?.transactions) ? data.wallet.transactions : [],
  }
}

export function WalletProvider({ children }) {
  const { user: clerkUser, isSignedIn } = useUser()
  const clerkId = isSignedIn ? clerkUser?.id : null

  // No interval polling here on purpose — constant background refetching was the actual
  // complaint ("auto refresh en permanence"). SWR still retries automatically on failure and
  // revalidates on window focus; explicit updates happen via refresh()/setBalance() right after a
  // mutation (deposit/withdraw/invest), which is the "revalidate after mutation" pattern, not a
  // ticking timer.
  const realSWR = useSWR(clerkId ? ["account", clerkId, "real"] : null, () => fetchAccount(clerkId, "real"), {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })
  const demoSWR = useSWR(clerkId ? ["account", clerkId, "demo"] : null, () => fetchAccount(clerkId, "demo"), {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  })

  const real = toAccount(realSWR.data, "real")
  const demo = toAccount(demoSWR.data, "demo")
  // IMPORTANT: don't use SWR's `isLoading` here — it flips to false the moment the FIRST request
  // *settles*, success or failure. On a cold-starting backend the first attempt often fails, so
  // `isLoading` goes false with `data` still undefined, and the dashboard was rendering as if
  // "loaded" with fallback zeros instead of showing the loading skeleton while SWR quietly retries
  // in the background. Gate purely on whether we actually have data yet.
  const loading = Boolean(clerkId) && (!realSWR.data || !demoSWR.data)

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

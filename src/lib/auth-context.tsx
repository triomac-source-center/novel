"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface BalanceUpdateEvent extends CustomEvent {
  detail?: {
    balance?: number
  }
}

interface User {
  id: string
  email: string
  name: string
  balance: number
  avatar?: string
}

interface AuthContextType {
  user: User
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

// Utilisateur par défaut
const defaultUser: User = {
  id: "1",
  email: "demo@taxpal.com",
  name: "Demo User",
  balance: 10000,
  avatar: "",
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser) // user par défaut

  const emitBalanceUpdate = (balance: number) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wallet-balance-updated", { detail: { balance } }))
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simule un login : retourne toujours le user par défaut
    setUser(defaultUser)
    return true
  }

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    // Simule un signup
    const newUser: User = {
      ...defaultUser,
      name,
      email,
    }
    setUser(newUser)
    return true
  }

  const logout = () => {
    // Pour démo, on remet le user par défaut
    setUser(defaultUser)
  }

  const updateUser = (updates: Partial<User>) => {
    setUser((current) => {
      const nextUser = { ...current, ...updates }
      if (typeof updates.balance === "number") {
        emitBalanceUpdate(nextUser.balance)
      }
      return nextUser
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

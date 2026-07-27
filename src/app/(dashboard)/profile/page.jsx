"use client"

import { useUser } from "@clerk/nextjs"
import { BadgeCheck, Building2, Mail, ShieldCheck, UserRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  if (!isLoaded) return <div className="p-6 lg:p-8">Loading profile…</div>
  if (!user) return <div className="p-6 lg:p-8">Please log in.</div>

  const name = user.fullName || user.username || "Triomac60 investor"
  const email = user.primaryEmailAddress?.emailAddress || "No email address"

  return (
    <div className="p-6 lg:p-8 bgmain">
      <div className="mb-7">
        <p className="text-sm font-medium text-primary">Account centre</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your verified identity and investor workspace preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-2xl font-semibold text-primary">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {email}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Member ID: {user.id}</p>
            </div>
            <Button variant="outline" onClick={() => user.openUserProfile?.()}>
              Manage identity
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/[0.04] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Account protection
            </CardTitle>
            <CardDescription>Authentication is securely handled by Clerk.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-sm text-foreground">Identity status</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Protected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <UserRound className="mb-3 h-5 w-5 text-primary" />
            <p className="font-medium text-foreground">Investor account</p>
            <p className="mt-1 text-sm text-muted-foreground">Buy one or several cells across active clusters.</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <Building2 className="mb-3 h-5 w-5 text-primary" />
            <p className="font-medium text-foreground">triomac60 system</p>
            <p className="mt-1 text-sm text-muted-foreground">Clusters are authored and governed by the system.</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
            <p className="font-medium text-foreground">Transparent history</p>
            <p className="mt-1 text-sm text-muted-foreground">All fund movements are recorded in your activity log.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

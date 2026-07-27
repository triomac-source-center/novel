"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function AdminAccessForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!res.ok) {
        setError("Incorrect access code.")
        return
      }

      router.push(searchParams.get("next") || "/admin")
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm border-border shadow-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <CardTitle>Admin access</CardTitle>
        <CardDescription>Enter the access code to reach the triomac60 admin panel.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Access code</Label>
            <Input
              id="code"
              type="password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!code || submitting}>
            {submitting ? "Verifying..." : "Unlock admin panel"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AdminAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Suspense fallback={null}>
        <AdminAccessForm />
      </Suspense>
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CreateClusterRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/clusters/new")
  }, [router])

  return null
}

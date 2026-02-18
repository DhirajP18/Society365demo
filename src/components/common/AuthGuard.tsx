"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.replace("/login")
    }
  }, [])

  return <>{children}</>
}

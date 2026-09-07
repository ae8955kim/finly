"use client"

import { useEffect, useState } from "react"
import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"
import { isAdmin } from "@/lib/auth"

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // lib/auth.ts 의 isAdmin() 검증 함수 직접 활용
    const checkAuth = async () => {
      const loggedIn = await isAdmin()
      setIsAuthenticated(loggedIn)
    }

    checkAuth()
  }, [])

  if (isAuthenticated === null) {
    return <div className="flex min-h-dvh items-center justify-center">확인 중...</div>
  }

  if (!isAuthenticated) {
    return <AdminLogin />
  }

  return <AdminDashboard />
}
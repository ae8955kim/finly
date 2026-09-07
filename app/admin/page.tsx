"use client"

import { useEffect, useState } from "react"
import { AdminLogin } from "@/components/admin-login"
import { AdminDashboard } from "@/components/admin-dashboard"
import { ADMIN_COOKIE } from "@/lib/auth"

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // 저장된 쿠키 확인
    const checkAuth = () => {
      const cookies = document.cookie.split("; ")
      const authCookie = cookies.find((row) => row.startsWith(`${ADMIN_COOKIE}=`))
      if (authCookie && authCookie.split("=")[1] === "ok") {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
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
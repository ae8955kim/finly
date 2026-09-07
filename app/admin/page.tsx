'use client'

import { useEffect, useState } from 'react'
import { isAdmin } from '@/lib/auth'
import { AdminLogin } from '@/components/admin-login'
import { AdminDashboard } from '@/components/admin-dashboard'

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const result = await isAdmin()
      setAuthed(result)
    }
    checkAuth()
  }, [])

  if (authed === null) {
    return <div className="p-8 text-center">로딩 중...</div>
  }

  if (!authed) {
    return <AdminLogin />
  }

  return <AdminDashboard />
}
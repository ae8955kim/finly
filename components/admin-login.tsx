"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminLogin() {
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    try {
      // 비밀번호 직접 비교 ("**qhdks00")
      if (password === "**qhdks00") {
        // localStorage와 쿠키에 동시 저장하여 인증 상태 확실히 유지
        localStorage.setItem("admin_auth", "ok")
        localStorage.setItem("isAdmin", "true")
        
        document.cookie = "admin_auth=true; path=/; max-age=86400"

        toast.success("로그인되었습니다.")
        
        setTimeout(() => {
          window.location.reload()
        }, 100)
      } else {
        throw new Error("비밀번호가 올바르지 않습니다.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.")
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Lock className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">관리자 로그인</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              대시보드에 접근하려면 비밀번호를 입력하세요.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
          {submitting ? "확인 중..." : "로그인"}
        </Button>
      </form>
    </main>
  )
}
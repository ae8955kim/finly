"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ADMIN_COOKIE } from "@/lib/auth"

const TARGET_PASSWORD_HASH = "80f1a2380fdbf3b062a4d3caefd368e5dfa40c614b8a43fca3a242a420b9e84b"

async function hashPassword(password: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function AdminLogin() {
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    try {
      const hashedInput = await hashPassword(password)

      if (hashedInput === TARGET_PASSWORD_HASH) {
        // 쿠키 저장 (path=/ 도메인 전체 적용)
        document.cookie = `${ADMIN_COOKIE}=ok; path=/; max-age=86400; SameSite=Lax`
        toast.success("로그인되었습니다.")
        
        // basePath 환경에서 확실한 화면 갱신
        window.location.href = window.location.pathname
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
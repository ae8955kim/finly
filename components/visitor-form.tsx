"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HardHat } from "lucide-react"
import { PrivacyConsentModal } from "@/components/privacy-consent-modal"
import { createClient } from "@/lib/supabase/client"

const EMPTY = { name: "", floor: "", company: "", phone: "" }

export function VisitorForm({ onRegistered }: { onRegistered: (visitorId: string) => void }) {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(true)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  function update(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !privacyAgreed) return

    setSubmitting(true)
    try {
      // 서버 API(/api/visitors) 대신 Supabase 클라이언트를 통해 직접 DB에 데이터를 삽입합니다.
      const { data, error } = await supabase
        .from("visitors")
        .insert([
          {
            name: form.name,
            floor: form.floor,
            company: form.company,
            phone: form.phone,
            status: "onsite", // 현장 등록 시 곧바로 재실(onsite) 상태로 처리
            registered_at: new Date().toISOString(),
            entered_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error("등록에 실패했습니다.")

      toast.success("방문 등록이 완료되었습니다.")
      onRegistered(data.id)
    } catch (err: any) {
      console.error("[Visitor Register Error]:", err)
      toast.error(err.message || "오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PrivacyConsentModal
        open={showPrivacyModal}
        onAgree={() => {
          setShowPrivacyModal(false)
          setPrivacyAgreed(true)
        }}
      />
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4">
          <Field id="name" label="이름" value={form.name} onChange={update("name")} placeholder="홍길동" autoComplete="name" />
          <Field id="floor" label="작업층" value={form.floor} onChange={update("floor")} placeholder="예) 지하 2층, 5층" />
          <Field id="company" label="소속" value={form.company} onChange={update("company")} placeholder="예) OO건설" />
          <Field
            id="phone"
            label="전화번호"
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="010-1234-5678"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting || !privacyAgreed}>
          <HardHat className="size-4" />
          {submitting ? "등록 중..." : "방문 등록하기"}
        </Button>
      </form>
    </>
  )
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required {...props} />
    </div>
  )
}
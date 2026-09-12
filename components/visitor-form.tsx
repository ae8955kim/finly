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
import { FloorPicker } from "@/components/floor-picker"

const EMPTY = { name: "", floor: "", company: "", phone: "", contact_name: "", contact_company: "" }

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
      const { data: existing, error: existingError } = await supabase
        .from("visitors")
        .select("id, status")
        .eq("phone", form.phone.trim())
        .in("status", ["pending", "onsite"])
        .order("registered_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) throw existingError
      if (existing?.id) {
        window.alert("기등록된 브라우저가 있습니다. 이전 이용하신 브라우저를 통해 접속 부탁드립니다. 계속된 오류시 02-2255-4111 번호를 통한 문의부탁드립니다.")
        return
      }

      const { data, error } = await supabase
        .from("visitors")
        .insert([
          {
            name: form.name,
            floor: form.floor,
            company: form.company,
            phone: form.phone,
            contact_name: form.contact_name,
            contact_company: form.contact_company,
            status: "pending", // 승인 대기 상태로 설정
            registered_at: new Date().toISOString(),
            // entered_at은 관리자가 승인 후 입실 처리할 때 들어가도록 제외합니다.
          },
        ])
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          throw new Error("이미 등록되어 있는 번호입니다.")
        }
        throw error
      }
      if (!data) throw new Error("등록에 실패했습니다.")

      toast.success("방문 신청이 완료되었습니다. 관리자 승인을 기다려주세요.")
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
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <div className="mb-6 flex flex-col gap-4">
          <Field id="name" label="이름" value={form.name} onChange={update("name")} placeholder="홍길동" autoComplete="name" />
          <Field id="company" label="소속" value={form.company} onChange={update("company")} placeholder="예) OO건설" />
          <div className="flex flex-col gap-2"><Label htmlFor="floor">작업층</Label><FloorPicker value={form.floor} onChange={(floor) => setForm((current) => ({ ...current, floor }))} label="작업층 선택" /></div>
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
          <Field id="contact_name" label="담당자 성함" value={form.contact_name} onChange={update("contact_name")} placeholder="예) 김담당" />
          <Field id="contact_company" label="담당자 소속" value={form.contact_company} onChange={update("contact_company")} placeholder="예)오피스그룹" />
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

"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { ShieldCheck } from "lucide-react"
import { VisitorForm } from "@/components/visitor-form"
import { VisitorStatusView } from "@/components/visitor-status"

export function WorkerApp() {
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // 마운트 시 localStorage에서 visitorId 로드
  useEffect(() => {
    const saved = localStorage.getItem("visitorId")
    if (saved) {
      setVisitorId(saved)
    }
    setIsLoaded(true)
  }, [])

  // 다른 브라우저·기기에서도 전화번호를 입력한 뒤 서버의 활성 신청으로 연결할 수 있습니다.
  // 기존 visitorId가 있으면 이 조회는 실행하지 않습니다.
  useEffect(() => {
    if (!isLoaded || visitorId) return
    const phone = sessionStorage.getItem("visitorPhone")
    if (!phone) return
    let cancelled = false
    supabase.from("visitors").select("id").eq("phone", phone.trim()).in("status", ["pending", "onsite"]).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.id) setVisitorId(data.id)
    })
    return () => { cancelled = true }
  }, [isLoaded, visitorId, supabase])

  // visitorId 변경 시 localStorage 저장 및 삭제 동기화
  useEffect(() => {
    if (isLoaded) {
      if (visitorId) {
        localStorage.setItem("visitorId", visitorId)
      } else {
        localStorage.removeItem("visitorId")
      }
    }
  }, [visitorId, isLoaded])

  // 초기화 핸들러 (관리자 삭제 감지 시 호출됨)
  const handleReset = () => {
    localStorage.removeItem("visitorId")
    sessionStorage.removeItem("visitorPhone")
    setVisitorId(null)
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-sm text-muted-foreground">불러오는 중...</div>
      </div>
    )
  }

  if (visitorId) {
    return (
      <VisitorStatusView 
        visitorId={visitorId} 
        onReset={handleReset}
      />
    )
  }

  return (
    <>
      <VisitorForm onRegistered={setVisitorId} />
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        <span>입력하신 정보는 출입 관리 목적으로만 사용됩니다.</span>
      </div>
    </>
  )
}

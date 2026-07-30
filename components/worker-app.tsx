"use client"

import { useState, useEffect } from "react"
import { ShieldCheck } from "lucide-react"
import { VisitorForm } from "@/components/visitor-form"
import { VisitorStatusView } from "@/components/visitor-status"

export function WorkerApp() {
  const [visitorId, setVisitorId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("visitorId")
    if (saved) {
      setVisitorId(saved)
    }
    setIsLoaded(true)
  }, [])

  // Save session to localStorage whenever visitorId changes
  useEffect(() => {
    if (isLoaded && visitorId) {
      localStorage.setItem("visitorId", visitorId)
    }
  }, [visitorId, isLoaded])

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
        onReset={() => setVisitorId(null)}
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

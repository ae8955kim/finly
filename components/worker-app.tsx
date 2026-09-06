"use client"

import { useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import type { Visitor } from "@/lib/types"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error("정보를 불러올 수 없습니다.")
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

export function VisitorStatusView({
  visitorId,
  onReset,
}: {
  visitorId: string
  onReset: () => void
}) {
  // SWR을 이용해 3초 간격으로 공사자 본인의 상태 모니터링
  const { data: visitor, error } = useSWR<Visitor>(
    visitorId ? `/api/visitors/${visitorId}` : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    }
  )

  useEffect(() => {
    // 1. 관리자가 명단을 삭제하여 status가 'deleted'로 변경된 경우
    if (visitor && visitor.status === "deleted") {
      toast.info("관리자에 의해 신청이 삭제되었습니다. 다시 등록해 주세요.")
      onReset() // WorkerApp의 handleReset 실행 -> localStorage 삭제 및 폼 화면으로 돌아감
    }

    // 2. 관리자가 완전히 삭제했거나 DB에 해당 데이터가 없는 경우 (404)
    if (error && (error as any).status === 404) {
      toast.info("등록된 신청 정보가 없습니다. 다시 등록해 주세요.")
      onReset()
    }
  }, [visitor, error, onReset])

  // ... 이하 기존 VisitorStatusView UI 랜더링 코드
}
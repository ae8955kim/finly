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
      onReset()
    }

    // 2. 관리자가 완전히 삭제했거나 DB에 해당 데이터가 없는 경우 (404)
    if (error && (error as any).status === 404) {
      toast.info("등록된 신청 정보가 없습니다. 다시 등록해 주세요.")
      onReset()
    }
  }, [visitor, error, onReset])

  // 데이터 로딩 중
  if (!visitor && !error) {
    return (
      <div className="flex justify-center py-8 text-sm text-muted-foreground">
        상태 조회 중...
      </div>
    )
  }

  // 삭제되었거나 없는 경우
  if (!visitor || visitor.status === "deleted") {
    return null
  }

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-card text-card-foreground">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-lg">{visitor.name} 님</span>
        <span className="text-xs px-2 py-1 rounded bg-muted">
          {visitor.status === "pending" && "승인 대기 중"}
          {visitor.status === "onsite" && "재실 중"}
          {visitor.status === "exited" && "퇴실 완료"}
        </span>
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>소속: {visitor.company}</p>
        <p>작업층: {visitor.floor}</p>
      </div>
    </div>
  )
}
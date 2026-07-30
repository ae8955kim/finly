"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { CheckCircle2, Clock, DoorOpen, Loader2, LogOut, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { cn } from "@/lib/utils"
import type { Visitor } from "@/lib/types"

type Status = Visitor["status"]

interface StatusData {
  id: string
  name: string
  floor: string
  company: string
  status: Status
  enteredAt: string | null
  exitedAt: string | null
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("상태를 불러오지 못했습니다.")
    return res.json()
  })

export function VisitorStatusView({ visitorId }: { visitorId: string }) {
  const { data, mutate } = useSWR<StatusData>(`/api/visitors/${visitorId}/status`, fetcher, {
    refreshInterval: 4000,
  })
  const [chatOpen, setChatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exiting, setExiting] = useState(false)

  const status = data?.status ?? "pending"

  async function handleExit() {
    setExiting(true)
    try {
      const res = await fetch(`/api/visitors/${visitorId}/exit`, { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "퇴실 처리에 실패했습니다.")
      }
      toast.success("퇴실 처리되었습니다. 안전 귀가하세요.")
      setConfirmOpen(false)
      setChatOpen(false)
      await mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setExiting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 상태 카드 */}
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center">
        <StatusBadge status={status} />

        {status === "onsite" && data && (
          <div className="flex w-full flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left">
            <Row label="성명" value={data.name} />
            <Row label="작업층" value={data.floor} />
            <Row label="소속" value={data.company} />
          </div>
        )}

        {status === "exited" && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            오늘 출입이 종료되었습니다. 이용해 주셔서 감사합니다.
          </p>
        )}
      </div>

      {/* 채팅 패널 */}
      {chatOpen && status !== "exited" && (
        <ChatPanel visitorId={visitorId} viewpoint="worker" className="h-80" />
      )}

      {/* 하단 액션 버튼 */}
      {status !== "exited" && (
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setChatOpen((v) => !v)}
          >
            <MessageCircle className="size-4" />
            {chatOpen ? "채팅 닫기" : "관리자 연결"}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut className="size-4" />
            퇴실하기
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>퇴실하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              퇴실 처리하면 관리자 대시보드에 퇴실로 기록되며 되돌릴 수 없습니다. 계속하려면 다시 &apos;퇴실&apos;을
              눌러주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exiting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleExit()
              }}
              disabled={exiting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {exiting ? "처리 중..." : "퇴실"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <>
        <div className="flex size-16 items-center justify-center rounded-full bg-chart-3/15 text-chart-3">
          <Clock className="size-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-2 text-xl font-semibold text-card-foreground">
            <Loader2 className="size-4 animate-spin text-chart-3" />
            승인 대기중
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            관리자가 방문 정보를 확인하고 있습니다.
            <br />
            승인되면 이 화면이 자동으로 변경됩니다.
          </p>
        </div>
      </>
    )
  }

  if (status === "onsite") {
    return (
      <>
        <div className="flex size-16 items-center justify-center rounded-full bg-chart-2/15 text-chart-2">
          <CheckCircle2 className="size-9" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-card-foreground">승인됨</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">출입이 승인되었습니다. 안전 작업하세요.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <DoorOpen className="size-9" />
      </div>
      <h2 className="text-xl font-semibold text-card-foreground">퇴실 완료</h2>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-card-foreground")}>{value}</span>
    </div>
  )
}

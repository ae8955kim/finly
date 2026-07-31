"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { CheckCircle2, Clock, DoorOpen, Loader2, LogOut, MessageCircle, Plus } from "lucide-react"
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
import type { Visitor, ChatMessage } from "@/lib/types"

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

interface VisitorStatusViewProps {
  visitorId: string
  onReset?: () => void
}

export function VisitorStatusView({ visitorId, onReset }: VisitorStatusViewProps) {
  const { data, mutate } = useSWR<StatusData>(`/api/visitors/${visitorId}/status`, fetcher, {
    refreshInterval: 4000,
  })

  // 3초 주기로 메시지 자동 감지 (버튼 클릭 안 해도 실시간 수신)
  const { data: msgData, mutate: mutateMessages } = useSWR<{ messages: ChatMessage[] }>(
    `/api/visitors/${visitorId}/messages`,
    fetcher,
    { refreshInterval: 3000 }
  )

  const [chatOpen, setChatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exiting, setExiting] = useState(false)

  const status = data?.status ?? "pending"

  // 관리자(admin)가 보낸 읽지 않은 메시지가 있는지 체크
  const rawMessages = msgData?.messages || (Array.isArray(msgData) ? msgData : [])
  const hasUnread = rawMessages.some((m: any) => m.sender === "admin" && !(m.isRead || m.is_read))

  // 채팅창이 열렸거나 열려 있는 동안 자동으로 읽음 처리 (PATCH)
  useEffect(() => {
    if (chatOpen && hasUnread && visitorId) {
      fetch(`/api/visitors/${visitorId}/messages`, { method: "PATCH" })
        .then(() => mutateMessages())
        .catch((err) => console.error("메시지 읽음 처리 실패:", err))
    }
  }, [chatOpen, hasUnread, visitorId, mutateMessages])

  function handleReEntry() {
    localStorage.removeItem("visitorId")
    if (onReset) {
      onReset()
    }
    toast.success("새로운 방문 등록을 시작합니다.")
  }

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
            className="relative w-full"
            onClick={() => {
              setChatOpen((v) => !v)
              if (hasUnread) {
                fetch(`/api/visitors/${visitorId}/messages`, { method: "PATCH" }).then(() =>
                  mutateMessages()
                )
              }
            }}
          >
            <MessageCircle className="size-4" />
            {chatOpen ? "채팅 닫기" : "관리자 연결"}

            {/* 관리자의 새 메시지가 있을 때 표시되는 빨간 알림 뱃지 */}
            {hasUnread && (
              <span className="absolute right-4 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex size-3 rounded-full bg-destructive"></span>
              </span>
            )}
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

      {/* 퇴실 완료 후 재입실 버튼 */}
      {status === "exited" && (
        <Button size="lg" className="w-full" onClick={handleReEntry}>
          <Plus className="size-4" />
          재입실하기
        </Button>
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
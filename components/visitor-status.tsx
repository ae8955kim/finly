"use client"

import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { CheckCircle2, Clock, DoorOpen, Loader2, LogOut, MessageCircle, Plus, ShieldCheck } from "lucide-react"
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

  const { data: msgData, mutate: mutateMessages } = useSWR<{ messages: ChatMessage[] }>(
    `/api/visitors/${visitorId}/messages`,
    fetcher,
    { refreshInterval: 3000 }
  )

  const [chatOpen, setChatOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [incomingMessage, setIncomingMessage] = useState<ChatMessage | null>(null)
  const lastMessageIds = useRef<Set<string>>(new Set())
  const hasInitializedMessages = useRef(false)

  const status = data?.status ?? "pending"

  // 1초마다 실시간 시계 업데이트 (위·변조 방지)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        " " +
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0") +
        ":" +
        String(now.getSeconds()).padStart(2, "0")
      setCurrentTime(formatted)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const rawMessages = msgData?.messages || (Array.isArray(msgData) ? msgData : [])
  const hasUnread = rawMessages.some((m: any) => m.sender === "admin" && !(m.isRead || m.is_read))

  useEffect(() => {
    const currentIds = new Set(rawMessages.map((message: any) => String(message.id)))
    if (hasInitializedMessages.current) {
      const newMessage = rawMessages.find(
        (message: any) =>
          message.sender === "admin" &&
          currentIds.has(String(message.id)) &&
          !lastMessageIds.current.has(String(message.id)),
      )
      if (newMessage) setIncomingMessage(newMessage)
    }
    lastMessageIds.current = currentIds
    hasInitializedMessages.current = true
  }, [rawMessages])

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

  // 상태별 배경색 디자인 클래스 매핑
  const getThemeClass = () => {
    switch (status) {
      case "onsite":
        return "bg-emerald-600 text-white"
      case "pending":
        return "bg-amber-500 text-white"
      case "exited":
        return "bg-rose-600 text-white"
      default:
        return "bg-slate-700 text-white"
    }
  }

  return (
    <div className={cn("fixed inset-0 min-h-screen w-full p-4 transition-colors duration-500 flex flex-col items-center justify-center z-50 overflow-y-auto", getThemeClass())}>
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* 위·변조 방지 실시간 시간 표기 */}
        <div className="flex items-center justify-between rounded-xl bg-black/25 backdrop-blur-md px-4 py-3 text-white border border-white/20 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="size-4 animate-pulse text-white/90" />
            <span>실시간 위·변조 방지</span>
          </div>
          <span className="font-mono text-sm font-bold tracking-wider">{currentTime || "시간 로딩 중..."}</span>
        </div>

        {/* 상태 카드 */}
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/20 bg-white/95 p-8 text-center text-slate-900 shadow-2xl backdrop-blur-sm">
          <StatusBadge status={status} />

          {status === "onsite" && data && (
            <div className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
              <Row label="성명" value={data.name} />
              <Row label="작업층" value={data.floor} />
              <Row label="소속" value={data.company} />
            </div>
          )}

          {status === "exited" && (
            <p className="text-sm text-slate-500 leading-relaxed">
              오늘 출입이 종료되었습니다. 이용해 주셔서 감사합니다.
            </p>
          )}
        </div>

        {/* 채팅 패널 */}
        {chatOpen && status !== "exited" && (
          <div className="rounded-2xl border border-white/20 bg-white p-2 text-slate-900 shadow-xl">
            <ChatPanel visitorId={visitorId} viewpoint="worker" className="h-80" />
          </div>
        )}

        {/* 하단 액션 버튼 */}
        {status !== "exited" && (
          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="relative w-full border-2 border-slate-200 bg-white text-slate-900 shadow-lg hover:bg-slate-100 font-bold"
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
              className="w-full border-2 border-rose-800 bg-rose-700 font-bold text-white shadow-lg hover:bg-rose-800"
              onClick={() => setConfirmOpen(true)}
            >
              <LogOut className="size-4" />
              퇴실하기
            </Button>
          </div>
        )}

        {/* 퇴실 완료 후 재입실 버튼 */}
        {status === "exited" && (
          <Button size="lg" className="w-full border-2 border-slate-200 bg-white text-slate-900 shadow-lg hover:bg-slate-100 font-bold" onClick={handleReEntry}>
            <Plus className="size-4" />
            재입실하기
          </Button>
        )}

        <AlertDialog open={Boolean(incomingMessage)} onOpenChange={(open) => !open && setIncomingMessage(null)}>
          <AlertDialogContent className="bg-white text-slate-900 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                관리자 메시지 도착
              </AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-wrap text-slate-700">
                {incomingMessage?.content || incomingMessage?.text || (incomingMessage as any)?.message || "새 메시지가 도착했습니다."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => { setIncomingMessage(null); setChatOpen(true) }}>
                메시지 확인
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="bg-white text-slate-900">
            <AlertDialogHeader>
              <AlertDialogTitle>퇴실하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500">
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
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <>
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="size-9" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-2 text-xl font-bold text-slate-900">
            <Loader2 className="size-4 animate-spin text-amber-600" />
            승인 대기중
          </div>
          <p className="text-sm text-slate-500 leading-relaxed text-pretty">
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
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-900">승인됨</h2>
          <p className="text-sm text-slate-500 leading-relaxed">출입이 승인되었습니다. 안전 작업하세요.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <DoorOpen className="size-9" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">퇴실 완료</h2>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={cn("font-bold text-slate-800")}>{value}</span>
    </div>
  )
}

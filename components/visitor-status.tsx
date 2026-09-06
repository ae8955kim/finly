"use client"

import { useEffect, useState, useRef } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Building2, MessageCircle, LogOut, Clock, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChatPanel } from "@/components/chat-panel"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error("정보를 불러올 수 없습니다.")
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

function formatTime(isoStr?: string | null) {
  if (!isoStr) return "-"
  try {
    return new Date(isoStr).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return "-"
  }
}

export function VisitorStatusView({
  visitorId,
  onReset,
}: {
  visitorId: string
  onReset: () => void
}) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  const lastAdminMsgIdRef = useRef<string | number | null>(null)
  const isFirstLoadRef = useRef(true)

  // 1. 위변조 방지 실시간 시계 (초 단위)
  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. 방문자 상세 정보 상태 폴링 (3초 간격)
  const { data: responseData, error, mutate } = useSWR(
    visitorId ? `/api/visitors/${visitorId}` : null,
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: true }
  )

  const visitor = responseData?.visitor || responseData?.data || responseData
  const name = visitor?.name || visitor?.visitor_name || "-"
  const company = visitor?.company || visitor?.company_name || "-"
  const floor = visitor?.floor || visitor?.work_floor || "-"
  const phone = visitor?.phone || visitor?.phone_number || "-"
  const status = visitor?.status || "pending"
  
  const enteredAt = visitor?.entered_at || visitor?.enteredAt
  const exitedAt = visitor?.exited_at || visitor?.exitedAt

  // 3. 관리자 삭제 감지 시 자동 초기화
  useEffect(() => {
    if (status === "deleted") {
      toast.info("관리자에 의해 신청 정보가 삭제되었습니다.")
      onReset()
    }

    if (error && (error as any).status === 404) {
      toast.info("등록된 신청 정보가 없습니다.")
      onReset()
    }
  }, [status, error, onReset])

  // 4. 독립 백그라운드 메시지 폴링 (팝업 감지)
  useEffect(() => {
    if (!visitorId) return

    const checkNewMessages = async () => {
      try {
        let res = await fetch(`/api/messages?visitorId=${visitorId}`)
        if (!res.ok) {
          res = await fetch(`/api/visitors/${visitorId}/messages`)
        }
        if (!res.ok) return

        const data = await res.json()
        const msgList = Array.isArray(data) ? data : data.messages || data.data || []
        if (!Array.isArray(msgList) || msgList.length === 0) return

        const adminMsgs = msgList.filter(
          (m: any) => m.sender === "admin" || m.sender_type === "admin" || m.isAdmin === true
        )
        if (adminMsgs.length === 0) return

        const latestAdminMsg = adminMsgs[adminMsgs.length - 1]
        const latestMsgId = latestAdminMsg.id || latestAdminMsg._id || latestAdminMsg.created_at

        // 첫 로딩 시 기존 메시지 감지 방지
        if (isFirstLoadRef.current) {
          lastAdminMsgIdRef.current = latestMsgId
          isFirstLoadRef.current = false
          return
        }

        // 새 메시지가 들어왔을 때 팝업(Toast) 노출
        if (latestMsgId && lastAdminMsgIdRef.current !== latestMsgId) {
          lastAdminMsgIdRef.current = latestMsgId

          toast.info("💬 관리자 답변이 도착했습니다", {
            description: latestAdminMsg.content || latestAdminMsg.message || "새로운 메시지가 도착했습니다.",
            duration: 6000,
            action: {
              label: "답변 확인",
              onClick: () => setIsChatOpen(true),
            },
          })
        }
      } catch (e) {
        // 폴링 에러 무시
      }
    }

    checkNewMessages()
    const interval = setInterval(checkNewMessages, 3000)
    return () => clearInterval(interval)
  }, [visitorId])

  const handleExit = async () => {
    if (!visitorId) return
    setIsExiting(true)
    try {
      const res = await fetch(`/api/visitors/${visitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exit" }),
      })

      if (!res.ok) throw new Error("퇴실 처리에 실패했습니다.")

      toast.success("퇴실 처리가 완료되었습니다.")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setIsExiting(false)
    }
  }

  if (!visitor && !error) {
    return (
      <div className="flex justify-center py-12 text-sm text-muted-foreground">
        방문 신청 정보를 불러오는 중...
      </div>
    )
  }

  if (!visitor || status === "deleted") {
    return null
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* 위변조 방지 시계 */}
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs text-primary shadow-sm">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldAlert className="size-4 animate-pulse text-primary" />
          <span>위변조 방지 실시간 시계</span>
        </div>
        <div className="font-mono text-sm font-bold tracking-wider">
          {now ? now.toLocaleTimeString("ko-KR", { hour12: false }) : "--:--:--"}
        </div>
      </div>

      {/* 상태 메인 카드 */}
      <Card className={`border-2 shadow-lg transition-colors ${
        status === "pending"
          ? "border-amber-500/30 bg-amber-500/10"
          : status === "onsite"
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-slate-500/30 bg-slate-500/10"
      }`}>
        <CardHeader className="pb-4 text-center">
          <div className={`mx-auto mb-2 flex size-12 items-center justify-center rounded-full ${
            status === "pending"
              ? "bg-amber-500/20 text-amber-500"
              : status === "onsite"
              ? "bg-emerald-500/20 text-emerald-500"
              : "bg-slate-500/20 text-slate-400"
          }`}>
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">{name} 님</CardTitle>
          <CardDescription className="text-foreground/70">{company} · {floor}</CardDescription>
          
          <div className="pt-2 flex justify-center">
            {status === "pending" && (
              <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs text-amber-400">
                <Clock className="size-3.5" /> 승인 대기 중
              </Badge>
            )}
            {status === "onsite" && (
              <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                <CheckCircle2 className="size-3.5" /> 재실 중 (승인 완료)
              </Badge>
            )}
            {status === "exited" && (
              <Badge variant="outline" className="gap-1 border-slate-500/40 bg-slate-500/20 px-3 py-1 text-xs text-slate-400">
                퇴실 완료
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-background/50 p-2.5 border border-border/40">
              <span className="block text-muted-foreground mb-1">입실 시간</span>
              <span className="font-mono text-sm font-semibold">{formatTime(enteredAt)}</span>
            </div>
            <div className="rounded-lg bg-background/50 p-2.5 border border-border/40">
              <span className="block text-muted-foreground mb-1">퇴실 시간</span>
              <span className="font-mono text-sm font-semibold">{formatTime(exitedAt)}</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-background/60 p-4 text-sm border border-border/40">
            <div className="flex justify-between">
              <span className="text-muted-foreground">소속</span>
              <span className="font-medium">{company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">작업층</span>
              <span className="font-medium">{floor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">연락처</span>
              <span className="font-mono">{phone}</span>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="w-full gap-2 bg-background/80"
              onClick={() => setIsChatOpen(true)}
            >
              <MessageCircle className="size-4" />
              관리자 문의
            </Button>

            {status === "onsite" && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleExit}
                disabled={isExiting}
              >
                <LogOut className="size-4" />
                {isExiting ? "처리 중..." : "퇴실하기"}
              </Button>
            )}

            {status === "exited" && (
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={onReset}
              >
                <RotateCcw className="size-4" />
                재입실하기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 문의 모달 */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>관리자 문의하기</DialogTitle>
          </DialogHeader>
          <ChatPanel 
            visitorId={visitor.id || visitorId} 
            viewpoint="worker" 
            className="h-96"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
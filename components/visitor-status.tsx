"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { toast } from "sonner"
import { Building2, MessageCircle, LogOut, Clock, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { createClient } from "@/lib/supabase/client"
import type { Visitor } from "@/lib/types"
import { FloorBadges, sortFloors } from "@/components/floor-picker"

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
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [announcement, setAnnouncement] = useState<{ id: string; text: string; created_at: string } | null>(null)
  const seenMessageIds = useRef<Set<string>>(new Set())
  const initializedMessages = useRef(false)

  const supabase = useMemo(() => createClient(), [])

  // 1. 위변조 방지 실시간 시계 (초 단위)
  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. 방문자 상세 정보 직접 조회 함수 (Supabase Client 활용)
  const fetchVisitorData = useCallback(async () => {
    if (!visitorId) return
    try {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .eq("id", visitorId)
        .single()

      if (error || !data) {
        throw new Error("정보를 불러올 수 없습니다.")
      }

      if (data.status === "deleted") {
        toast.info("관리자에 의해 신청 정보가 삭제되었습니다.")
        onReset()
        return
      }

      setVisitor(data)
    } catch (err) {
      console.error("[Visitor Status Fetch Error]:", err)
      toast.info("등록된 신청 정보가 없습니다.")
      onReset()
    } finally {
      setIsLoading(false)
    }
  }, [visitorId, supabase, onReset])

  // 3. 폴링을 통한 실시간 상태 동기화 (3초 간격)
  useEffect(() => {
    fetchVisitorData()
    const interval = setInterval(fetchVisitorData, 3000)
    return () => clearInterval(interval)
  }, [fetchVisitorData])

  // 채팅창을 열지 않아도 관리자 메시지를 감지해 즉시 알립니다.
  useEffect(() => {
    if (!visitorId) return

    const fetchIncomingMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, visitor_id, sender, text, created_at, is_read")
        .eq("visitor_id", visitorId)
        .eq("sender", "admin")
        .eq("is_read", false)
        .order("created_at", { ascending: true })

      if (error || !data) return

      const unread = data as Array<{ id: string; text?: string; content?: string }>
      if (initializedMessages.current) {
        const incoming = unread.find((message) => !seenMessageIds.current.has(String(message.id)))
        if (incoming) {
          const incomingText = incoming.text || incoming.content || "새 메시지를 확인해 주세요."
          if (incomingText.startsWith("[공지]")) {
            setAnnouncement({
              id: String(incoming.id),
              text: incomingText.replace(/^\[공지\]\s*/, ""),
              created_at: String((incoming as { created_at?: string }).created_at || new Date().toISOString()),
            })
          } else {
            toast.info("관리자 메시지가 도착했습니다", {
              description: incomingText,
              duration: 10000,
              className: "border-2 border-blue-600 bg-white text-slate-950 shadow-xl",
              descriptionClassName: "text-slate-700",
              action: {
                label: "메시지 열기",
                onClick: () => setIsChatOpen(true),
              },
            })
          }
        }
      }

      seenMessageIds.current = new Set(unread.map((message) => String(message.id)))
      initializedMessages.current = true
    }

    void fetchIncomingMessages()
    const interval = setInterval(() => void fetchIncomingMessages(), 1000)
    return () => clearInterval(interval)
  }, [supabase, visitorId])

  const acknowledgeAnnouncement = async () => {
    if (!announcement) return

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("id", announcement.id)
      .eq("visitor_id", visitorId)

    if (error) {
      toast.error("공지 확인 처리에 실패했습니다.")
      return
    }

    setAnnouncement(null)
  }

  // 4. 퇴실 처리 (Supabase 직접 Update)
  const handleExit = async () => {
    if (!visitorId) return
    setIsExiting(true)
    try {
      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from("visitors")
        .update({
          status: "exited",
          exited_at: nowIso,
        })
        .eq("id", visitorId)

      if (error) throw error

      toast.success("퇴실 처리가 완료되었습니다.")
      fetchVisitorData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setIsExiting(false)
    }
  }

  if (isLoading && !visitor) {
    return (
      <div className="flex justify-center py-12 text-sm text-muted-foreground">
        방문 신청 정보를 불러오는 중...
      </div>
    )
  }

  if (!visitor || visitor.status === "deleted") {
    return null
  }

  const name = visitor.name || "-"
  const company = visitor.company || "-"
  const floor = visitor.floor || "-"
  const phone = visitor.phone || "-"
  const status = visitor.status || "pending"
  const enteredAt = visitor.enteredAt || visitor.entered_at
  const exitedAt = visitor.exitedAt || visitor.exited_at

  return (
    <div className="mx-auto w-full max-w-md min-w-0 space-y-4 overflow-x-hidden">
      <AlertDialog open={Boolean(announcement)} onOpenChange={() => undefined}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>관리자 공지</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">
              {announcement?.text}
              {announcement?.created_at && (
                <span className="mt-3 block text-xs text-slate-500">
                  전송 시각: {new Date(announcement.created_at).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={acknowledgeAnnouncement}>확인했습니다.</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="space-y-2"><span className="block text-muted-foreground">작업층 (고정)</span><FloorBadges value={floor} /></div>
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

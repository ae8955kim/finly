"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Building2, MessageCircle, LogOut, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChatPanel } from "@/components/chat-panel"
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
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // 3초 간격 실시간 조회
  const { data: visitor, error, mutate } = useSWR<Visitor>(
    visitorId ? `/api/visitors/${visitorId}` : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    }
  )

  // 관리자 삭제 감지 처리
  useEffect(() => {
    if (visitor && visitor.status === "deleted") {
      toast.info("신청 정보가 삭제되었습니다. 다시 등록해 주세요.")
      onReset()
    }

    if (error && (error as any).status === 404) {
      toast.info("등록된 신청 정보가 없습니다. 다시 등록해 주세요.")
      onReset()
    }
  }, [visitor, error, onReset])

  // 공사자 직접 퇴실 요청
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

  if (!visitor || visitor.status === "deleted") {
    return null
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">{visitor.name} 님</CardTitle>
          <CardDescription>{visitor.company} · {visitor.floor}</CardDescription>
          
          <div className="pt-2">
            {visitor.status === "pending" && (
              <Badge variant="outline" className="bg-chart-3/15 text-chart-3 border-chart-3/20 gap-1 px-3 py-1 text-xs">
                <Clock className="size-3.5" /> 승인 대기 중
              </Badge>
            )}
            {visitor.status === "onsite" && (
              <Badge variant="outline" className="bg-chart-2/15 text-chart-2 border-chart-2/20 gap-1 px-3 py-1 text-xs">
                <CheckCircle2 className="size-3.5" /> 재실 중 (승인 완료)
              </Badge>
            )}
            {visitor.status === "exited" && (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 px-3 py-1 text-xs">
                퇴실 완료
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">연락처</span>
              <span className="font-mono">{visitor.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">작업층</span>
              <span>{visitor.floor}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* 문의/채팅 버튼 */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setIsChatOpen(true)}
            >
              <MessageCircle className="size-4" />
              관리자 문의
            </Button>

            {/* 퇴실 / 신규 등록 버튼 */}
            {visitor.status === "onsite" && (
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

            {(visitor.status === "pending" || visitor.status === "exited") && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onReset}
              >
                새로 등록하기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 문의 / 채팅 모달 */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>관리자 문의하기</DialogTitle>
          </DialogHeader>
          <ChatPanel 
            visitorId={visitor.id} 
            viewpoint="worker" 
            className="h-96"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Building2, MessageCircle, LogOut, Clock, CheckCircle2, RotateCcw } from "lucide-react"
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

export function VisitorStatusView({
  visitorId,
  onReset,
}: {
  visitorId: string
  onReset: () => void
}) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // 3초 간격 실시간 상태 조회
  const { data: rawVisitor, error, mutate } = useSWR(
    visitorId ? `/api/visitors/${visitorId}` : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    }
  )

  // API 응답 데이터가 wrapper 객체({ visitor: ... }) 형태로 들어오는 경우 대비
  const visitor = rawVisitor?.visitor || rawVisitor

  // 다양한 DB 필드명 대응 (CamelCase & SnakeCase)
  const name = visitor?.name || visitor?.visitor_name || visitor?.visitorName || "방문자"
  const company = visitor?.company || visitor?.company_name || visitor?.companyName || "-"
  const floor = visitor?.floor || visitor?.work_floor || visitor?.floorInfo || "-"
  const phone = visitor?.phone || visitor?.phone_number || visitor?.phoneNumber || "-"
  const status = visitor?.status || "pending"

  // 관리자 삭제 및 404 감지 처리
  useEffect(() => {
    if (visitor && status === "deleted") {
      toast.info("신청 정보가 삭제되었습니다. 다시 등록해 주세요.")
      onReset()
    }

    if (error && (error as any).status === 404) {
      toast.info("등록된 신청 정보가 없습니다. 다시 등록해 주세요.")
      onReset()
    }
  }, [visitor, status, error, onReset])

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

  if (!visitor || status === "deleted") {
    return null
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">{name} 님</CardTitle>
          <CardDescription>{company} · {floor}</CardDescription>
          
          <div className="pt-2">
            {status === "pending" && (
              <Badge variant="outline" className="gap-1 border-chart-3/20 bg-chart-3/15 text-xs text-chart-3">
                <Clock className="size-3.5" /> 승인 대기 중
              </Badge>
            )}
            {status === "onsite" && (
              <Badge variant="outline" className="gap-1 border-chart-2/20 bg-chart-2/15 text-xs text-chart-2">
                <CheckCircle2 className="size-3.5" /> 재실 중 (승인 완료)
              </Badge>
            )}
            {status === "exited" && (
              <Badge variant="outline" className="gap-1 border-border bg-muted text-xs text-muted-foreground">
                퇴실 완료
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
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

            {/* 상태별 액션 버튼 */}
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

            {(status === "pending" || status === "exited") && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onReset}
              >
                <RotateCcw className="size-4" />
                초기 화면으로
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
            visitorId={visitor.id || visitorId} 
            viewpoint="worker" 
            className="h-96"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
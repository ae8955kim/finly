"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { FileText, MessageCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ChatPanel } from "@/components/chat-panel"
import type { Visitor, ChatMessage } from "@/lib/types"

type VisitorStatus = Visitor["status"]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// 시간 포맷 헬퍼 함수
function formatTime(iso: string | null | undefined) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return "-"
  }
}

// 입실 시간 포맷 (전날 입실 시 [YYYY.MM.DD HH:mm] 출력)
function formatEnteredTime(iso: string | null | undefined, isPrevious: boolean) {
  if (!iso) return "-"
  try {
    const d = new Date(iso)
    const timeStr = d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })

    if (isPrevious) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `[${year}.${month}.${day} ${timeStr}]`
    }

    return timeStr
  } catch {
    return "-"
  }
}

const STATUS_META: Record<VisitorStatus, { label: string; className: string }> = {
  pending: {
    label: "승인 대기",
    className: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  },
  onsite: {
    label: "재실 중",
    className: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  },
  exited: {
    label: "퇴실",
    className: "bg-muted text-muted-foreground border-border",
  },
  deleted: {
    label: "삭제됨",
    className: "bg-destructive/15 text-destructive border-destructive/20",
  },
}

function VisitorRow({
  visitor,
  busy,
  onAct,
  onOpenChat,
  onOpenMemo,
  isChatOpen,
}: {
  visitor: Visitor
  busy: boolean
  onAct: (id: string, action: "approve" | "exit" | "delete" | "restore") => void
  onOpenChat: (visitor: Visitor) => void
  onOpenMemo: (visitor: Visitor) => void
  isChatOpen: boolean
}) {
  const meta = STATUS_META[visitor.status] || STATUS_META.pending

  const { data: msgData, mutate } = useSWR<{ messages: ChatMessage[] }>(
    `/api/visitors/${visitor.id}/messages`,
    fetcher,
    { 
      refreshInterval: isChatOpen ? 3000 : 8000,
      revalidateOnFocus: true,
    }
  )

  const rawMessages = msgData?.messages || (Array.isArray(msgData) ? (msgData as ChatMessage[]) : [])
  const hasUnread = Array.isArray(rawMessages) && rawMessages.some((m) => {
    const isWorker = m.sender === "worker"
    const isRead = m.isRead ?? (m as any).is_read ?? false
    return isWorker && !isRead
  })

  const markAsRead = useCallback(async () => {
    try {
      await fetch(`/api/visitors/${visitor.id}/messages`, { method: "PATCH" })
      mutate()
    } catch (err) {
      console.error("읽음 처리 실패:", err)
    }
  }, [visitor.id, mutate])

  useEffect(() => {
    if (isChatOpen && hasUnread) {
      markAsRead()
    }
  }, [isChatOpen, hasUnread, markAsRead])

  const memoValue = visitor.memo
  const hasMemo = Boolean(memoValue && String(memoValue).trim().length > 0)
  const isPrevious = visitor.is_from_previous_day ?? (visitor as any).isFromPreviousDay
  const enteredTime = visitor.entered_at ?? (visitor as any).enteredAt
  const exitedTime = visitor.exited_at ?? (visitor as any).exitedAt

  return (
    <TableRow>
      <TableCell className="font-medium">{visitor.name ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{visitor.company ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{visitor.floor ?? "-"}</TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">{visitor.birth ?? "-"}</TableCell>
      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
        {visitor.phone ?? "-"}
      </TableCell>
      
      {/* 입실 시간 란 */}
      <TableCell className="text-center font-mono text-xs tabular-nums">
        {isPrevious ? (
          <span className="font-medium text-chart-2">
            {formatEnteredTime(enteredTime, true)}
          </span>
        ) : (
          formatEnteredTime(enteredTime, false)
        )}
      </TableCell>

      {/* 퇴실 시간 란: 미퇴실 표기 없이 공란('-') 유지, 퇴실 완료 시 시각 표시 */}
      <TableCell className="text-center font-mono text-xs tabular-nums">
        {formatTime(exitedTime)}
      </TableCell>

      <TableCell className="text-center">
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
      </TableCell>
      
      {/* 메모 버튼 */}
      <TableCell className="text-center">
        <Button
          size="icon"
          variant="ghost"
          className="relative size-8"
          onClick={() => onOpenMemo(visitor)}
          title={hasMemo ? `메모: ${memoValue}` : "메모 작성"}
          aria-label={`${visitor.name ?? "방문자"} 메모 ${hasMemo ? "확인" : "작성"}`}
        >
          <FileText className={`size-4 ${hasMemo ? "fill-primary/10 text-primary" : "text-muted-foreground"}`} />
          {hasMemo && (
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </TableCell>

      {/* 문의 / 채팅 버튼 */}
      <TableCell className="text-center">
        <div className="relative inline-block">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => {
              onOpenChat(visitor)
              if (hasUnread) {
                markAsRead()
              }
            }}
            aria-label={`${visitor.name ?? "방문자"} 채팅 열기`}
          >
            <MessageCircle className="size-4" />
          </Button>
          {hasUnread && (
            <span className="absolute top-0 right-0 size-2.5 animate-pulse rounded-full bg-destructive" />
          )}
        </div>
      </TableCell>

      {/* 상태 관리 액션 버튼 */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {visitor.status === "pending" && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onAct(visitor.id, "approve")}>
                승인
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onAct(visitor.id, "delete")}
                aria-label={`${visitor.name ?? "방문자"} 항목 삭제`}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
          {visitor.status === "onsite" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onAct(visitor.id, "exit")}
              >
                퇴실
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onAct(visitor.id, "delete")}
                aria-label={`${visitor.name ?? "방문자"} 항목 삭제`}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
          {visitor.status === "exited" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onAct(visitor.id, "delete")}
              aria-label={`${visitor.name ?? "방문자"} 항목 삭제`}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function VisitorTable({
  visitors,
  onMutate,
}: {
  visitors: Visitor[]
  onMutate: () => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [chatWith, setChatWith] = useState<Visitor | null>(null)
  
  const [memoVisitor, setMemoVisitor] = useState<Visitor | null>(null)
  const [memoText, setMemoText] = useState("")
  const [savingMemo, setSavingMemo] = useState(false)

  const handleOpenMemo = (visitor: Visitor) => {
    setMemoVisitor(visitor)
    setMemoText(visitor.memo || (visitor as any).memo || "")
  }

  const handleSaveMemo = async () => {
    if (!memoVisitor) return
    setSavingMemo(true)
    try {
      const res = await fetch(`/api/visitors/${memoVisitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "memo", memo: memoText }),
      })

      if (!res.ok) throw new Error("메모 저장에 실패했습니다.")

      toast.success("메모가 저장되었습니다.")
      setMemoVisitor(null)
      if (typeof onMutate === "function") {
        onMutate()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setSavingMemo(false)
    }
  }

  async function act(id: string, action: "approve" | "exit" | "delete" | "restore") {
    setPendingId(id)
    try {
      if (!id) throw new Error("방문자 ID가 없습니다.")

      const res = await fetch(`/api/visitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      
      if (!res.ok) {
        let errorMessage = "처리에 실패했습니다."
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch {
          if (res.status === 404) errorMessage = "요청한 정보를 찾을 수 없습니다."
          else if (res.status === 400) errorMessage = "잘못된 요청입니다."
          else if (res.status >= 500) errorMessage = "서버 오류가 발생했습니다."
        }
        throw new Error(errorMessage)
      }

      const messages: Record<string, string> = {
        approve: "승인되어 입실 처리되었습니다.",
        exit: "퇴실 처리되었습니다.",
        delete: "목록에서 삭제되었습니다.",
        restore: "복구되었습니다.",
      }
      
      toast.success(messages[action] || "처리되었습니다.")
      if (typeof onMutate === "function") {
        onMutate()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "오류가 발생했습니다."
      toast.error(errorMessage)
    } finally {
      setPendingId(null)
    }
  }

  if (!Array.isArray(visitors) || visitors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        아직 등록된 방문자가 없습니다.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>이름</TableHead>
              <TableHead>소속</TableHead>
              <TableHead>작업층</TableHead>
              <TableHead className="hidden md:table-cell">생년월일</TableHead>
              <TableHead className="hidden lg:table-cell">전화번호</TableHead>
              <TableHead className="text-center">입실</TableHead>
              <TableHead className="text-center">퇴실</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-center">메모</TableHead>
              <TableHead className="text-center">문의</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitors.map((v) => (
              <VisitorRow
                key={v.id}
                visitor={v}
                busy={pendingId === v.id}
                onAct={act}
                onOpenChat={(visitor) => setChatWith(visitor)}
                onOpenMemo={handleOpenMemo}
                isChatOpen={chatWith?.id === v.id}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 채팅 모달 */}
      <Dialog open={chatWith !== null} onOpenChange={(open) => !open && setChatWith(null)}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {chatWith ? `${chatWith.name} · ${chatWith.floor}` : "채팅"}
            </DialogTitle>
          </DialogHeader>
          {chatWith && (
            <ChatPanel 
              visitorId={chatWith.id} 
              viewpoint="admin" 
              className="h-96"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 메모 모달 */}
      <Dialog open={memoVisitor !== null} onOpenChange={(open) => !open && setMemoVisitor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {memoVisitor ? `${memoVisitor.name} (${memoVisitor.company}) 메모` : "관리자 메모"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="특이사항이나 전달받은 메모 내용을 입력하세요..."
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMemoVisitor(null)}>
              취소
            </Button>
            <Button onClick={handleSaveMemo} disabled={savingMemo}>
              {savingMemo ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
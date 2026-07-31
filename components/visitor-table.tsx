"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { MessageCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/dialog"
import { ChatPanel } from "@/components/chat-panel"
import type { Visitor, ChatMessage } from "@/lib/types"

type VisitorStatus = Visitor["status"]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatTime(iso: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
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

// 각 방문자별로 3초마다 백그라운드 메시지 감지 및 읽음 처리 담당 컴포넌트
function VisitorRow({
  visitor,
  busy,
  onAct,
  onOpenChat,
  isChatOpen,
}: {
  visitor: Visitor
  busy: boolean
  onAct: (id: string, action: "approve" | "exit" | "delete" | "restore") => void
  onOpenChat: (visitor: Visitor) => void
  isChatOpen: boolean
}) {
  const meta = STATUS_META[visitor.status]

  // 3초 주기로 백그라운드에서 실시간 메시지 데이터 감지
  const { data: msgData, mutate } = useSWR<{ messages: ChatMessage[] }>(
    `/api/visitors/${visitor.id}/messages`,
    fetcher,
    { refreshInterval: 3000 }
  )

  const rawMessages = msgData?.messages || (Array.isArray(msgData) ? msgData : [])

  // 상대방(공사자)이 보낸 읽지 않은 메시지가 있는지 체크
  const hasUnread = rawMessages.some((m: any) => m.sender === "worker" && !(m.isRead || m.is_read))

  // 대화창이 열렸을 때 자동으로 백엔드 읽음 처리(PATCH) 호출
  useEffect(() => {
    if (isChatOpen && hasUnread) {
      fetch(`/api/visitors/${visitor.id}/messages`, { method: "PATCH" })
        .then(() => mutate())
        .catch((err) => console.error("읽음 처리 실패:", err))
    }
  }, [isChatOpen, hasUnread, visitor.id, mutate])

  return (
    <TableRow>
      <TableCell className="font-medium">{visitor.name ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{visitor.company ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground">{visitor.floor ?? "-"}</TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">{visitor.birth ?? "-"}</TableCell>
      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
        {visitor.phone ?? "-"}
      </TableCell>
      <TableCell className="text-center font-mono text-xs tabular-nums">
        {visitor.isFromPreviousDay ? (
          <span className="font-medium text-chart-2">전 날 입실</span>
        ) : (
          formatTime(visitor.enteredAt)
        )}
      </TableCell>
      <TableCell className="text-center font-mono text-xs tabular-nums">
        {visitor.isFromPreviousDay ? (
          <span className="font-medium text-destructive">미퇴실</span>
        ) : (
          formatTime(visitor.exitedAt)
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="relative inline-block">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => {
              onOpenChat(visitor)
              // 대화창 열 때 즉시 읽음 처리 수행
              if (hasUnread) {
                fetch(`/api/visitors/${visitor.id}/messages`, { method: "PATCH" }).then(() => mutate())
              }
            }}
            aria-label={`${visitor.name} 채팅 열기`}
            title="클릭 시 채팅창 열기 및 읽음 처리"
          >
            <MessageCircle className="size-4" />
          </Button>
          {/* 새 메시지가 있으면 빨간 알림 뱃지 표시 */}
          {hasUnread && (
            <div className="absolute top-0 right-0 size-2.5 rounded-full bg-destructive animate-pulse" />
          )}
        </div>
      </TableCell>
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
                aria-label="목록 삭제"
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
                aria-label="목록 삭제"
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
              aria-label="목록 삭제"
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

  async function act(id: string, action: "approve" | "exit" | "delete" | "restore") {
    setPendingId(id)
    try {
      if (!id) {
        throw new Error("방문자 ID가 없습니다.")
      }

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

      const responseData = await res.json()
      if (!responseData.success || !responseData.data) {
        throw new Error("응답 데이터가 유효하지 않습니다.")
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

  if (visitors.length === 0) {
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
                isChatOpen={chatWith?.id === v.id}
              />
            ))}
          </TableBody>
        </Table>
      </div>

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
    </>
  )
}
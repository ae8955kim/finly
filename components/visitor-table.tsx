"use client"

import { useState } from "react"
import { toast } from "sonner"
import { MessageCircle, Trash2, RotateCcw } from "lucide-react"
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
import type { Visitor } from "@/lib/types"

type VisitorStatus = Visitor["status"]

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

export function VisitorTable({
  visitors,
  onMutate,
}: {
  visitors: Visitor[]
  onMutate: () => void
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [chatWith, setChatWith] = useState<Visitor | null>(null)
  const [unreadMessages, setUnreadMessages] = useState<Record<string, boolean>>({})

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
      
      // 네트워크 오류나 서버 오류 처리
      if (!res.ok) {
        let errorMessage = "처리에 실패했습니다."
        
        try {
          const data = await res.json()
          errorMessage = data.error || errorMessage
        } catch {
          // JSON 파싱 실패 시 상태 코드로 기본 메시지 생성
          if (res.status === 404) {
            errorMessage = "요청한 정보를 찾을 수 없습니다."
          } else if (res.status === 400) {
            errorMessage = "잘못된 요청입니다."
          } else if (res.status >= 500) {
            errorMessage = "서버 오류가 발생했습니다."
          }
        }
        
        console.error("[v0] API error in visitor action:", { status: res.status, action, id, message: errorMessage })
        throw new Error(errorMessage)
      }
      
      try {
        const data = await res.json()
        if (!data.visitor) {
          throw new Error("응답 데이터가 유효하지 않습니다.")
        }
      } catch (parseErr) {
        console.error("[v0] Response parsing error:", parseErr)
        throw new Error("응답 데이터를 처리할 수 없습니다.")
      }

      const messages: Record<string, string> = {
        approve: "승인되어 입실 처리되었습니다.",
        exit: "퇴실 처리되었습니다.",
        delete: "목록에서 삭제되었습니다.",
        restore: "복구되었습니다.",
      }
      
      toast.success(messages[action] || "처리되었습니다.")
      
      // 데이터 새로고침
      if (typeof onMutate === "function") {
        onMutate()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "오류가 발생했습니다."
      console.error("[v0] Error in visitor action:", { error: err, errorMessage })
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
          {visitors.map((v) => {
            const meta = STATUS_META[v.status]
            const busy = pendingId === v.id
            return (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-muted-foreground">{v.company}</TableCell>
                <TableCell className="text-muted-foreground">{v.floor}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{v.birth}</TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                  {v.phone}
                </TableCell>
                <TableCell className="text-center font-mono text-xs tabular-nums">
                  {v.isFromPreviousDay ? (
                    <span className="font-medium text-chart-2">전 날 입실</span>
                  ) : (
                    formatTime(v.enteredAt)
                  )}
                </TableCell>
                <TableCell className="text-center font-mono text-xs tabular-nums">
                  {v.isFromPreviousDay ? (
                    <span className="font-medium text-destructive">미퇴실</span>
                  ) : (
                    formatTime(v.exitedAt)
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
                        setChatWith(v)
                        setUnreadMessages((prev) => ({ ...prev, [v.id]: false }))
                      }}
                      aria-label={`${v.name} 채팅 열기`}
                      title="클릭하면 알림이 사라집니다"
                    >
                      <MessageCircle className="size-4" />
                    </Button>
                    {unreadMessages[v.id] && (
                      <div className="absolute top-0 right-0 size-2.5 rounded-full bg-destructive" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {v.status === "pending" && (
                      <>
                        <Button size="sm" disabled={busy} onClick={() => act(v.id, "approve")}>
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => act(v.id, "delete")}
                          aria-label="목록 삭제"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                    {v.status === "onsite" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => act(v.id, "exit")}
                        >
                          퇴실
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => act(v.id, "delete")}
                          aria-label="목록 삭제"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                    {v.status === "exited" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => act(v.id, "delete")}
                        aria-label="목록 삭제"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
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
              onNewMessage={(hasNew) => {
                if (chatWith) {
                  setUnreadMessages((prev) => ({ ...prev, [chatWith.id]: hasNew }))
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import React, { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ChatMessage, ChatSender } from "@/lib/types"

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("메시지를 불러오지 못했습니다.")
    return res.json()
  })

function formatTime(iso?: string) {
  if (!iso) return ""
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// viewpoint: 현재 화면이 공사자("worker")인지 관리자("admin")인지 — 내 말풍선 정렬 기준
export function ChatPanel({
  visitorId,
  viewpoint,
  className,
  onNewMessage,
}: {
  visitorId: string
  viewpoint: ChatSender
  className?: string
  onNewMessage?: (hasNew: boolean) => void
}) {
  const { data, mutate } = useSWR<{ messages: ChatMessage[] }>(
    `/api/visitors/${visitorId}/messages`,
    fetcher,
    { refreshInterval: 1000 },
  )
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [lastMessageCount, setLastMessageCount] = React.useState(0)

  // API 응답 구조(data.messages 또는 data) 대응
  const rawMessages = data?.messages || (Array.isArray(data) ? data : [])
  const messages = rawMessages

  // Track new messages from other party
  React.useEffect(() => {
    if (messages.length > lastMessageCount) {
      const newMessages = messages.slice(lastMessageCount)
      const hasOtherPartyMessage = newMessages.some((m) => m.sender !== viewpoint)
      if (hasOtherPartyMessage && onNewMessage) {
        onNewMessage(true)
      }
      setLastMessageCount(messages.length)
    }
  }, [messages.length, lastMessageCount, viewpoint, onNewMessage])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return

    setSending(true)

    const now = new Date().toISOString()
    // 낙관적 업데이트 - 모든 텍스트 키값 호환 처리
    const optimistic: any = {
      id: `tmp-${Date.now()}`,
      visitor_id: visitorId,
      sender: viewpoint,
      text: value,
      content: value,
      message: value,
      created_at: now,
      createdAt: now,
    }
    setText("")
    await mutate({ messages: [...messages, optimistic] }, { revalidate: false })

    try {
      const res = await fetch(`/api/visitors/${visitorId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, content: value, sender: viewpoint }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "전송에 실패했습니다.")
      }
      await mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.")
      await mutate()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {viewpoint === "worker"
                ? "관리자에게 궁금한 점을 문의해 보세요."
                : "아직 대화 내용이 없습니다."}
            </p>
          ) : (
            messages.map((m: any, idx: number) => {
              const mine = m.sender === viewpoint
              // ⭐ content, message, text 중 존재하는 텍스트 필드를 우선 렌더링! (글자 사라짐 방지)
              const messageText = m.content || m.message || m.text || ""
              const createdAt = m.created_at || m.createdAt

              return (
                <div key={m.id || idx} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                      mine
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm border border-slate-200 bg-slate-100 text-slate-900",
                    )}
                  >
                    {messageText}
                  </div>
                  <span className="px-1 text-[11px] tabular-nums text-muted-foreground">
                    {m.sender === "admin" ? "관리자" : "공사자"} · {formatTime(createdAt)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          onKeyDown={(e) => {
            // CJK 입력기 조합 중 Enter는 제출하지 않음
            if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) {
              e.preventDefault()
            }
          }}
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="메시지 전송">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}

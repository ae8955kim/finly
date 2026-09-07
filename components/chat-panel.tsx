"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { ChatMessage, ChatSender } from "@/lib/types"

type ChatPanelProps = {
  visitorId: string
  viewpoint: ChatSender
  className?: string
  onNewMessage?: (hasNew: boolean) => void
}

function getSupabase() {
  return createClient()
}

function formatTime(iso?: string) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

async function fetchMessages(visitorId: string): Promise<{ messages: ChatMessage[] }> {
  const { data, error } = await getSupabase()
    .from("chat_messages")
    .select("id, visitor_id, sender, text, created_at, is_read")
    .eq("visitor_id", visitorId)
    .order("created_at", { ascending: true })

  if (error) throw new Error("메시지를 불러오지 못했습니다.")
  return { messages: (data ?? []) as ChatMessage[] }
}

export function ChatPanel({ visitorId, viewpoint, className, onNewMessage }: ChatPanelProps) {
  const key = useMemo(() => ["chat_messages", visitorId] as const, [visitorId])
  const { data, mutate } = useSWR(key, ([, id]) => fetchMessages(id), {
    revalidateOnFocus: false,
  })
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageIds = useRef<Set<string>>(new Set())

  const messages = data?.messages ?? []

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const element = scrollRef.current
      if (element) element.scrollTo({ top: element.scrollHeight, behavior })
    })
  }, [])

  useEffect(() => {
    scrollToBottom("auto")
  }, [scrollToBottom, visitorId])

  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel(`chat_messages:${visitorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `visitor_id=eq.${visitorId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage
          if (!incoming?.id || lastMessageIds.current.has(incoming.id)) return

          lastMessageIds.current.add(incoming.id)
          void mutate(
            (current) => ({
              messages: [...(current?.messages ?? []), incoming].filter(
                (message, index, all) => all.findIndex((item) => item.id === message.id) === index,
              ),
            }),
            { revalidate: false },
          )
          scrollToBottom()
          if (incoming.sender !== viewpoint) onNewMessage?.(true)
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          toast.error("실시간 메시지 연결에 실패했습니다.")
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [mutate, onNewMessage, scrollToBottom, viewpoint, visitorId])

  useEffect(() => {
    messages.forEach((message) => lastMessageIds.current.add(message.id))
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = text.trim()
    if (!value || sending) return

    setSending(true)
    setText("")

    const optimistic: ChatMessage = {
      id: `temporary-${Date.now()}`,
      visitor_id: visitorId,
      sender: viewpoint,
      text: value,
      created_at: new Date().toISOString(),
    }

    await mutate(
      (current) => ({ messages: [...(current?.messages ?? []), optimistic] }),
      { revalidate: false },
    )
    scrollToBottom()

    const { data: inserted, error } = await getSupabase()
      .from("chat_messages")
      .insert({ visitor_id: visitorId, sender: viewpoint, text: value })
      .select("id, visitor_id, sender, text, created_at, is_read")
      .single()

    if (error) {
      toast.error("메시지 전송에 실패했습니다.")
      setText(value)
    } else {
      await mutate(
        (current) => ({
          messages: (current?.messages ?? [])
            .filter((message) => message.id !== optimistic.id)
            .concat(inserted as ChatMessage),
        }),
        { revalidate: false },
      )
      scrollToBottom()
    }

    setSending(false)
  }

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm", className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {viewpoint === "worker" ? "관리자에게 궁금한 점을 문의해 보세요." : "아직 대화 내용이 없습니다."}
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender === viewpoint
              return (
                <div key={message.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm border border-slate-200 bg-slate-100 text-slate-900",
                    )}
                  >
                    {message.text}
                  </div>
                  <span className="px-1 text-[11px] tabular-nums text-slate-500">
                    {message.sender === "admin" ? "관리자" : "공사자"} · {formatTime(message.created_at)}
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
          onChange={(event) => setText(event.target.value)}
          placeholder="메시지를 입력하세요"
          className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
              event.preventDefault()
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

export default ChatPanel

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 1. 메시지 목록 조회 (GET)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const visitorId = parseInt(id, 10)

    if (isNaN(visitorId)) {
      return NextResponse.json({ error: "유효하지 않은 방문자 ID입니다." }, { status: 400 })
    }

    const supabase = await createClient()

    // 방문자 존재 여부 확인
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id")
      .eq("id", visitorId)
      .single()

    if (visitorError || !visitor) {
      console.error("[v0] Visitor not found:", { visitorId })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // 해당 방문자의 메시지 조회
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("visitor_id", visitorId)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("[v0] Error fetching messages:", messagesError)
      return NextResponse.json({ messages: [] }) // UI 다운 방지를 위해 빈 배열 반환
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (err) {
    console.error("[v0] Error in GET messages:", err)
    return NextResponse.json({ messages: [] })
  }
}

// 2. 메시지 전송 (POST)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const visitorId = parseInt(id, 10)

    if (isNaN(visitorId)) {
      return NextResponse.json({ error: "유효하지 않은 방문자 ID입니다." }, { status: 400 })
    }

    const body = await request.json()
    const content = body?.content || body?.text
    const sender = body?.sender || "admin"

    if (typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "메시지가 너무 깁니다." }, { status: 400 })
    }

    const supabase = await createClient()

    // 방문자 존재 여부 확인
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id")
      .eq("id", visitorId)
      .single()

    if (visitorError || !visitor) {
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // chat_messages 테이블에 입력 (visitor_id를 확실한 숫자형으로 전달)
    const messagePayload = {
      visitor_id: visitorId,
      content: content.trim(),
      sender,
    }

    const { data: message, error: insertError } = await supabase
      .from("chat_messages")
      .insert([messagePayload])
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting message:", insertError)
      return NextResponse.json({ error: `메시지 전송 실패: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message, data: message }, { status: 201 })
  } catch (err) {
    console.error("[v0] Error in POST message:", err)
    return NextResponse.json({ error: "메시지 전송에 실패했습니다." }, { status: 500 })
  }
}
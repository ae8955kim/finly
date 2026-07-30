import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Get chat messages for a visitor
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()

    console.log("[v0] GET messages for visitor:", { id })

    // Check if visitor exists
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id")
      .eq("id", id)
      .single()

    if (visitorError) {
      console.error("[v0] Error fetching visitor:", {
        message: visitorError.message,
        code: visitorError.code,
        details: visitorError.details,
      })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    if (!visitor) {
      console.error("[v0] Visitor not found:", { id })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // Get messages for this visitor
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("visitor_id", id)
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("[v0] Error fetching messages:", {
        message: messagesError.message,
        code: messagesError.code,
        details: messagesError.details,
        visitorId: id,
      })
      
      // 테이블이 없는 경우 특별 처리
      if (messagesError.message.includes('no field') || messagesError.message.includes('relation')) {
        return NextResponse.json({ error: "Supabase 데이터베이스 테이블이 준비되지 않았습니다. 관리자에게 문의하세요." }, { status: 500 })
      }
      
      return NextResponse.json({ error: "메시지를 불러오지 못했습니다." }, { status: 500 })
    }

    console.log("[v0] Messages fetched successfully:", { visitorId: id, count: messages?.length || 0 })
    return NextResponse.json({ messages: messages || [] })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error in GET messages:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error in GET messages (unknown error):", err)
    }
    return NextResponse.json({ error: "메시지를 불러오지 못했습니다." }, { status: 500 })
  }
}

// Send a chat message
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const content = body?.content || body?.text
    const sender = body?.sender || 'admin'

    console.log("[v0] POST message request:", { visitorId: id, sender, contentLength: content?.length })

    if (typeof content !== "string" || content.trim() === "") {
      console.error("[v0] Invalid message content:", { content, type: typeof content })
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 })
    }

    if (content.length > 500) {
      console.error("[v0] Message too long:", { length: content.length })
      return NextResponse.json({ error: "메시지가 너무 깁니다." }, { status: 400 })
    }

    if (sender !== "admin" && sender !== "worker") {
      console.error("[v0] Invalid sender:", { sender })
      return NextResponse.json({ error: "발신자가 지정되지 않았습니다." }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if visitor exists
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id")
      .eq("id", id)
      .single()

    if (visitorError || !visitor) {
      console.error("[v0] Visitor not found:", { visitorId: id, error: visitorError?.message })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // Insert message to chat_messages table (with columns: visitor_id, content, sender)
    const messagePayload = {
      visitor_id: id,
      content: content.trim(),
      sender,
    }

    console.log("[v0] Inserting message:", messagePayload)

    const { data: message, error: insertError } = await supabase
      .from("chat_messages")
      .insert([messagePayload])
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting message:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        payload: messagePayload,
      })
      
      // 테이블이 없는 경우 특별 처리
      if (insertError.message.includes('no field') || insertError.message.includes('relation')) {
        return NextResponse.json({ 
          error: "Supabase 데이터베이스 테이블이 준비되지 않았습니다. 관리자에게 문의하세요.",
          details: insertError.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({ error: `메시지 전송에 실패했습니다: ${insertError.message}` }, { status: 500 })
    }

    if (!message) {
      console.error("[v0] No message data returned after insert:", { id, sender, payload: messagePayload })
      return NextResponse.json({ error: "메시지 저장에 실패했습니다." }, { status: 500 })
    }

    console.log("[v0] Message inserted successfully:", { id: message.id, visitorId: id })
    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error in POST message:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error in POST message (unknown error):", err)
    }
    return NextResponse.json({ error: "메시지 전송에 실패했습니다." }, { status: 500 })
  }
}

    if (text.length > 500) {
      console.error("[v0] Message too long:", { length: text.length })
      return NextResponse.json({ error: "메시지가 너무 깁니다." }, { status: 400 })
    }

    if (!sender || (sender !== "admin" && sender !== "worker")) {
      console.error("[v0] Invalid sender:", { sender })
      return NextResponse.json({ error: "발신자가 지정되지 않았습니다." }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if visitor exists
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id")
      .eq("id", id)
      .single()

    if (visitorError) {
      console.error("[v0] Error checking visitor existence:", {
        message: visitorError.message,
        code: visitorError.code,
        details: visitorError.details,
        visitorId: id,
      })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    if (!visitor) {
      console.error("[v0] Visitor not found in POST:", { visitorId: id })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // Insert message
    const messagePayload = {
      visitor_id: id,
      sender,
      text: text.trim(),
    }

    console.log("[v0] Inserting message:", messagePayload)

    const { data: message, error: insertError } = await supabase
      .from("chat_messages")
      .insert([messagePayload])
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting message:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        payload: messagePayload,
      })
      
      // 테이블이 없는 경우 특별 처리
      if (insertError.message.includes('no field') || insertError.message.includes('relation')) {
        return NextResponse.json({ error: "Supabase 데이터베이스 테이블이 준비되지 않았습니다. 관리자에게 문의하세요." }, { status: 500 })
      }
      
      return NextResponse.json({ error: `메시지 전송에 실패했습니다: ${insertError.message}` }, { status: 500 })
    }

    if (!message) {
      console.error("[v0] No message data returned after insert:", { id, sender, payload: messagePayload })
      return NextResponse.json({ error: "메시지 저장에 실패했습니다." }, { status: 500 })
    }

    console.log("[v0] Message inserted successfully:", { id: message.id, visitorId: id })
    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error in POST messages:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error in POST messages (unknown error):", err)
    }
    return NextResponse.json({ error: "메시지 전송에 실패했습니다." }, { status: 500 })
  }
}

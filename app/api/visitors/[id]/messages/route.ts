import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Get chat messages for a visitor
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Check if visitor exists
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id")
      .eq("id", id)
      .single()

    if (visitorError || !visitor) {
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
      })
      return NextResponse.json({ error: "메시지를 불러오지 못했습니다." }, { status: 500 })
    }

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
    const body = await request.json().catch(() => null)
    const text = body?.text
    const sender = body?.sender

    if (typeof text !== "string" || text.trim() === "") {
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 })
    }

    if (text.length > 500) {
      return NextResponse.json({ error: "메시지가 너무 깁니다." }, { status: 400 })
    }

    if (!sender || (sender !== "admin" && sender !== "worker")) {
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
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from("chat_messages")
      .insert([
        {
          visitor_id: id,
          sender,
          text: text.trim(),
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting message:", {
        message: insertError.message,
        code: insertError.code,
      })
      return NextResponse.json({ error: "메시지 전송에 실패했습니다." }, { status: 500 })
    }

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

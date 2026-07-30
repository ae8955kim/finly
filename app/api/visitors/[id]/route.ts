import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Admin: Update visitor status (approve / exit / delete / restore)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    const action = body?.action

    if (!action) {
      return NextResponse.json({ error: "동작이 지정되지 않았습니다." }, { status: 400 })
    }

    const supabase = await createClient()

    if (action === "delete") {
      const { data, error } = await supabase
        .from("visitors")
        .update({
          status: "deleted",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "방문자를 찾을 수 없습니다." }, { status: 404 })
      }

      return NextResponse.json({ visitor: data })
    }

    if (action === "restore") {
      const { data, error } = await supabase
        .from("visitors")
        .update({
          status: "exited",
          deleted_at: null,
        })
        .eq("id", id)
        .eq("status", "deleted")
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "방문자를 찾을 수 없습니다." }, { status: 404 })
      }

      return NextResponse.json({ visitor: data })
    }

    if (action === "approve") {
      const { data, error } = await supabase
        .from("visitors")
        .update({
          status: "onsite",
          entered_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "방문자를 찾을 수 없습니다." }, { status: 404 })
      }

      return NextResponse.json({ visitor: data })
    }

    if (action === "exit") {
      const { data, error } = await supabase
        .from("visitors")
        .update({
          status: "exited",
          exited_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "onsite")
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: "방문자를 찾을 수 없습니다." }, { status: 404 })
      }

      return NextResponse.json({ visitor: data })
    }

    return NextResponse.json({ error: "잘못된 동작입니다." }, { status: 400 })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error updating visitor status:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error updating visitor status (unknown error):", err)
    }
    return NextResponse.json({ error: "상태 변경에 실패했습니다." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 공사자: 본인 퇴실 처리 (공개, 본인 id 소지 기준)
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: "ID가 제공되지 않았습니다." }, { status: 400 })
    }

    const supabase = await createClient()

    // 먼저 방문자 정보 조회
    const { data: visitor, error: fetchError } = await supabase
      .from("visitors")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !visitor) {
      console.error("[v0] Visitor not found for exit:", { id, error: fetchError?.message })
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // 퇴실 상태로 업데이트 (status가 onsite이거나 pending일 때만)
    if (visitor.status !== "onsite" && visitor.status !== "pending") {
      return NextResponse.json(
        { error: "퇴실 처리할 수 없는 상태입니다." },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from("visitors")
      .update({
        status: "exited",
        exited_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error("[v0] Error updating visitor exit status:", {
        id,
        error: updateError?.message,
      })
      return NextResponse.json({ error: "퇴실 처리에 실패했습니다." }, { status: 500 })
    }
    
    return NextResponse.json({ visitor: updated })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error updating visitor exit status:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error updating visitor exit status (unknown error):", err)
    }
    return NextResponse.json({ error: "퇴실 처리에 실패했습니다." }, { status: 500 })
  }
}

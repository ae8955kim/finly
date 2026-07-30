import { NextResponse } from "next/server"
import { updateVisitorStatus } from "@/lib/store"

// 공사자: 본인 퇴실 처리 (공개, 본인 id 소지 기준)
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: "ID가 제공되지 않았습니다." }, { status: 400 })
    }

    const visitor = updateVisitorStatus(id, "exit")
    if (!visitor) {
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }
    
    return NextResponse.json({ visitor })
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

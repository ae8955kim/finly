import { NextResponse } from "next/server"
import { getVisitor } from "@/lib/store"

// 공사자: 본인 등록 상태 조회 (공개, 본인 id 소지 기준)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: "ID가 제공되지 않았습니다." }, { status: 400 })
    }

    const visitor = getVisitor(id)
    if (!visitor) {
      return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
    }

    // 개인정보(생년월일/전화번호)는 노출하지 않고 상태 확인에 필요한 정보만 반환
    return NextResponse.json({
      id: visitor.id,
      name: visitor.name,
      floor: visitor.floor,
      company: visitor.company,
      status: visitor.status,
      enteredAt: visitor.enteredAt,
      exitedAt: visitor.exitedAt,
    })
  } catch (err) {
    if (err instanceof Error) {
      console.error("[v0] Error fetching visitor status:", {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 2).join('\n'),
      })
    } else {
      console.error("[v0] Error fetching visitor status (unknown error):", err)
    }
    return NextResponse.json({ error: "상태 조회에 실패했습니다." }, { status: 500 })
  }
}

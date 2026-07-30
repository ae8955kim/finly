import { NextResponse } from "next/server"
import { updateVisitorStatus } from "@/lib/store"

// 공사자: 본인 퇴실 처리 (공개, 본인 id 소지 기준)
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const visitor = updateVisitorStatus(id, "exit")
  if (!visitor) {
    return NextResponse.json({ error: "등록 정보를 찾을 수 없습니다." }, { status: 404 })
  }
  return NextResponse.json({ visitor })
}

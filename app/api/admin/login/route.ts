import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ADMIN_COOKIE, getAdminPassword } from "@/lib/auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const password = body?.password

  if (typeof password !== "string" || password !== getAdminPassword()) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 })
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8시간
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
  return NextResponse.json({ ok: true })
}

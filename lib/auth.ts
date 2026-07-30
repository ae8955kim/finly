import { cookies } from "next/headers"

export const ADMIN_COOKIE = "admin_session"

// 데모용 관리자 비밀번호. 배포 시 ADMIN_PASSWORD 환경변수로 설정하세요.
export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin1234"
}

export async function isAdmin() {
  const store = await cookies()
  return store.get(ADMIN_COOKIE)?.value === "ok"
}

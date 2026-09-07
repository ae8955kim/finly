export const ADMIN_COOKIE = "admin_session"

export async function isAdmin() {
  if (typeof window === "undefined") return false

  // 브라우저 쿠키 읽기
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${ADMIN_COOKIE}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift()
    return cookieValue === "ok"
  }

  return false
}
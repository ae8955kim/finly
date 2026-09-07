export const ADMIN_STORAGE_KEY = "admin_session"

export async function isAdmin() {
  if (typeof window === "undefined") return false
  return localStorage.getItem(ADMIN_STORAGE_KEY) === "ok"
}
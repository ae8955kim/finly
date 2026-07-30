import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function requireAdminAuth() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_token")?.value

  if (!adminToken) {
    redirect("/admin/login")
  }

  return true
}

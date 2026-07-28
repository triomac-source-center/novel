import { NextResponse } from "next/server"

const ADMIN_UI_COOKIE = "triomac60_admin_ui"
const FALLBACK_CODE = "larson477"

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const expected = process.env.ADMIN_UI_CODE || FALLBACK_CODE

  if (!code || code !== expected) {
    return NextResponse.json({ success: false, error: "Invalid code" }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  // Not httpOnly: the cookie holds the code itself so client components can read it
  // (see src/lib/admin.js) and attach it to admin mutation requests (create/publish/
  // close cluster). The backend accepts this same code as real authorization — see
  // novel-server/routes/cluster_route.js `isAdmin(clerkId, adminCode)`.
  response.cookies.set(ADMIN_UI_COOKIE, code, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_UI_COOKIE, "", { maxAge: 0, path: "/" })
  return response
}

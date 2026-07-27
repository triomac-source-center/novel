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
  // Not httpOnly: this cookie only unlocks the /admin UI shell (see middleware.js) and
  // lets client components decide whether to show the "Admin" nav link. It grants no
  // real authorization by itself — mutating admin actions are still checked server-side
  // against the Clerk admin id (see novel-server/routes/cluster_route.js `isAdmin`).
  response.cookies.set(ADMIN_UI_COOKIE, "1", {
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

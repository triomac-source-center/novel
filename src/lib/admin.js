const ADMIN_UI_COOKIE = "triomac60_admin_ui"

export function getAdminAccessCode() {
  if (typeof document === "undefined") return ""
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${ADMIN_UI_COOKIE}=`))
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : ""
}

export function hasAdminAccess() {
  return getAdminAccessCode() !== ""
}

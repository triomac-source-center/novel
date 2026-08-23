export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.tryomac.com"

// The free-tier backend can take 30-50s to wake up from a cold sleep, so the retry budget needs
// to actually cover that instead of giving up after a couple seconds and leaving the UI stuck on
// stale/default data.
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 8000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelay(attempt) {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

// The Express API sends JSON error bodies like {"success":false,"error":"..."} — extract just the
// human-readable message instead of surfacing the raw JSON/text to the UI.
function parseErrorMessage(text) {
  if (!text) return "Request failed"
  try {
    const parsed = JSON.parse(text)
    return parsed?.error || parsed?.message || text
  } catch {
    return text
  }
}

async function requestJson(url, options = {}) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(options.headers || {}),
        },
        ...options,
      })

      const text = await response.text()

      if (!response.ok) {
        // Retry on server-side/gateway errors (the free-tier backend can be cold-starting after
        // idling), but not on 4xx client errors — retrying those would never succeed.
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          await sleep(retryDelay(attempt))
          continue
        }
        throw new Error(parseErrorMessage(text))
      }

      try {
        return text ? JSON.parse(text) : null
      } catch {
        return { raw: text }
      }
    } catch (error) {
      lastError = error
      const isNetworkError = error instanceof TypeError
      if (isNetworkError && attempt < MAX_RETRIES) {
        await sleep(retryDelay(attempt))
        continue
      }
      throw error
    }
  }

  throw lastError
}

export async function fetchUserProfile(clerkId) {
  if (!clerkId) {
    throw new Error("Missing clerk id")
  }

  return requestJson(`${API_BASE_URL}/api/${encodeURIComponent(clerkId)}`)
}

export async function fetchAccount(clerkId, type = "real") {
  if (!clerkId) throw new Error("Missing clerk id")
  const url = `${API_BASE_URL}/api/account?clerkId=${encodeURIComponent(clerkId)}&type=${encodeURIComponent(type)}`
  return requestJson(url)
}

export async function postSetDemoBalance(payload) {
  return requestJson(`${API_BASE_URL}/api/account/set-demo-balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

function postJson(url, payload, extraHeaders = {}) {
  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  })
}

// The admin routes accept the shared secret code via this header instead of a body field — never
// sent at all when no code is supplied (e.g. once an admin's Clerk session alone is enough).
function adminCodeHeaders(adminCode) {
  return adminCode ? { "X-Admin-Code": adminCode } : {}
}

function bearerHeaders(token) {
  if (!token) throw new Error("Missing auth token")
  return { Authorization: `Bearer ${token}` }
}

export async function fetchClusters() {
  return requestJson(`${API_BASE_URL}/api/all/clusters`)
}

export async function fetchClusterById(clusterId) {
  if (!clusterId) throw new Error("Missing cluster id")
  return requestJson(`${API_BASE_URL}/api/all/clusters/${encodeURIComponent(clusterId)}`)
}

export async function createCluster(payload, adminCode) {
  return postJson(`${API_BASE_URL}/api/clusters`, payload, adminCodeHeaders(adminCode))
}

// Requires a real Clerk session (see wallet_withdraw_route.js for why) — the backend now reads the
// investor's identity from the token, not from a clerkId field in the body.
export async function investInCluster(clusterId, token, payload) {
  if (!clusterId) throw new Error("Missing cluster id")
  return postJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}/invest`, payload, bearerHeaders(token))
}

function patchJson(url, payload, extraHeaders = {}) {
  return requestJson(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  })
}

export async function publishCluster(clusterId, adminCode) {
  if (!clusterId) throw new Error("Missing cluster id")
  return patchJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}/publish`, {}, adminCodeHeaders(adminCode))
}

export async function closeCluster(clusterId, adminCode) {
  if (!clusterId) throw new Error("Missing cluster id")
  return patchJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}/close`, {}, adminCodeHeaders(adminCode))
}

function deleteJson(url, payload, extraHeaders = {}) {
  return requestJson(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteCluster(clusterId, adminCode) {
  if (!clusterId) throw new Error("Missing cluster id")
  return deleteJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}`, {}, adminCodeHeaders(adminCode))
}

export async function deleteAllClusters(adminCode) {
  return deleteJson(`${API_BASE_URL}/api/clusters`, {}, adminCodeHeaders(adminCode))
}

export async function resetAllData(adminCode) {
  return deleteJson(`${API_BASE_URL}/api/admin/reset-all`, {}, adminCodeHeaders(adminCode))
}

export async function fetchDepositAddress(clerkId) {
  if (!clerkId) throw new Error("Missing clerk id")
  return requestJson(`${API_BASE_URL}/api/wallet/deposit-address?clerkId=${encodeURIComponent(clerkId)}`)
}

// Unlike every other write in this file, this one moves real funds out to an address the caller
// supplies, so the backend requires a verified Clerk session token instead of a bare clerkId.
export async function postWithdrawCrypto(token, payload) {
  if (!token) throw new Error("Missing auth token")
  return requestJson(`${API_BASE_URL}/api/wallet/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchNotifications(clerkId, limit = 30) {
  if (!clerkId) throw new Error("Missing clerk id")
  return requestJson(
    `${API_BASE_URL}/api/notifications?clerkId=${encodeURIComponent(clerkId)}&limit=${limit}`
  )
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) throw new Error("Missing notification id")
  return postJson(`${API_BASE_URL}/api/notifications/${encodeURIComponent(notificationId)}/read`, {})
}

export async function markAllNotificationsRead(clerkId) {
  return postJson(`${API_BASE_URL}/api/notifications/read-all`, { clerkId })
}

export async function fetchUsersByClerkIds(clerkIds) {
  const ids = Array.from(new Set((clerkIds || []).filter(Boolean)))
  if (ids.length === 0) return { success: true, data: [] }
  return requestJson(`${API_BASE_URL}/api/users/lookup?clerkIds=${encodeURIComponent(ids.join(","))}`)
}

export async function fetchBlocks({ status, clusterId, ownerClerkId, all } = {}) {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (clusterId) params.set("clusterId", clusterId)
  if (ownerClerkId) params.set("ownerClerkId", ownerClerkId)
  if (all) params.set("all", "true")
  const query = params.toString()
  return requestJson(`${API_BASE_URL}/api/blocks${query ? `?${query}` : ""}`)
}

export async function fetchBlockById(blockId) {
  if (!blockId) throw new Error("Missing block id")
  return requestJson(`${API_BASE_URL}/api/blocks/${encodeURIComponent(blockId)}`)
}

// Requires a real Clerk session, same reasoning as investInCluster above.
export async function buyBlocks(token, payload) {
  return postJson(`${API_BASE_URL}/api/blocks/buy`, payload, bearerHeaders(token))
}

export async function listBlockForResale(blockId, payload) {
  if (!blockId) throw new Error("Missing block id")
  return patchJson(`${API_BASE_URL}/api/blocks/${encodeURIComponent(blockId)}/list`, payload)
}

export async function unlistBlock(blockId, payload) {
  if (!blockId) throw new Error("Missing block id")
  return patchJson(`${API_BASE_URL}/api/blocks/${encodeURIComponent(blockId)}/unlist`, payload)
}

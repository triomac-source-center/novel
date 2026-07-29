export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://novel-server-cdcp.onrender.com"

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

export async function postFundAccount(payload) {
  return requestJson(`${API_BASE_URL}/api/account/fund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
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

export async function postDeposit(payload) {
  return requestJson(`${API_BASE_URL}/api/deposit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

function postJson(url, payload) {
  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchClusters() {
  return requestJson(`${API_BASE_URL}/api/all/clusters`)
}

export async function fetchClusterById(clusterId) {
  if (!clusterId) throw new Error("Missing cluster id")
  return requestJson(`${API_BASE_URL}/api/all/clusters/${encodeURIComponent(clusterId)}`)
}

export async function createCluster(payload) {
  return postJson(`${API_BASE_URL}/api/clusters`, payload)
}

export async function investInCluster(clusterId, payload) {
  if (!clusterId) throw new Error("Missing cluster id")
  return postJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}/invest`, payload)
}

function patchJson(url, payload) {
  return requestJson(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export async function publishCluster(clusterId, payload) {
  if (!clusterId) throw new Error("Missing cluster id")
  return patchJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}/publish`, payload)
}

export async function closeCluster(clusterId, payload) {
  if (!clusterId) throw new Error("Missing cluster id")
  return patchJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}/close`, payload)
}

function deleteJson(url, payload) {
  return requestJson(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export async function deleteCluster(clusterId, payload) {
  if (!clusterId) throw new Error("Missing cluster id")
  return deleteJson(`${API_BASE_URL}/api/clusters/${encodeURIComponent(clusterId)}`, payload)
}

export async function deleteAllClusters(payload) {
  return deleteJson(`${API_BASE_URL}/api/clusters`, payload)
}

export async function postWithdraw(payload) {
  return postJson(`${API_BASE_URL}/api/withdraw`, payload)
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

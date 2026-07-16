const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://novel-server-cdcp.onrender.com"

async function requestJson(url, options = {}) {
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
      throw new Error(text || "Request failed")
    }

    try {
      return text ? JSON.parse(text) : null
    } catch {
      return { raw: text }
    }
  } catch (error) {
    throw error
  }
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

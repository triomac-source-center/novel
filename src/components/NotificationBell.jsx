"use client"

import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api-client"

function timeAgo(dateString) {
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const { user: clerkUser, isSignedIn } = useUser()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!clerkUser?.id || !isSignedIn) return

    let isActive = true

    async function load() {
      try {
        const data = await fetchNotifications(clerkUser.id)
        if (isActive) {
          setNotifications(Array.isArray(data?.data) ? data.data : [])
          setUnreadCount(Number(data?.unreadCount || 0))
        }
      } catch (err) {
        console.error("Failed to load notifications:", err)
      }
    }

    load()
    const interval = setInterval(load, 30000)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [clerkUser?.id, isSignedIn])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleOpen() {
    setOpen((prev) => !prev)
  }

  async function handleNotificationClick(notification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification._id)
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error("Failed to mark notification as read:", err)
      }
    }
  }

  async function handleMarkAllRead() {
    if (!clerkUser?.id) return
    try {
      await markAllNotificationsRead(clerkUser.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/60 text-muted-foreground hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-border/50 bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-border/20 px-4 py-3 text-left transition-colors hover:bg-primary/5 ${
                    notification.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <p className="text-sm font-medium text-white">{notification.title}</p>
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{timeAgo(notification.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

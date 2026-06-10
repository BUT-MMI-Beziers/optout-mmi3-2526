import { useState, useMemo, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Inbox,
  Mail,
  Loader2,
} from "lucide-react"
import { getNotifications, type AppNotification } from "@/lib/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours   = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays    = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1)  return "À l'instant"
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffHours   < 24) return `Il y a ${diffHours} h`
  if (diffDays === 1)   return "Hier"
  if (diffDays    < 7)  return `Il y a ${diffDays} jours`
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

function groupByDate(notifications: AppNotification[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek  = new Date(startOfToday.getTime() -  7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups: Record<string, AppNotification[]> = {
    "Aujourd'hui":   [],
    "Cette semaine": [],
    "Ce mois-ci":    [],
    "Plus ancien":   [],
  }

  notifications.forEach((n) => {
    const d = new Date(n.createdAt)
    if      (d >= startOfToday) groups["Aujourd'hui"].push(n)
    else if (d >= startOfWeek)  groups["Cette semaine"].push(n)
    else if (d >= startOfMonth) groups["Ce mois-ci"].push(n)
    else                        groups["Plus ancien"].push(n)
  })

  return groups
}

type ReadFilter = "all" | "unread"

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading]             = useState(true)
  const [readFilter, setReadFilter]       = useState<ReadFilter>("all")

  // Fetch on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getNotifications().then((data) => {
      if (!cancelled) {
        setNotifications(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      return readFilter === "all" || !n.isRead
    })
  }, [notifications, readFilter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  // ── Actions (optimistic) ──────────────────────────────────────────────────

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleClick = (notif: AppNotification) => {
    markAsRead(notif.id)
    if (notif.requestId) {
      navigate(`/requests/${notif.requestId}`)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* ─── Breadcrumb ───────────────────────────────────────────── */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Notifications</span>
      </nav>

      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "'Squada One', sans-serif", color: "#000401" }}
          >
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading
              ? "Chargement…"
              : unreadCount > 0
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.`
              : "Vous êtes à jour, aucune notification non lue."}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            className="gap-2 h-10 px-5 text-sm font-medium border-[#FC7E34] text-[#FC7E34] hover:bg-[#FC7E34] hover:text-white"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* ─── Loading ──────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Chargement des notifications…</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ─── Filtres état (lu / non lu) ─────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: "all"    as ReadFilter, label: "Toutes",   count: notifications.length },
              { key: "unread" as ReadFilter, label: "Non lues", count: unreadCount },
            ]).map((tab) => {
              const isActive = readFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setReadFilter(tab.key)}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
                  style={
                    isActive
                      ? { backgroundColor: "#253550", color: "#F9F7F6", borderColor: "#253550" }
                      : { backgroundColor: "white",   color: "#000401", borderColor: "#e5e3e1" }
                  }
                >
                  {tab.label}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-bold"
                    style={
                      isActive
                        ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                        : { backgroundColor: "#f0efee", color: "#6b7280" }
                    }
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ─── Liste groupée par date ─────────────────────────── */}
          <div className="space-y-6 w-full">
            <AnimatePresence>
              {Object.entries(grouped).map(([label, items]) => {
                if (items.length === 0) return null
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2.5 w-full"
                  >
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                      {label}
                    </h2>
                    <div className="space-y-2 w-full">
                      <AnimatePresence mode="popLayout">
                        {items.map((notif) => (
                          <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                          >
                            <Card
                              onClick={() => handleClick(notif)}
                              className={`transition-all border-border group w-full ${notif.requestId ? "cursor-pointer hover:shadow-sm" : "cursor-default"}`}
                              style={{
                                backgroundColor: notif.isRead ? "white" : "#fff7ed",
                                borderLeft: notif.isRead ? "1px solid #e5e3e1" : "3px solid #FC7E34",
                              }}
                            >
                              <div className="flex items-start gap-3.5 px-4 py-3.5">
                                {/* Icon */}
                                <div
                                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: notif.isRead ? "#f0efee" : "#fef3c7",
                                  }}
                                >
                                  <Bell
                                    className="w-5 h-5"
                                    strokeWidth={2.2}
                                    style={{ color: notif.isRead ? "#9ca3af" : "#92400e" }}
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-[14px] leading-snug"
                                    style={{
                                      color: notif.isRead ? "#6b7280" : "#000401",
                                      fontWeight: notif.isRead ? 400 : 500,
                                    }}
                                  >
                                    {notif.message}
                                  </p>
                                </div>

                                {/* Date + actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[13px] text-muted-foreground whitespace-nowrap font-medium">
                                    {formatRelativeDate(notif.createdAt)}
                                  </span>
                                  {!notif.isRead && (
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: "#FC7E34" }}
                                      aria-label="Non lu"
                                    />
                                  )}
                                  <button
                                    onClick={(e) => deleteNotification(notif.id, e)}
                                    className="opacity-0 group-hover:opacity-100 transition-all w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                                    aria-label="Supprimer la notification"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* ─── Empty state ────────────────────────────────────── */}
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 text-muted-foreground"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                {readFilter === "unread"
                  ? <BellOff className="w-8 h-8 text-muted-foreground" />
                  : <Inbox   className="w-8 h-8 text-muted-foreground" />
                }
              </div>
              <p className="text-base font-semibold">
                {readFilter === "unread"
                  ? "Aucune notification non lue."
                  : "Aucune notification pour le moment."}
              </p>
              <p className="text-sm mt-1 max-w-md mx-auto">
                <Mail className="inline w-4 h-4 mr-1 -mt-0.5" />
                Vous serez notifié des relances automatiques et des changements de statut de vos demandes.
              </p>
            </motion.div>
          )}
        </>
      )}

    </div>
  )
}
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Notification, NotificationType } from "@/lib/mock-data"

// ─── Mock data (sera remplacé par useNotifications quand l'API sera prête) ─

const today = new Date()
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
const lastMonth = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000)

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    userId: "user-1",
    type: "completed",
    title: "LexisNexis a confirmé la suppression",
    message: "Vos données personnelles ont été supprimées des bases de LexisNexis. La demande est clôturée.",
    isRead: false,
    relatedBrokerId: "5",
    relatedRequestId: "req-7",
    createdAt: today.toISOString(),
  },
  {
    id: "n2",
    userId: "user-1",
    type: "reminder_sent",
    title: "Relance envoyée à Acxiom",
    message: "Aucune réponse depuis 30 jours. Un email de relance a été envoyé automatiquement, conformément au RGPD.",
    isRead: false,
    relatedBrokerId: "3",
    relatedRequestId: "req-5",
    createdAt: today.toISOString(),
  },
  {
    id: "n3",
    userId: "user-1",
    type: "no_response",
    title: "Délai dépassé pour Acxiom",
    message: "Aucune réponse n'a été reçue après le délai légal de 30 jours. Vous pouvez désormais envisager une mise en demeure.",
    isRead: true,
    relatedBrokerId: "3",
    relatedRequestId: "req-6",
    createdAt: yesterday.toISOString(),
  },
  {
    id: "n4",
    userId: "user-1",
    type: "refused",
    title: "BeenVerified a refusé votre demande",
    message: "Le broker invoque une exception légale. Vous pouvez déposer une plainte auprès de la CNIL.",
    isRead: true,
    relatedBrokerId: "6",
    relatedRequestId: "req-9",
    createdAt: threeDaysAgo.toISOString(),
  },
  {
    id: "n5",
    userId: "user-1",
    type: "broker_verified",
    title: "Pipl a été vérifié par un administrateur",
    message: "Les informations de contact et la méthode d'opt-out de Pipl ont été confirmées par un membre de la communauté.",
    isRead: true,
    relatedBrokerId: "7",
    createdAt: lastWeek.toISOString(),
  },
  {
    id: "n6",
    userId: "user-1",
    type: "broker_added",
    title: "Nouveau broker : Hunter.io",
    message: "Hunter.io a été ajouté au registre par la communauté. Vérifiez si vos données y sont référencées.",
    isRead: true,
    relatedBrokerId: "12",
    createdAt: twoWeeksAgo.toISOString(),
  },
  {
    id: "n7",
    userId: "user-1",
    type: "completed",
    title: "Pages Blanches a accusé réception",
    message: "Votre demande a été reçue par le DPO de Pages Blanches. Réponse attendue sous 30 jours.",
    isRead: true,
    relatedBrokerId: "2",
    relatedRequestId: "req-3",
    createdAt: lastMonth.toISOString(),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const notificationIcons: Record<NotificationType, string> = {
  reminder_sent: "🔁",
  no_response: "⚠️",
  completed: "✅",
  refused: "❌",
  suppressed: "🚫",
  broker_verified: "✔️",
  broker_added: "🆕",
}

const notificationColors: Record<NotificationType, { bg: string; text: string }> = {
  reminder_sent: { bg: "#dbeafe", text: "#1e40af" },
  no_response: { bg: "#fef3c7", text: "#92400e" },
  completed: { bg: "#dcfce7", text: "#15803d" },
  refused: { bg: "#fee2e2", text: "#991b1b" },
  suppressed: { bg: "#e0e7ff", text: "#3730a3" },
  broker_verified: { bg: "#dcfce7", text: "#15803d" },
  broker_added: { bg: "#fef3c7", text: "#92400e" },
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 60) return "Il y a " + diffMinutes + " min"
  if (diffHours < 24) return "Il y a " + diffHours + " h"
  if (diffDays === 1) return "Hier"
  if (diffDays < 7) return "Il y a " + diffDays + " jours"
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

function groupByDate(notifications: Notification[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups: Record<string, Notification[]> = {
    "Aujourd'hui": [],
    "Cette semaine": [],
    "Ce mois-ci": [],
    "Plus ancien": [],
  }

  notifications.forEach((n) => {
    const d = new Date(n.createdAt)
    if (d >= startOfToday) groups["Aujourd'hui"].push(n)
    else if (d >= startOfWeek) groups["Cette semaine"].push(n)
    else if (d >= startOfMonth) groups["Ce mois-ci"].push(n)
    else groups["Plus ancien"].push(n)
  })

  return groups
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const filtered = useMemo(() => {
    return filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications
  }, [notifications, filter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleClick = (notif: Notification) => {
    markAsRead(notif.id)
    if (notif.relatedRequestId) {
      navigate("/requests/" + notif.relatedRequestId)
    } else if (notif.relatedBrokerId) {
      const broker = notif.relatedBrokerId
      navigate("/brokers")
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-wide" style={{ fontFamily: "'Squada One', sans-serif", color: "#000401" }}>
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {unreadCount > 0
              ? "Vous avez " + unreadCount + " notification" + (unreadCount > 1 ? "s" : "") + " non lue" + (unreadCount > 1 ? "s" : "") + "."
              : "Vous êtes à jour, aucune notification non lue."}
          </p>
        </div>

        {unreadCount > 0 ? (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            className="text-sm font-medium"
            style={{ borderColor: "#FC7E34", color: "#FC7E34" }}
          >
            Tout marquer comme lu
          </Button>
        ) : null}
      </div>

      {/* ─── Filtres ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
          style={
            filter === "all"
              ? { backgroundColor: "#253550", color: "#F9F7F6", borderColor: "#253550" }
              : { backgroundColor: "white", color: "#000401", borderColor: "#e5e3e1" }
          }
        >
          Toutes
          <span
            className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={
              filter === "all"
                ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                : { backgroundColor: "#f0efee", color: "#6b7280" }
            }
          >
            {notifications.length}
          </span>
        </button>
        <button
          onClick={() => setFilter("unread")}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
          style={
            filter === "unread"
              ? { backgroundColor: "#253550", color: "#F9F7F6", borderColor: "#253550" }
              : { backgroundColor: "white", color: "#000401", borderColor: "#e5e3e1" }
          }
        >
          Non lues
          <span
            className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={
              filter === "unread"
                ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                : { backgroundColor: "#f0efee", color: "#6b7280" }
            }
          >
            {unreadCount}
          </span>
        </button>
      </div>

      {/* ─── Liste groupée par date ─────────────────────────── */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([label, items]) => {
          if (items.length === 0) return null
          return (
            <div key={label} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </h2>
              <div className="space-y-2">
                {items.map((notif) => {
                  const icon = notificationIcons[notif.type]
                  const colors = notificationColors[notif.type]
                  return (
                    <Card
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className="cursor-pointer hover:shadow-md transition-all border-border"
                      style={{
                        backgroundColor: notif.isRead ? "white" : "#fff7ed",
                        borderLeft: notif.isRead ? "1px solid #e5e3e1" : "3px solid #FC7E34",
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
                            style={{ backgroundColor: colors.bg }}
                          >
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className="font-semibold text-sm"
                                style={{ color: notif.isRead ? "#6b7280" : "#000401" }}
                              >
                                {notif.title}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatRelativeDate(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 leading-snug">
                              {notif.message}
                            </p>
                          </div>
                          {!notif.isRead ? (
                            <span
                              className="shrink-0 w-2 h-2 rounded-full mt-2"
                              style={{ backgroundColor: "#FC7E34" }}
                              aria-label="Non lu"
                            />
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── État vide ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-base font-medium">
            {filter === "unread"
              ? "Aucune notification non lue."
              : "Aucune notification pour le moment."}
          </p>
          <p className="text-sm mt-1">
            Vous serez notifié des relances automatiques et des changements de statut de vos demandes.
          </p>
        </div>
      ) : null}

    </div>
  )
}
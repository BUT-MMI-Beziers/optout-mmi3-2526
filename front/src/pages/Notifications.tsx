import { useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldCheck,
  Sparkles,
  Inbox,
  Mail,
} from "lucide-react"
import type { Notification, NotificationType } from "@/lib/mock-data"

// ─── Mock data ────────────────────────────────────────────────────────────────

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

// ─── Configuration ────────────────────────────────────────────────────────────

type NotifConfig = { icon: typeof Bell; bg: string; text: string; category: "reminders" | "statuses" | "brokers" }

const notificationConfig: Record<NotificationType, NotifConfig> = {
  reminder_sent: { icon: RotateCcw, bg: "#dbeafe", text: "#1e40af", category: "reminders" },
  no_response: { icon: AlertTriangle, bg: "#fef3c7", text: "#92400e", category: "reminders" },
  completed: { icon: CheckCircle2, bg: "#dcfce7", text: "#15803d", category: "statuses" },
  refused: { icon: XCircle, bg: "#fee2e2", text: "#991b1b", category: "statuses" },
  suppressed: { icon: Ban, bg: "#e0e7ff", text: "#3730a3", category: "statuses" },
  broker_verified: { icon: ShieldCheck, bg: "#dcfce7", text: "#15803d", category: "brokers" },
  broker_added: { icon: Sparkles, bg: "#fef3c7", text: "#92400e", category: "brokers" },
}

type TypeFilter = "all" | "reminders" | "statuses" | "brokers"
type ReadFilter = "all" | "unread"

const typeFilterLabels: Record<TypeFilter, string> = {
  all: "Tous types",
  reminders: "Relances",
  statuses: "Statuts",
  brokers: "Brokers",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return "À l'instant"
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

function getFaviconUrl(website: string): string {
  return "https://www.google.com/s2/favicons?domain=" + website + "&sz=64"
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [readFilter, setReadFilter] = useState<ReadFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchRead = readFilter === "all" || !n.isRead
      const matchType = typeFilter === "all" || notificationConfig[n.type].category === typeFilter
      return matchRead && matchType
    })
  }, [notifications, readFilter, typeFilter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const typeCounts = useMemo(() => {
    const counts: Record<TypeFilter, number> = { all: notifications.length, reminders: 0, statuses: 0, brokers: 0 }
    notifications.forEach((n) => {
      const cat = notificationConfig[n.type].category
      counts[cat]++
    })
    return counts
  }, [notifications])

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

  const handleClick = (notif: Notification) => {
    markAsRead(notif.id)
    if (notif.relatedRequestId) {
      navigate("/requests/" + notif.relatedRequestId)
    } else if (notif.relatedBrokerId) {
      navigate("/brokers")
    }
  }

  const getBroker = (_brokerId?: string) => null

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* ─── Breadcrumb ─────────────────────────────────────── */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Notifications</span>
      </nav>

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-wide" style={{ fontFamily: "'Squada One', sans-serif", color: "#000401" }}>
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? "Vous avez " + unreadCount + " notification" + (unreadCount > 1 ? "s" : "") + " non lue" + (unreadCount > 1 ? "s" : "") + "."
              : "Vous êtes à jour, aucune notification non lue."}
          </p>
        </div>

        {unreadCount > 0 ? (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            className="gap-2 h-10 px-5 text-sm font-medium border-[#FC7E34] text-[#FC7E34] hover:bg-[#FC7E34] hover:text-white"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer comme lu
          </Button>
        ) : null}
      </div>

      {/* ─── Filtres par état (lu / non lu) ─────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: "all" as ReadFilter, label: "Toutes", count: notifications.length },
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
                  : { backgroundColor: "white", color: "#000401", borderColor: "#e5e3e1" }
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

      {/* ─── Filtres par type ───────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Type :</span>
        {(Object.keys(typeFilterLabels) as TypeFilter[]).map((type) => {
          const isActive = typeFilter === type
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
              style={
                isActive
                  ? { backgroundColor: "#253550", color: "#F9F7F6", borderColor: "#253550" }
                  : { backgroundColor: "white", color: "#000401", borderColor: "#e5e3e1" }
              }
            >
              {typeFilterLabels[type]}
              <span
                className="text-xs px-1.5 py-0.5 rounded font-bold"
                style={
                  isActive
                    ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                    : { backgroundColor: "#f0efee", color: "#6b7280" }
                }
              >
                {typeCounts[type]}
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
                    {items.map((notif) => {
                      const config = notificationConfig[notif.type]
                      const Icon = config.icon
                      const broker = getBroker(notif.relatedBrokerId)

                      return (
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
                            className="cursor-pointer hover:shadow-sm transition-all border-border group w-full"
                            style={{
                              backgroundColor: notif.isRead ? "white" : "#fff7ed",
                              borderLeft: notif.isRead ? "1px solid #e5e3e1" : "3px solid #FC7E34",
                            }}
                          >
                            <div className="flex items-start gap-3.5 px-4 py-3.5">
                              {/* Avatar broker (avec badge type en superposition) ou icône seule */}
                              <div className="relative shrink-0">
                                {broker ? (
                                  <>
                                    {/* Logo broker */}
                                    <div className="w-11 h-11 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden">
                                      <img
                                        src={getFaviconUrl(broker.website)}
                                        alt={broker.name}
                                        className="w-6 h-6 object-contain"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = "none"
                                          const parent = target.parentElement
                                          if (parent && !parent.querySelector(".fallback-initials")) {
                                            const fallback = document.createElement("span")
                                            fallback.className = "fallback-initials text-sm font-bold"
                                            fallback.style.color = "#253550"
                                            fallback.textContent = broker.name.slice(0, 2).toUpperCase()
                                            parent.appendChild(fallback)
                                          }
                                        }}
                                      />
                                    </div>
                                    {/* Badge type en superposition */}
                                    <div
                                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                                      style={{ backgroundColor: config.bg }}
                                    >
                                      <Icon
                                        className="w-3 h-3"
                                        strokeWidth={2.5}
                                        style={{ color: config.text }}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  /* Pas de broker associé : icône seule */
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: config.bg }}
                                  >
                                    <Icon
                                      className="w-5 h-5"
                                      strokeWidth={2.2}
                                      style={{ color: config.text }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Contenu (broker + titre + message) */}
                              <div className="flex-1 min-w-0">
                                {broker ? (
                                  <p
                                    className="text-[11px] font-bold uppercase tracking-wide mb-0.5"
                                    style={{ color: config.text }}
                                  >
                                    {broker.name}
                                  </p>
                                ) : null}
                                <p
                                  className="font-semibold text-[15px] leading-snug"
                                  style={{ color: notif.isRead ? "#6b7280" : "#000401" }}
                                >
                                  {notif.title}
                                </p>
                                <p className="text-[13px] text-muted-foreground mt-1 truncate leading-snug">
                                  {notif.message}
                                </p>
                              </div>

                              {/* Date + actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[13px] text-muted-foreground whitespace-nowrap font-medium">
                                  {formatRelativeDate(notif.createdAt)}
                                </span>
                                {!notif.isRead ? (
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: "#FC7E34" }}
                                    aria-label="Non lu"
                                  />
                                ) : null}
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
                      )
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ─── État vide ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 text-muted-foreground"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            {readFilter === "unread" ? (
              <BellOff className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Inbox className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-base font-semibold">
            {readFilter === "unread"
              ? "Aucune notification non lue."
              : typeFilter !== "all"
              ? "Aucune notification de type \"" + typeFilterLabels[typeFilter] + "\"."
              : "Aucune notification pour le moment."}
          </p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            <Mail className="inline w-4 h-4 mr-1 -mt-0.5" />
            Vous serez notifié des relances automatiques et des changements de statut de vos demandes.
          </p>
        </motion.div>
      ) : null}

    </div>
  )
}
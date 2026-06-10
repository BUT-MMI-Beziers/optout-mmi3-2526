import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }
const fadeLeft: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.22 } } }

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus, Send, CheckCircle2, AlertCircle, Clock,
  XCircle, FileText, Flag, Archive,
} from 'lucide-react'
import { getStats, getRequests, getMe, getNotifications, type DashboardStats, type AppNotification } from '@/lib/api'
import { statusConfig, type RemovalRequest, type RequestStatus } from '@/lib/mock-data'


// Icon per status — replaces colored dots
const statusIcons: Record<RequestStatus, React.ComponentType<{ className?: string }>> = {
  DRAFT: FileText,
  SENT: Send,
  ACKNOWLEDGED: Clock,
  COMPLETED: CheckCircle2,
  REFUSED: XCircle,
  NO_RESPONSE: AlertCircle,
  COMPLAINT: Flag,
  SUPPRESSED: Archive,
}

// DA brand colors
const ORANGE = '#FC7E34'
const BLUE = '#253550'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentRequests, setRecentRequests] = useState<RemovalRequest[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [reminders, setReminders] = useState<RemovalRequest[]>([])
  const [userName, setUserName] = useState('...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getStats(),
      getRequests({ page: 1, perPage: 5 }),
      getMe(),
      getNotifications(),
      getRequests({ page: 1, perPage: 50 }),
    ]).then(([s, r, u, notifs, all]) => {
      setStats(s)
      setRecentRequests(r.data)
      setUserName(u?.firstName ?? '')
      setNotifications(notifs.slice(0, 3))
      setReminders(
        all.data
          .filter((req) => req.nextActionAt)
          .sort((a, b) => +new Date(a.nextActionAt!) - +new Date(b.nextActionAt!))
          .slice(0, 3)
      )
      setLoading(false)
    })
  }, [])

  const statCards = stats
    ? [
      { label: 'Total envoyées', value: stats.total, icon: Send, isAlert: false },
      { label: 'En attente', value: stats.acknowledged, icon: Clock, isAlert: false },
      { label: 'Confirmées', value: stats.completed, icon: CheckCircle2, isAlert: false },
      { label: 'À relancer', value: stats.noResponse, icon: AlertCircle, isAlert: true },
    ]
    : []

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Bonjour {userName} 👋
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Reprenons le contrôle de vos données aujourd'hui.
          </p>
        </div>
        <Link to="/requests/new">
          <Button className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2 h-10 px-5">
            <Plus className="w-4 h-4" />
            Lancer une campagne
          </Button>
        </Link>
      </motion.div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-28" />
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 xl:grid-cols-4 gap-4"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {statCards.map((s) => (
            <motion.div key={s.label} variants={fadeUp}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: s.isAlert ? `${ORANGE}4D` : `${BLUE}4D` }}
                  >
                    <s.icon className="w-6 h-6" style={{ color: BLUE }} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Recent requests + Activity */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Dernières demandes — 3/5 */}
        <motion.div variants={fadeUp} className="xl:col-span-3 h-full">
          <Card className="h-full">
            <CardHeader className="px-6 pt-6 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Dernières demandes</CardTitle>
              <Link to="/requests" className="text-sm text-[#FC7E34] hover:underline">
                Voir tout
              </Link>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-2">
              <div className="grid grid-cols-[2fr_1fr] sm:grid-cols-[2fr_1.5fr_1fr] pb-2 border-b border-border">
                {['Broker', "Date d'envoi", 'Statut'].map((h) => (
                  <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </span>
                ))}
              </div>
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Chargement...</div>
              ) : recentRequests.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Aucune demande.</div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show">
                  {recentRequests.map((req) => {
                    const cfg = statusConfig[req.status]
                    const StatusIcon = statusIcons[req.status]
                    const date = new Date(req.sentAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                    return (
                      <motion.div key={req.id} variants={fadeLeft}>
                        <Link
                          to={`/requests/${req.id}`}
                          className="grid grid-cols-[2fr_1fr] sm:grid-cols-[2fr_1.5fr_1fr] py-3.5 border-b border-border last:border-0 hover:bg-accent/40 transition-colors rounded-sm -mx-1 px-1 items-center"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${req.brokerUrl}&sz=32`}
                              alt={req.brokerName}
                              className="w-8 h-8 rounded-md object-contain bg-muted p-1"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }}
                            />
                            <div>
                              <p className="text-base font-medium">{req.brokerName}</p>
                              <p className="text-sm text-muted-foreground">{req.brokerUrl}</p>
                            </div>
                          </div>
                          <span className="hidden sm:block text-sm text-muted-foreground">{date}</span>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <StatusIcon className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-medium">{cfg.label}</span>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activité — 2/5 */}
        <motion.div variants={stagger} className="xl:col-span-2 grid grid-rows-2 gap-4">
          <motion.div variants={fadeUp} className="min-h-0">
            <Card className="h-full">
              <CardHeader className="px-6 pt-6 pb-0">
                <CardTitle className="text-xl font-bold">Relances à venir</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-2 pt-4">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Chargement...</div>
                ) : reminders.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Aucune relance prévue.</div>
                ) : (
                  reminders.map((r) => {
                    const date = new Date(r.nextActionAt!).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                    return (
                      <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${r.brokerUrl}&sz=32`}
                            alt={r.brokerName}
                            className="w-7 h-7 rounded-md object-contain bg-muted p-0.5 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }}
                          />
                          <div>
                            <p className="text-sm font-medium">{r.brokerName}</p>
                            <p className="text-xs text-muted-foreground">{date}</p>
                          </div>
                        </div>
                        <Link to={`/requests/${r.id}`}>
                          <Button size="sm" variant="outline" className="h-7 w-20 text-xs text-muted-foreground hover:text-[#FC7E34] hover:border-[#FC7E34] shrink-0">
                            Voir
                          </Button>
                        </Link>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp} className="min-h-0">
            <Card className="h-full">
              <CardHeader className="px-6 pt-6 pb-0">
                <CardTitle className="text-xl font-bold">Actions recommandées</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-2 pt-4">
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Chargement...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Aucune action recommandée.</div>
                ) : (
                  notifications.map((n) => {
                    return (
                      <div key={n.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                        <div className="flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <p className="text-sm">{n.message}</p>
                        </div>
                        {n.requestId && (
                          <Link to={`/requests/${n.requestId}`}>
                            <Button size="sm" variant="outline" className="h-7 w-20 text-xs text-[#FC7E34] border-[#FC7E34] hover:bg-[#FC7E34] hover:text-white shrink-0">
                              Voir
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

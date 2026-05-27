import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }
const fadeLeft: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.22 } } }
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Send, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { getStats, getRequests, getMe, type DashboardStats } from '@/lib/api'
import { statusConfig, mockBarChartData, type RemovalRequest } from '@/lib/mock-data'


export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentRequests, setRecentRequests] = useState<RemovalRequest[]>([])
  const [userName, setUserName] = useState('...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getStats(),
      getRequests({ page: 1, perPage: 5 }),
      getMe(),
    ]).then(([s, r, u]) => {
      setStats(s)
      setRecentRequests(r.data)
      setUserName(u.firstName)
      setLoading(false)
    })
  }, [])

  const donutData = stats
    ? [
        { name: 'Répondus', value: stats.responseRate, fill: '#FC7E34' },
        { name: 'Sans réponse', value: 100 - stats.responseRate, fill: '#e5e7eb' },
      ]
    : []

  const statCards = stats
    ? [
        { label: 'Total envoyées', value: stats.total, icon: Send, color: 'text-foreground', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
        { label: 'En attente', value: stats.acknowledged, icon: Clock, color: 'text-foreground', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
        { label: 'Confirmées', value: stats.completed, icon: CheckCircle2, color: 'text-foreground', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
        { label: 'À relancer', value: stats.noResponse, icon: AlertCircle, color: 'text-foreground', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
      ]
    : []

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
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
        <div className="grid grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-28" />
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-4 gap-5"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {statCards.map((s) => (
            <motion.div key={s.label} variants={fadeUp}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
                    <s.icon className={`w-6 h-6 ${s.iconColor}`} />
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Charts row */}
      <motion.div
        className="grid grid-cols-5 gap-5 items-stretch"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Bar chart — 3/5 */}
        <motion.div variants={fadeUp} className="col-span-3 h-full">
          <Card className="h-full">
            <CardHeader className="px-6 pt-6 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-medium">Demandes envoyées</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#FC7E34] inline-block" />
                    Envoyées
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#253550] inline-block" />
                    Confirmées
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mockBarChartData} barSize={16} barGap={4}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="envoyees" fill="#FC7E34" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confirmees" fill="#253550" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Donut — 2/5 */}
        <motion.div variants={fadeUp} className="col-span-2 h-full">
          <Card className="flex flex-col h-full">
            <CardHeader className="px-6 pt-6 pb-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FC7E34]" />
                <CardTitle className="text-xl font-medium">Taux de réponse</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center px-6 pb-6 gap-4">
              {stats && (
                <>
                  <div className="relative">
                    <PieChart width={180} height={180}>
                      <Pie
                        data={donutData}
                        cx={90} cy={90}
                        innerRadius={58} outerRadius={80}
                        startAngle={90} endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      />
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{stats.responseRate}%</span>
                      <span className="text-xs text-muted-foreground">Votre score</span>
                    </div>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-green-50">
                      <p className="text-xl font-bold text-green-600">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Confirmées</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-50">
                      <p className="text-xl font-bold text-orange-600">{stats.noResponse}</p>
                      <p className="text-xs text-muted-foreground">Sans réponse</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent requests + Activity */}
      <motion.div
        className="grid grid-cols-5 gap-5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Dernières demandes — 3/5 */}
        <motion.div variants={fadeUp} className="col-span-3">
          <Card>
            <CardHeader className="px-6 pt-6 pb-0 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-medium">Dernières demandes</CardTitle>
              <Link to="/requests" className="text-sm text-[#FC7E34] hover:underline">
                Voir tout
              </Link>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-2">
              <div className="grid grid-cols-[2fr_1.5fr_1fr] pb-2 border-b border-border">
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
                    const date = new Date(req.sentAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                    return (
                      <motion.div key={req.id} variants={fadeLeft}>
                        <Link
                          to={`/requests/${req.id}`}
                          className="grid grid-cols-[2fr_1.5fr_1fr] py-3.5 border-b border-border last:border-0 hover:bg-accent/40 transition-colors rounded-sm -mx-1 px-1 items-center"
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
                          <span className="text-sm text-muted-foreground">{date}</span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
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

        {/* Activité récente — 2/5 */}
        <motion.div variants={stagger} className="col-span-2 space-y-5">
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="px-6 pt-6 pb-3">
                <CardTitle className="text-xl font-medium">Relances à venir</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-3">
                {[
                  { broker: 'Acxiom', date: 'Demain, 09:00', id: 'req-5' },
                  { broker: 'Acxiom', date: 'Demain, 09:00', id: 'req-6' },
                ].map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#253550] flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-white leading-tight text-center">AC<br/>XiOM</span>
                      </div>
                      <div>
                        <p className="text-base font-medium">{r.broker}</p>
                        <p className="text-sm text-muted-foreground">{r.date}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-muted-foreground hover:text-red-600 hover:border-red-200">
                      Annuler
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="px-6 pt-6 pb-3">
                <CardTitle className="text-xl font-medium">Actions recommandées</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-2">
                {[
                  { label: 'Relancer Acxiom (30j sans réponse)', type: 'warning', action: 'Relancer' },
                  { label: 'Confirmer la réponse de Spokeo', type: 'info', action: 'Voir' },
                  { label: 'Vérifier statut LexisNexis', type: 'success', action: 'Voir' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        a.type === 'warning' ? 'bg-orange-500'
                        : a.type === 'success' ? 'bg-green-500'
                        : 'bg-blue-500'
                      }`} />
                      <p className="text-sm">{a.label}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-[#FC7E34] hover:text-[#e06e28]">
                      {a.action}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

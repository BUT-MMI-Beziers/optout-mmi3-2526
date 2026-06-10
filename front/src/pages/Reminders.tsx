import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import {
  Clock, AlertCircle, Hourglass, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, CalendarClock, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequests } from '@/hooks/useRequests'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const rowVariant: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.22 } } }

type Tab = 'all' | 'PENDING' | 'NO_RESPONSE'

const TABS: { key: Tab; label: string; icon: typeof Clock; color: string }[] = [
  { key: 'all',         label: 'Toutes',         icon: CalendarClock, color: '#253550' },
  { key: 'PENDING',     label: 'Programmées',    icon: Hourglass,     color: '#7c3aed' },
  { key: 'NO_RESPONSE', label: 'Sans réponse',   icon: AlertCircle,   color: '#FC7E34' },
]

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysAgo(iso: string | null | undefined): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  return d
}

export default function Reminders() {
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const pendingQ  = useRequests({ page: 1, perPage: 100, status: 'PENDING' })
  const noRespQ   = useRequests({ page: 1, perPage: 100, status: 'NO_RESPONSE' })

  const allReminders = [
    ...(pendingQ.data?.data ?? []).filter(r => r.parentRequestId),
    ...(noRespQ.data?.data ?? []),
  ]

  const filtered = tab === 'all'
    ? allReminders
    : tab === 'PENDING'
    ? allReminders.filter(r => r.status === 'PENDING')
    : allReminders.filter(r => r.status === 'NO_RESPONSE')

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.scheduledAt ?? a.nextActionAt ?? a.sentAt ?? a.createdAt).getTime()
    const dateB = new Date(b.scheduledAt ?? b.nextActionAt ?? b.sentAt ?? b.createdAt).getTime()
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
  })

  const PER_PAGE = 12
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const loading = pendingQ.loading || noRespQ.loading

  const countPending  = (pendingQ.data?.data ?? []).filter(r => r.parentRequestId).length
  const countNoResp   = noRespQ.data?.total ?? 0

  useEffect(() => { setPage(1) }, [tab])

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Relances programmées</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
          RELANCES PROGRAMMÉES
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relances en attente d'envoi et demandes sans réponse depuis plus de 30 jours.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-xl">
        <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">Programmées</span>
          <span className="text-3xl font-black text-[#253550]">{loading ? '—' : countPending}</span>
          <span className="text-xs text-muted-foreground">relances en file</span>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#FC7E34]">Sans réponse</span>
          <span className="text-3xl font-black text-[#253550]">{loading ? '—' : countNoResp}</span>
          <span className="text-xs text-muted-foreground">brokers en attente</span>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#253550]">Total</span>
          <span className="text-3xl font-black text-[#253550]">{loading ? '—' : countPending + countNoResp}</span>
          <span className="text-xs text-muted-foreground">actions à suivre</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          const count = t.key === 'all' ? allReminders.length : t.key === 'PENDING' ? countPending : countNoResp
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
              style={
                active
                  ? { backgroundColor: '#253550', color: '#F9F7F6', borderColor: '#253550' }
                  : { backgroundColor: 'white', color: '#000401', borderColor: '#e5e3e1' }
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {t.label}
              {active && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Sort bar */}
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        {loading ? <Skeleton className="h-3 w-32" /> : (
          <>
            <span>{filtered.length} relance{filtered.length > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>Trier par</span>
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-0.5 text-foreground font-medium hover:underline"
            >
              date d'action
              {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-0.5" /> : <ArrowDown className="w-3 h-3 ml-0.5" />}
            </button>
          </>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div key={`mob-${tab}-${page}`} variants={stagger} initial="hidden" animate="show" className="space-y-2">
            {paginated.map(req => (
              <motion.div key={req.id} variants={rowVariant}>
                <Link to={`/requests/${req.id}`} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${req.brokerUrl}&sz=32`}
                      alt={req.brokerName}
                      className="w-9 h-9 rounded-lg object-contain bg-muted p-1 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium truncate">{req.brokerName}</p>
                      <p className="text-sm text-muted-foreground truncate">{req.brokerUrl}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <ActionLine req={req} />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-card rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[2fr_1.4fr_1.3fr_auto] px-5 py-2.5 border-b border-border bg-muted/30">
          {['BROKER', 'DERNIÈRE ACTION', 'PROCHAINE RELANCE', 'STATUT'].map(h => (
            <span key={h} className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2fr_1.4fr_1.3fr_auto] px-5 py-4 border-b border-border items-center gap-3">
              <div className="flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-lg" /><div className="space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div></div>
              <div className="space-y-1.5"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-3 w-16" /></div>
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div className="px-5 py-16 text-center text-muted-foreground"><EmptyState /></div>
        ) : (
          <motion.div key={`${tab}-${page}`} variants={stagger} initial="hidden" animate="show">
            {paginated.map(req => {
              const sentDays = daysAgo(req.sentAt ?? req.createdAt)
              const nextDate = req.scheduledAt ?? req.nextActionAt
              const until = daysUntil(nextDate)
              return (
                <motion.div key={req.id} variants={rowVariant}>
                  <Link
                    to={`/requests/${req.id}`}
                    className="grid grid-cols-[2fr_1.4fr_1.3fr_auto] px-5 py-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors items-center"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${req.brokerUrl}&sz=32`}
                        alt={req.brokerName}
                        className="w-9 h-9 rounded-lg object-contain bg-muted p-1 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }}
                      />
                      <div className="min-w-0">
                        <p className="text-base font-medium truncate">{req.brokerName}</p>
                        <p className="text-sm text-muted-foreground truncate">{req.brokerUrl}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm">{formatDate(req.sentAt ?? req.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {sentDays === 0 ? "Aujourd'hui" : `il y a ${sentDays}j`}
                        {req.status === 'NO_RESPONSE' && sentDays >= 30 && (
                          <span className="ml-1.5 text-[#FC7E34] font-semibold">· délai dépassé</span>
                        )}
                      </p>
                    </div>

                    <div>
                      {req.status === 'PENDING' ? (
                        <>
                          <p className="text-sm text-violet-600 font-medium">{formatDate(nextDate ?? req.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            {until != null && until >= 0 ? `dans ${until}j` : "En cours d'envoi"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm">{nextDate ? formatDate(nextDate) : '—'}</p>
                          <p className="text-xs text-muted-foreground">{nextDate ? 'relance auto prévue' : 'non planifiée'}</p>
                        </>
                      )}
                    </div>

                    <StatusBadge status={req.status} />
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">Page {page} sur {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map(p => (
              <Button
                key={p} variant={p === page ? 'default' : 'outline'} size="icon"
                className={`w-8 h-8 ${p === page ? 'bg-[#FC7E34] hover:bg-[#e06e28] text-white border-0' : ''}`}
                onClick={() => setPage(p)}
              >{p}</Button>
            ))}
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'PENDING') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200 whitespace-nowrap">
        <Hourglass className="w-3 h-3" /> Programmée
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-[#FC7E34] border border-orange-200 whitespace-nowrap">
      <AlertCircle className="w-3 h-3" /> Sans réponse
    </span>
  )
}

function ActionLine({ req }: { req: { status: string; sentAt?: string | null; createdAt: string; scheduledAt?: string | null; nextActionAt?: string | null } }) {
  const sentDays = daysAgo(req.sentAt ?? req.createdAt)
  if (req.status === 'PENDING') {
    const nextDate = req.scheduledAt
    const until = daysUntil(nextDate)
    return (
      <p className="text-xs text-violet-600 flex items-center gap-1">
        <RefreshCw className="w-3 h-3" />
        {nextDate
          ? `Envoi prévu le ${formatDate(nextDate)}${until != null && until >= 0 ? ` (dans ${until}j)` : ''}`
          : "En cours d'envoi"}
      </p>
    )
  }
  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock className="w-3 h-3" />
      Envoyée il y a {sentDays}j
      {sentDays >= 30 && <span className="text-[#FC7E34] font-semibold ml-1">· délai légal dépassé</span>}
    </p>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <CalendarClock className="w-10 h-10 opacity-30" />
      <p className="text-sm">Aucune relance à afficher.</p>
      <Link to="/requests" className="text-xs text-[#FC7E34] hover:underline">Voir toutes les demandes →</Link>
    </div>
  )
}

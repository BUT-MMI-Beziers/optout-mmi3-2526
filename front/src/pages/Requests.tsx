import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const rowVariant: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.22 } } }
import {
  Plus, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  Send, Clock, CheckCircle2, AlertCircle, XCircle, FileText, Flag, Archive, Hourglass,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequests } from '@/hooks/useRequests'
import { statusConfig, categoryLabels, type RequestStatus } from '@/lib/mock-data'

type StatusFilter = 'all' | RequestStatus

const STATUS_TABS: { key: StatusFilter; label: string; icon?: LucideIcon }[] = [
  { key: 'all',          label: 'Tous' },
  { key: 'PENDING',      label: 'En attente',  icon: Hourglass },
  { key: 'SENT',         label: 'Envoyées',    icon: Send },
  { key: 'ACKNOWLEDGED', label: 'Reçues',      icon: Clock },
  { key: 'COMPLETED',    label: 'Confirmées',  icon: CheckCircle2 },
  { key: 'NO_RESPONSE',  label: 'À relancer',  icon: AlertCircle },
]

const statusIcons: Record<RequestStatus, LucideIcon> = {
  DRAFT:        FileText,
  PENDING:      Hourglass,
  SENT:         Send,
  ACKNOWLEDGED: Clock,
  COMPLETED:    CheckCircle2,
  REFUSED:      XCircle,
  NO_RESPONSE:  AlertCircle,
  COMPLAINT:    Flag,
  SUPPRESSED:   Archive,
}

const PER_PAGE_OPTIONS = [12, 24, 48]

export default function Requests() {
  const [search, setSearch] = useState('')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [perPage, setPerPage] = useState(12)
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const { data, loading } = useRequests({
    page,
    perPage,
    status: activeStatus === 'all' ? undefined : activeStatus,
    search,
  })

  const requests = [...(data?.data ?? [])].sort((a, b) => {
    const ta = new Date(a.sentAt || a.createdAt).getTime()
    const tb = new Date(b.sentAt || b.createdAt).getTime()
    return sortOrder === 'desc' ? tb - ta : ta - tb
  })
  const total = data?.total ?? 0
  const totalPages = data?.lastPage ?? 1

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatRelative = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
    if (h < 24) return `il y a ${h}h`
    return `il y a ${Math.floor(h / 24)}j`
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Mes demandes</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
            MES DEMANDES
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez l'avancement de chaque demande : envoyée, en attente, confirmée ou refusée.
          </p>
        </div>
        <Link to="/requests/new">
          <Button className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2 h-10 px-5">
            <Plus className="w-4 h-4" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une demande"
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Filtres statut */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const active = activeStatus === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveStatus(tab.key); setPage(1) }}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
              style={
                active
                  ? { backgroundColor: '#253550', color: '#F9F7F6', borderColor: '#253550' }
                  : { backgroundColor: 'white', color: '#000401', borderColor: '#e5e3e1' }
              }
            >
              {tab.icon && <tab.icon className="w-3.5 h-3.5 shrink-0" />}
              {tab.label}
              {active && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Barre de tri — toujours visible */}
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        {loading ? (
          <Skeleton className="h-3 w-24" />
        ) : (
          <>
            <span>{total} demande{total > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>Trier par</span>
            <button
              onClick={() => setSortOrder((o) => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-0.5 text-foreground font-medium hover:underline"
            >
              date d'envoi
              {sortOrder === 'desc'
                ? <ArrowDown className="w-3 h-3 ml-0.5" />
                : <ArrowUp className="w-3 h-3 ml-0.5" />
              }
            </button>
            <span>({sortOrder === 'desc' ? 'Récent' : 'Ancien'})</span>
          </>
        )}
      </div>

      {/* Cartes — mobile uniquement */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          ))
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Aucune demande trouvée.</div>
        ) : (
          <motion.div key={`mob-${page}-${activeStatus}-${search}`} variants={stagger} initial="hidden" animate="show" className="space-y-2">
            {requests.map((req) => {
              const cfg = statusConfig[req.status]
              const StatusIcon = statusIcons[req.status]
              return (
                <motion.div key={req.id} variants={rowVariant}>
                  <Link
                    to={`/requests/${req.id}`}
                    className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2 hover:bg-accent/50 transition-colors"
                  >
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
                      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{cfg.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.status === 'PENDING' && req.parentRequestId
                        ? `Relance programmée · ${formatDate(req.scheduledAt ?? req.createdAt)}`
                        : req.status === 'PENDING'
                        ? 'En file d\'envoi'
                        : req.sentAt
                        ? `Envoyée ${formatRelative(req.sentAt)} · ${formatDate(req.sentAt)}`
                        : `Créée ${formatRelative(req.createdAt)} · ${formatDate(req.createdAt)}`}
                    </p>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Tableau — sm et plus */}
      <div className="hidden sm:block bg-card rounded-lg border border-border overflow-hidden">
        {/* En-tête */}
        <div className="grid grid-cols-[2fr_1fr] sm:grid-cols-[2fr_1.3fr_1fr] lg:grid-cols-[2fr_1.2fr_1.3fr_1fr] px-5 py-2.5 border-b border-border bg-muted/30">
          {([
            { label: 'BROKER',       cls: '' },
            { label: 'CATÉGORIE',    cls: 'hidden lg:block' },
            { label: "DATE D'ENVOI", cls: '' },
            { label: 'STATUT',       cls: '' },
          ] as { label: string; cls: string }[]).map(({ label, cls }) => (
            <span key={label} className={`text-xs font-semibold text-muted-foreground tracking-wide uppercase ${cls}`}>
              {label}
            </span>
          ))}
        </div>

        {/* Lignes */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr] sm:grid-cols-[2fr_1.3fr_1fr] lg:grid-cols-[2fr_1.2fr_1.3fr_1fr] px-5 py-4 border-b border-border items-center gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="hidden lg:block h-3.5 w-24" />
              <div className="hidden sm:block space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))
        ) : requests.length === 0 ? (
          <div className="px-5 py-16 text-center text-muted-foreground">
            Aucune demande trouvée.
          </div>
        ) : (
          <motion.div key={`${page}-${activeStatus}-${search}`} variants={stagger} initial="hidden" animate="show">
          {requests.map((req) => {
            const cfg = statusConfig[req.status]
            const StatusIcon = statusIcons[req.status]
            return (
              <motion.div key={req.id} variants={rowVariant}>
              <Link
                to={`/requests/${req.id}`}
                className="grid grid-cols-[2fr_1fr] sm:grid-cols-[2fr_1.3fr_1fr] lg:grid-cols-[2fr_1.2fr_1.3fr_1fr] px-5 py-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors items-center"
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
                <span className="hidden lg:block text-sm font-medium text-muted-foreground">
                  {req.brokerCategory ? categoryLabels[req.brokerCategory as import('@/lib/mock-data').BrokerCategory] : '—'}
                </span>
                <div className="hidden sm:block">
                  {req.status === 'PENDING' && req.parentRequestId ? (
                    <>
                      <p className="text-base">{formatDate(req.scheduledAt ?? req.createdAt)}</p>
                      <p className="text-sm text-violet-600">Relance programmée</p>
                    </>
                  ) : req.status === 'PENDING' ? (
                    <>
                      <p className="text-base">{formatDate(req.createdAt)}</p>
                      <p className="text-sm text-violet-600">En file d'envoi</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base">{formatDate(req.sentAt ?? req.createdAt)}</p>
                      <p className="text-sm text-muted-foreground">{formatRelative(req.sentAt ?? req.createdAt)}</p>
                    </>
                  )}
                </div>
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
      </div>{/* fin tableau */}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Afficher</span>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span>par page</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Page {page} sur {totalPages} &bull; {total} demande{total > 1 ? 's' : ''} au total
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map((p) => (
            <Button
              key={p} variant={p === page ? 'default' : 'outline'} size="icon"
              className={`w-8 h-8 ${p === page ? 'bg-[#FC7E34] hover:bg-[#e06e28] text-white border-0' : ''}`}
              onClick={() => setPage(p)}
            >{p}</Button>
          ))}
          <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

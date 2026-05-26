import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const rowVariant: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.22 } } }
import { Plus, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequests } from '@/hooks/useRequests'
import { statusConfig, categoryLabels, type RequestStatus } from '@/lib/mock-data'

type StatusFilter = 'all' | RequestStatus

const STATUS_TABS: { key: StatusFilter; label: string; dot?: string }[] = [
  { key: 'all',          label: 'Tous' },
  { key: 'SENT',         label: 'Envoyées',    dot: 'bg-blue-500' },
  { key: 'ACKNOWLEDGED', label: 'En attente',  dot: 'bg-amber-500' },
  { key: 'COMPLETED',    label: 'Confirmées',  dot: 'bg-green-500' },
  { key: 'NO_RESPONSE',  label: 'À Relancer',  dot: 'bg-orange-500' },
]

const PER_PAGE_OPTIONS = [12, 24, 48]

export default function Requests() {
  const [search, setSearch] = useState('')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [perPage, setPerPage] = useState(12)
  const [page, setPage] = useState(1)

  const { data, loading } = useRequests({
    page,
    perPage,
    status: activeStatus === 'all' ? undefined : activeStatus,
    search,
  })

  const requests = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.lastPage ?? 1

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatRelative = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
    if (h < 24) return `il y a ${h}h`
    return `il y a ${Math.floor(h / 24)}j`
  }

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Mes demandes</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#000401] text-white'
                  : 'bg-card border border-border hover:bg-accent'
              }`}
            >
              {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
              <span>{tab.label}</span>
              {active && (
                <span className="text-white/70 text-xs ml-0.5">{total}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Barre de tri */}
        <div className="px-5 py-3 border-b border-border text-xs text-muted-foreground flex items-center gap-1.5">
          {loading ? (
            <Skeleton className="h-3 w-24" />
          ) : (
            <>
              <span>{total} demande{total > 1 ? 's' : ''}</span>
              <span>•</span>
              <span>Trier par</span>
              <button className="flex items-center gap-0.5 text-foreground font-medium hover:underline">
                date d'envoi <ArrowUpDown className="w-3 h-3 ml-0.5" />
              </button>
              <span>(Récent)</span>
            </>
          )}
        </div>

        {/* En-tête */}
        <div className="grid grid-cols-[2fr_1.2fr_1.3fr_1fr] px-5 py-2.5 border-b border-border bg-muted/30">
          {['BROKER', 'CATÉGORIE', "DATE D'ENVOI", 'STATUT'].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              {h}
            </span>
          ))}
        </div>

        {/* Lignes */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2fr_1.2fr_1.3fr_1fr] px-5 py-4 border-b border-border items-center gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3.5 w-24" />
              <div className="space-y-1.5">
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
            return (
              <motion.div key={req.id} variants={rowVariant}>
              <Link
                to={`/requests/${req.id}`}
                className="grid grid-cols-[2fr_1.2fr_1.3fr_1fr] px-5 py-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors items-center"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${req.brokerUrl}&sz=32`}
                    alt={req.brokerName}
                    className="w-9 h-9 rounded-lg object-contain bg-muted p-1 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }}
                  />
                  <div>
                    <p className="text-base font-medium">{req.brokerName}</p>
                    <p className="text-sm text-muted-foreground">{req.brokerUrl}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {categoryLabels[req.brokerCategory]}
                </span>
                <div>
                  <p className="text-base">{formatDate(req.sentAt)}</p>
                  <p className="text-sm text-muted-foreground">{formatRelative(req.sentAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className={`text-base font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              </Link>
              </motion.div>
            )
          })}
          </motion.div>
        )}
      </div>

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

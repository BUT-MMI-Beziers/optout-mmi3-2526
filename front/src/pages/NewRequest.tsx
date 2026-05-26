import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const rowVariant: Variants = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.2 } } }
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import SendRequestModal from '@/components/SendRequestModal'
import { useBrokers } from '@/hooks/useBrokers'
import {
  categoryLabels, difficultyLabels, methodLabels, regionLabels,
  type BrokerCategory, type Broker,
} from '@/lib/mock-data'
import { useNavigate } from 'react-router-dom'

type CategoryFilter = 'all' | BrokerCategory

const CATEGORY_TABS: { key: CategoryFilter; label: string; dot: string }[] = [
  { key: 'all',             label: 'Toutes catégories', dot: '' },
  { key: 'people-search',  label: 'People-search',     dot: 'bg-blue-500' },
  { key: 'marketing',      label: 'Marketing',          dot: 'bg-amber-500' },
  { key: 'risk-mitigation',label: 'Risk-mitigation',   dot: 'bg-red-500' },
  { key: 'recruitment',    label: 'Recruitment',        dot: 'bg-green-500' },
]

const PER_PAGE_OPTIONS = [12, 24, 48]

export default function NewRequest() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [perPage, setPerPage] = useState(12)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, Broker>>(new Map())
  const [modalOpen, setModalOpen] = useState(false)

  const { data, loading } = useBrokers({
    page,
    perPage,
    category: activeCategory === 'all' ? undefined : activeCategory,
    search,
  })

  const brokers = data?.data ?? []
  const totalPages = data?.lastPage ?? 1
  const total = data?.total ?? 0

  const toggle = (broker: Broker) => {
    setSelected((prev) => {
      const next = new Map(prev)
      next.has(broker.id) ? next.delete(broker.id) : next.set(broker.id, broker)
      return next
    })
  }

  const toggleAll = () => {
    const allSelected = brokers.every((b) => selected.has(b.id))
    setSelected((prev) => {
      const next = new Map(prev)
      allSelected
        ? brokers.forEach((b) => next.delete(b.id))
        : brokers.forEach((b) => next.set(b.id, b))
      return next
    })
  }

  const allPageSelected = brokers.length > 0 && brokers.every((b) => selected.has(b.id))
  const selectedBrokers = Array.from(selected.values())

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <Link to="/requests" className="hover:text-foreground">Mes demandes</Link>
        <span>›</span>
        <span className="text-foreground">Nouvelle demande</span>
      </nav>

      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
          NOUVELLE DEMANDE
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez les data brokers à qui envoyer une demande de suppression RGPD.
        </p>
      </div>

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un broker"
          className="pl-9 bg-card"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Filtres catégorie */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORY_TABS.map((tab) => {
          const active = activeCategory === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveCategory(tab.key); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#000401] text-white'
                  : 'bg-card border border-border hover:bg-accent'
              }`}
            >
              {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* En-têtes */}
        <div className="grid grid-cols-[2.5rem_2fr_0.8fr_1.2fr_0.9fr_0.9fr] px-4 py-3 border-b border-border bg-muted/30 items-center">
          <Checkbox
            checked={allPageSelected}
            onCheckedChange={toggleAll}
            className="data-[state=checked]:bg-[#FC7E34] data-[state=checked]:border-[#FC7E34]"
          />
          {['BROKER', 'RÉGION', 'CATÉGORIE', 'DIFFICULTÉ', 'MÉTHODE'].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              {h}
            </span>
          ))}
        </div>

        {/* Lignes */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_2fr_0.8fr_1.2fr_0.9fr_0.9fr] px-4 py-3 border-b border-border items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-10 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))
        ) : brokers.length === 0 ? (
          <div className="px-4 py-16 text-center text-muted-foreground">
            Aucun broker trouvé.
          </div>
        ) : (
          <motion.div key={`${page}-${activeCategory}-${search}`} variants={stagger} initial="hidden" animate="show">
            {brokers.map((broker: Broker) => {
              const isSelected = selected.has(broker.id)
              return (
                <motion.label
                  key={broker.id}
                  variants={rowVariant}
                  className={`grid grid-cols-[2.5rem_2fr_0.8fr_1.2fr_0.9fr_0.9fr] px-4 py-3.5 border-b border-border last:border-0 items-center cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#FC7E34]/5' : 'hover:bg-accent/40'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(broker)}
                    className="data-[state=checked]:bg-[#FC7E34] data-[state=checked]:border-[#FC7E34]"
                  />
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${broker.website}&sz=32`}
                      alt={broker.name}
                      className="w-6 h-6 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <span className="text-base font-medium">{broker.name}</span>
                    {!broker.isVerified && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Non vérifié</span>
                    )}
                  </div>
                  <span className="text-base text-muted-foreground font-medium">{regionLabels[broker.region]}</span>
                  <span className="text-base text-muted-foreground">{categoryLabels[broker.category]}</span>
                  <span className="text-base text-muted-foreground">{difficultyLabels[broker.difficulty]}</span>
                  <span className="text-base text-muted-foreground">{methodLabels[broker.optOutMethod]}</span>
                </motion.label>
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
          Page {page} sur {totalPages} &bull; {total} broker{total > 1 ? 's' : ''} au total
        </span>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => i + 1).map((p) => (
            <Button
              key={p} variant={p === page ? 'default' : 'outline'} size="icon" className={`w-8 h-8 ${p === page ? 'bg-[#FC7E34] hover:bg-[#e06e28] text-white border-0' : ''}`}
              onClick={() => setPage(p)}
            >{p}</Button>
          ))}
          <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* CTA fixe */}
      <AnimatePresence>
        {selectedBrokers.length > 0 && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#000401] text-white px-6 py-3.5 rounded-full shadow-2xl"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <span className="text-sm">
              <strong>{selectedBrokers.length}</strong> broker{selectedBrokers.length > 1 ? 's' : ''} sélectionné{selectedBrokers.length > 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              className="bg-[#FC7E34] hover:bg-[#e06e28] text-white h-8 gap-1.5"
              onClick={() => setModalOpen(true)}
            >
              Préparer l'envoi →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <SendRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedBrokers={selectedBrokers}
        onSuccess={() => navigate('/requests')}
      />
    </div>
  )
}

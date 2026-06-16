import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ShieldCheck, Search, Pencil, Trash2, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, Loader2, X, Upload, Database, Hourglass,
  ArrowUp, ArrowDown, BookMarked, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getMe, getBrokers, updateBroker, deleteBroker, verifyBroker, importBrokers,
  type CreateBrokerInput,
} from '@/lib/api'
import {
  categoryLabels, regionLabels, difficultyLabels,
  type Broker, type User,
} from '@/lib/mock-data'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const rowVariant: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.2 } } }

type Tab = 'all' | 'pending' | 'verified'

const TABS: { key: Tab; label: string; icon: typeof Database }[] = [
  { key: 'all',      label: 'Tous',       icon: Database },
  { key: 'pending',  label: 'En attente', icon: Hourglass },
  { key: 'verified', label: 'Vérifiés',   icon: CheckCircle2 },
]

const PER_PAGE = 10

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Feedback { type: 'success' | 'error'; text: string }

export default function AdminBrokers() {
  const navigate = useNavigate()
  const [me, setMe] = useState<User | null>(null)

  const [tab, setTab] = useState<Tab>('pending')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [brokersList, setBrokersList] = useState<Broker[]>([])
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [counts, setCounts] = useState<{ pending: number; verified: number } | null>(null)

  const [editing, setEditing] = useState<Broker | null>(null)
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Garde admin : redirige les non-admins vers le dashboard ────────────────
  useEffect(() => {
    getMe().then((u) => {
      if (!u || u.role !== 'admin') { navigate('/dashboard', { replace: true }); return }
      setMe(u)
    })
  }, [navigate])

  // ─── Recherche débouncée ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [tab, debouncedSearch])

  // ─── Chargement liste + compteurs ────────────────────────────────────────────
  const loadCounts = useCallback(() => {
    Promise.all([
      getBrokers({ page: 1, perPage: 1, isVerified: false }),
      getBrokers({ page: 1, perPage: 1, isVerified: true }),
    ]).then(([p, v]) => setCounts({ pending: p.total, verified: v.total }))
  }, [])

  const loadList = useCallback(() => {
    setLoading(true)
    getBrokers({
      page,
      perPage: PER_PAGE,
      search: debouncedSearch || undefined,
      isVerified: tab === 'all' ? undefined : tab === 'verified',
      sort: 'createdAt',
      order: sortOrder,
    }).then((res) => {
      setBrokersList(res.data)
      setTotal(res.total)
      setLastPage(res.lastPage)
      setLoading(false)
    })
  }, [page, debouncedSearch, tab, sortOrder])

  useEffect(() => { if (me) loadList() }, [me, loadList])
  useEffect(() => { if (me) loadCounts() }, [me, loadCounts])

  const refresh = () => { loadList(); loadCounts() }

  const flash = (f: Feedback) => {
    setFeedback(f)
    setTimeout(() => setFeedback(null), 4000)
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleVerify = async (broker: Broker) => {
    setBusySlug(broker.slug)
    const { error } = await verifyBroker(broker.slug)
    setBusySlug(null)
    if (error) return flash({ type: 'error', text: error })
    flash({ type: 'success', text: `${broker.name} marqué comme vérifié.` })
    refresh()
  }

  const handleDelete = async (broker: Broker) => {
    if (!window.confirm(`Supprimer définitivement le broker « ${broker.name} » ?`)) return
    setBusySlug(broker.slug)
    const { ok, error } = await deleteBroker(broker.slug)
    setBusySlug(null)
    if (!ok) return flash({ type: 'error', text: error ?? 'Suppression impossible.' })
    flash({ type: 'success', text: `${broker.name} supprimé.` })
    refresh()
  }

  const handleImportFile = async (file: File) => {
    setImporting(true)
    const { imported, skipped, error } = await importBrokers(file)
    setImporting(false)
    if (error) return flash({ type: 'error', text: error })
    flash({ type: 'success', text: `Import terminé : ${imported} ajoutés, ${skipped} ignorés.` })
    refresh()
  }

  if (!me) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Administration</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3" style={{ fontFamily: "'Squada One', sans-serif" }}>
            <ShieldCheck className="w-8 h-8 text-[#FC7E34]" />
            GESTION DES BROKERS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vérifiez les brokers proposés par les utilisateurs, modifiez ou supprimez les entrées du registre.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportFile(f)
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importer (.json / .yaml)
          </Button>
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`px-4 py-3 rounded-lg border text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-xl">
        <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#FC7E34]">En attente</span>
          <span className="text-3xl font-black text-[#253550]">{counts ? counts.pending : '—'}</span>
          <span className="text-xs text-muted-foreground">à vérifier</span>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-green-600">Vérifiés</span>
          <span className="text-3xl font-black text-[#253550]">{counts ? counts.verified : '—'}</span>
          <span className="text-xs text-muted-foreground">dans le registre</span>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#253550]">Total</span>
          <span className="text-3xl font-black text-[#253550]">{counts ? counts.pending + counts.verified : '—'}</span>
          <span className="text-xs text-muted-foreground">brokers référencés</span>
        </div>
      </div>

      {/* Tabs + recherche */}
      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.key
          const Icon = t.icon
          const count = t.key === 'all'
            ? (counts ? counts.pending + counts.verified : null)
            : t.key === 'pending' ? counts?.pending ?? null : counts?.verified ?? null
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
              {active && count !== null && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}

        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un broker…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors"
          />
        </div>
      </div>

      {/* Table desktop */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_auto] px-5 py-2.5 border-b border-border bg-muted/30 gap-3">
          {['BROKER', 'CATÉGORIE', 'PROPOSÉ PAR'].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{h}</span>
          ))}
          <button
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground tracking-wide uppercase hover:text-foreground transition-colors w-fit"
          >
            AJOUTÉ LE
            {sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
          </button>
          {['STATUT', 'ACTIONS'].map((h) => (
            <span key={h} className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{h}</span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-border last:border-0 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
          ))
        ) : brokersList.length === 0 ? (
          <div className="px-5 py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Database className="w-10 h-10 opacity-30" />
            <p className="text-sm">Aucun broker dans cette catégorie.</p>
          </div>
        ) : (
          <motion.div key={`${tab}-${page}-${debouncedSearch}`} variants={stagger} initial="hidden" animate="show">
            {brokersList.map((broker) => {
              const busy = busySlug === broker.slug
              return (
                <motion.div
                  key={broker.id}
                  variants={rowVariant}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.2fr_1fr_1fr_auto] px-5 py-4 border-b border-border last:border-0 items-center gap-3 hover:bg-accent/40 transition-colors"
                >
                  {/* Broker */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${broker.website}&sz=32`}
                      alt={broker.name}
                      className="w-9 h-9 rounded-lg object-contain bg-muted p-1 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }}
                    />
                    <div className="min-w-0">
                      <Link to={`/brokers/${broker.slug}`} className="text-base font-medium truncate block hover:underline">
                        {broker.name}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">{broker.website ?? broker.emailContact}</p>
                    </div>
                  </div>

                  {/* Catégorie */}
                  <span className="hidden md:block text-sm text-muted-foreground">{categoryLabels[broker.category]}</span>

                  {/* Proposé par */}
                  <div className="hidden md:flex items-center gap-1.5 min-w-0">
                    {broker.createdBy ? (
                      <>
                        <UserPlus className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="text-sm truncate" title={broker.createdByEmail ?? undefined}>
                          {broker.createdByEmail ?? 'Utilisateur supprimé'}
                        </span>
                      </>
                    ) : (
                      <>
                        <BookMarked className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">Registre par défaut</span>
                      </>
                    )}
                  </div>

                  {/* Ajouté le */}
                  <span className="hidden md:block text-sm text-muted-foreground">{formatDate(broker.createdAt)}</span>

                  {/* Statut */}
                  <span className={`inline-flex w-fit items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                    broker.isVerified
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {broker.isVerified
                      ? <><CheckCircle2 className="w-3 h-3" /> Vérifié</>
                      : <><AlertTriangle className="w-3 h-3" /> En attente</>}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {!broker.isVerified && (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                        disabled={busy}
                        onClick={() => handleVerify(broker)}
                      >
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Vérifier
                      </Button>
                    )}
                    <Button
                      variant="outline" size="icon" className="w-8 h-8"
                      title="Modifier"
                      disabled={busy}
                      onClick={() => setEditing(broker)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline" size="icon"
                      className="w-8 h-8 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                      title="Supprimer"
                      disabled={busy}
                      onClick={() => handleDelete(broker)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">{total} broker{total > 1 ? 's' : ''} · page {page} sur {lastPage}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === lastPage} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal édition */}
      <EditBrokerModal
        broker={editing}
        onClose={() => setEditing(null)}
        onSaved={(name) => {
          setEditing(null)
          flash({ type: 'success', text: `${name} mis à jour.` })
          refresh()
        }}
      />
    </div>
  )
}

// ─── Modal d'édition (PUT) ──────────────────────────────────────────────────────

const CATEGORY_OPTIONS = Object.entries(categoryLabels)
const REGION_OPTIONS = Object.entries(regionLabels)
const DIFFICULTY_OPTIONS = Object.entries(difficultyLabels)
const METHOD_OPTIONS: [string, string][] = [
  ['email', 'Email'], ['form', 'Formulaire'], ['postal', 'Postal'], ['mixed', 'Mixte'],
]
const LEGAL_OPTIONS: [string, string][] = [
  ['gdpr_art17', 'RGPD Art. 17'], ['gdpr_art15', 'RGPD Art. 15'],
  ['ccpa', 'CCPA'], ['pipeda', 'PIPEDA'], ['other', 'Autre'],
]

function EditBrokerModal({ broker, onClose, onSaved }: {
  broker: Broker | null
  onClose: () => void
  onSaved: (name: string) => void
}) {
  const [form, setForm] = useState<Partial<CreateBrokerInput>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!broker) return
    setError('')
    setForm({
      name: broker.name,
      emailContact: broker.emailContact,
      website: broker.website ?? '',
      optOutUrl: broker.optOutUrl ?? '',
      category: broker.category,
      region: broker.region,
      country: broker.country ?? '',
      optOutMethod: broker.optOutMethod as CreateBrokerInput['optOutMethod'],
      difficulty: broker.difficulty,
      legalBasis: broker.legalBasis,
      notes: broker.notes ?? '',
    })
  }, [broker])

  const set = (key: keyof CreateBrokerInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broker) return
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      website: form.website?.trim() || undefined,
      optOutUrl: form.optOutUrl?.trim() || undefined,
      country: form.country?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    }
    const { broker: updated, error: err } = await updateBroker(broker.slug, payload)
    setSaving(false)
    if (err || !updated) { setError(err ?? 'Modification impossible.'); return }
    onSaved(updated.name)
  }

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors'
  const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5'

  return (
    <AnimatePresence>
      {broker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !saving && onClose()}
          />
          <motion.div
            className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-background">
              <div>
                <h2 className="text-lg font-semibold">Modifier le broker</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{broker.name}</p>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={onClose} disabled={saving}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input type="text" required value={form.name ?? ''} onChange={set('name')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email de contact *</label>
                  <input type="email" required value={form.emailContact ?? ''} onChange={set('emailContact')} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Site web</label>
                  <input type="text" value={form.website ?? ''} onChange={set('website')} placeholder="acme.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Lien opt-out</label>
                  <input type="text" value={form.optOutUrl ?? ''} onChange={set('optOutUrl')} placeholder="https://acme.com/optout" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Catégorie</label>
                  <select value={form.category ?? ''} onChange={set('category')} className={inputCls}>
                    {CATEGORY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Région</label>
                  <select value={form.region ?? ''} onChange={set('region')} className={inputCls}>
                    {REGION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Pays (2 car.)</label>
                  <input type="text" maxLength={2} value={form.country ?? ''} onChange={set('country')} placeholder="FR" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Méthode opt-out</label>
                  <select value={form.optOutMethod ?? ''} onChange={set('optOutMethod')} className={inputCls}>
                    {METHOD_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Difficulté</label>
                  <select value={form.difficulty ?? ''} onChange={set('difficulty')} className={inputCls}>
                    {DIFFICULTY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Base légale</label>
                  <select value={form.legalBasis ?? ''} onChange={set('legalBasis')} className={inputCls}>
                    {LEGAL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={set('notes')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors resize-y"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>Annuler</Button>
                <Button
                  type="submit" size="sm"
                  className="gap-2 bg-[#FC7E34] hover:bg-[#e06e28] text-white"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

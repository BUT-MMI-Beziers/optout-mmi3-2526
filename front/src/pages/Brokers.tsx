import { useState, useMemo, useEffect } from "react"
import { motion, type Variants } from "framer-motion"

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const cardVar: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.22 } } }
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNavigate, Link } from "react-router-dom"
import {
  Search,
  Globe,
  Mail,
  FileText,
  Send,
  Shuffle,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Plus,
  UserPlus,
} from "lucide-react"
import { useBrokers } from "@/hooks/useBrokers"
import { getBrokers } from "@/lib/api"
import {
  categoryLabels,
  regionLabels,
  difficultyLabels,
  methodLabels,
  type BrokerCategory,
  type BrokerRegion,
  type Difficulty,
} from "@/lib/mock-data"

// ─── Configuration ────────────────────────────────────────────────────────────

const CATEGORY_ORDER: BrokerCategory[] = [
  "people-search",
  "marketing",
  "risk-mitigation",
  "recruitment",
]

// Icône lucide pour chaque méthode d'opt-out
const methodIconMap = {
  email: Mail,
  form: FileText,
  postal: Send,
  mixed: Shuffle,
} as const

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Brokers() {
  const navigate = useNavigate()

  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<BrokerCategory | "tous">("tous")
  const [regionFilter, setRegionFilter] = useState<BrokerRegion | "tous">("tous")
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "tous">("tous")
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  // ─── Données paginées (filtrage côté serveur) ──────────────
  const { data, loading, error } = useBrokers({
    page,
    perPage: itemsPerPage,
    category: activeCategory === "tous" ? undefined : activeCategory,
    region: regionFilter === "tous" ? undefined : regionFilter,
    difficulty: difficultyFilter === "tous" ? undefined : difficultyFilter,
    search: search || undefined,
  })

  const paginated = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.lastPage ?? 1
  const safePage = Math.min(page, totalPages)

  // ─── Compteurs globaux par catégorie (indépendants des filtres) ──
  const [counts, setCounts] = useState<{
    total: number
    byCategory: Record<BrokerCategory, number>
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const [totalRes, ...catRes] = await Promise.all([
        getBrokers({ perPage: 1 }),
        ...CATEGORY_ORDER.map((cat) => getBrokers({ perPage: 1, category: cat })),
      ])
      if (cancelled) return
      const byCategory = {} as Record<BrokerCategory, number>
      CATEGORY_ORDER.forEach((cat, i) => {
        byCategory[cat] = catRes[i].total
      })
      setCounts({ total: totalRes.total, byCategory })
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [])

  const categoryCounts = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: categoryLabels[cat],
      count: counts?.byCategory[cat] ?? 0,
    }))
  }, [counts])

  const hasActiveFilters =
    search !== "" ||
    activeCategory !== "tous" ||
    regionFilter !== "tous" ||
    difficultyFilter !== "tous"

  const resetFilters = () => {
    setSearch("")
    setActiveCategory("tous")
    setRegionFilter("tous")
    setDifficultyFilter("tous")
    setPage(1)
  }


  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | "...")[] = [1]
    if (safePage > 3) pages.push("...")
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i)
    }
    if (safePage < totalPages - 2) pages.push("...")
    pages.push(totalPages)
    return pages
  }, [safePage, totalPages])

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* ─── Breadcrumb ─────────────────────────────────────── */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Data brokers</span>
      </nav>

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-wide" style={{ fontFamily: "'Squada One', sans-serif", color: "#000401" }}>
            Registre des brokers
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Tous les data brokers connus, leurs catégories et l'état de vos demandes de suppression.
          </p>
        </div>
        <Button
          onClick={() => navigate("/brokers/new")}
          className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2 h-10 px-5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Proposer un broker
        </Button>
      </div>

      {/* ─── Barre de recherche ─────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans le registre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="pl-9 bg-white border-border"
        />
      </div>

      {/* ─── Filtres catégories ─────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => {
            setActiveCategory("tous")
            setPage(1)
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
          style={
            activeCategory === "tous"
              ? { backgroundColor: "#253550", color: "#F9F7F6", borderColor: "#253550" }
              : { backgroundColor: "white", color: "#000401", borderColor: "#e5e3e1" }
          }
        >
          Tous
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={activeCategory === "tous" ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" } : { backgroundColor: "#f0efee", color: "#6b7280" }}>
            {counts?.total ?? 0}
          </span>
        </button>

        {categoryCounts.map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key)
                setPage(1)
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border"
              style={
                isActive
                  ? { backgroundColor: "#253550", color: "#F9F7F6", borderColor: "#253550" }
                  : { backgroundColor: "white", color: "#000401", borderColor: "#e5e3e1" }
              }
            >
              {cat.label}
              <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={isActive ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" } : { backgroundColor: "#f0efee", color: "#6b7280" }}>
                {cat.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ─── Filtres avancés ────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filtres :</span>

        <Select
          value={regionFilter}
          onValueChange={(v) => {
            setRegionFilter(v as BrokerRegion | "tous")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Région" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les régions</SelectItem>
            <SelectItem value="eu">{regionLabels.eu}</SelectItem>
            <SelectItem value="us">{regionLabels.us}</SelectItem>
            <SelectItem value="global">{regionLabels.global}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={difficultyFilter}
          onValueChange={(v) => {
            setDifficultyFilter(v as Difficulty | "tous")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Difficulté" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes difficultés</SelectItem>
            <SelectItem value="easy">{difficultyLabels.easy}</SelectItem>
            <SelectItem value="medium">{difficultyLabels.medium}</SelectItem>
            <SelectItem value="hard">{difficultyLabels.hard}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <button
            onClick={resetFilters}
            className="text-sm font-medium underline transition-colors"
            style={{ color: "#FC7E34" }}
          >
            Réinitialiser les filtres
          </button>
        ) : null}

        <div className="ml-auto">
          <Select
            value={String(itemsPerPage)}
            onValueChange={(v) => {
              setItemsPerPage(Number(v))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 par page</SelectItem>
              <SelectItem value="24">24 par page</SelectItem>
              <SelectItem value="48">48 par page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── Erreur ─────────────────────────────────────────── */}
      {error ? (
        <div className="text-center py-16 text-red-600">
          <p className="text-base">{error}</p>
        </div>
      ) : null}

      {/* ─── Grille des brokers ─────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {loading
          ? Array.from({ length: itemsPerPage }).map((_, i) => (
              <Card key={"skeleton-" + i} className="bg-white border-border">
                <CardHeader className="pb-2 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-[60px] w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))
          : paginated.map((broker) => {
          const MethodIcon = methodIconMap[broker.optOutMethod]
          return (
            <motion.div key={broker.id} variants={cardVar} layout>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow bg-white border-border h-full"
              onClick={() => navigate("/brokers/" + broker.slug)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-lg leading-tight" style={{ color: "#000401" }}>
                      {broker.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{broker.website}</p>
                  </div>
                  <Badge className="text-xs uppercase shrink-0 text-white border-0" style={{ backgroundColor: "#253550" }}>
                    {categoryLabels[broker.category]}
                  </Badge>
                </div>

                {/* Badges vérifié / non-vérifié + provenance */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {broker.isVerified ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
                      Vérifié
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                      <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                      À vérifier
                    </span>
                  )}
                  {broker.createdBy && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "#ede9fe", color: "#6d28d9" }}>
                      <UserPlus className="w-3 h-3" strokeWidth={2.5} />
                      Ajouté
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-snug line-clamp-3 min-h-[60px]">
                  {broker.notes || categoryLabels[broker.category] + " basé en " + regionLabels[broker.region] + ". Méthode d'opt-out : " + methodLabels[broker.optOutMethod].toLowerCase() + "."}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {regionLabels[broker.region]}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MethodIcon className="w-3 h-3" />
                    {methodLabels[broker.optOutMethod]}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {broker.legalBasis === "gdpr_art17" ? "RGPD" : broker.legalBasis === "ccpa" ? "CCPA" : "Autre"}
                  </span>
                </div>

                <Link
                  to={`/brokers/${broker.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2 text-sm transition-colors hover:bg-muted"
                  style={{ color: "#000401" }}
                >
                  Voir les détails
                </Link>
              </CardContent>
            </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ─── État vide ──────────────────────────────────────── */}
      {!loading && !error && paginated.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-base mb-2">Aucun broker ne correspond à votre recherche.</p>
          {hasActiveFilters ? (
            <button onClick={resetFilters} className="text-sm font-medium underline" style={{ color: "#FC7E34" }}>
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ─── Pagination ─────────────────────────────────────── */}
      {!loading && total > 0 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Affichage de {paginated.length} sur {total} brokers
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 text-sm"
              aria-label="Page précédente"
            >
              ‹
            </button>
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={"dots-" + idx} className="w-8 h-8 flex items-center justify-center text-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors"
                  style={
                    safePage === p
                      ? { backgroundColor: "#FC7E34", color: "white" }
                      : { border: "1px solid #e5e3e1", backgroundColor: "white" }
                  }
                  aria-label={"Page " + p}
                  aria-current={safePage === p ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 text-sm"
              aria-label="Page suivante"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}

    </div>
  )
}
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNavigate } from "react-router-dom"
import {
  mockBrokers,
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

const methodIcons: Record<string, string> = {
  email: "📧",
  form: "📋",
  postal: "✉️",
  mixed: "🔀",
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Brokers() {
  const navigate = useNavigate()

  // États
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<BrokerCategory | "tous">("tous")
  const [regionFilter, setRegionFilter] = useState<BrokerRegion | "tous">("tous")
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "tous">("tous")
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [excluded, setExcluded] = useState<string[]>([])

  // Filtrage
  const filtered = useMemo(() => {
    return mockBrokers.filter((b) => {
      const matchSearch = b.name.toLowerCase().includes(search.toLowerCase())
      const matchCategory = activeCategory === "tous" || b.category === activeCategory
      const matchRegion = regionFilter === "tous" || b.region === regionFilter
      const matchDifficulty = difficultyFilter === "tous" || b.difficulty === difficultyFilter
      return matchSearch && matchCategory && matchRegion && matchDifficulty
    })
  }, [search, activeCategory, regionFilter, difficultyFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  )

  // Compteurs par catégorie
  const categoryCounts = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      key: cat,
      label: categoryLabels[cat],
      count: mockBrokers.filter((b) => b.category === cat).length,
    }))
  }, [])

  // Filtres actifs ?
  const hasActiveFilters =
    search !== "" ||
    activeCategory !== "tous" ||
    regionFilter !== "tous" ||
    difficultyFilter !== "tous"

  // Helpers
  const resetFilters = () => {
    setSearch("")
    setActiveCategory("tous")
    setRegionFilter("tous")
    setDifficultyFilter("tous")
    setPage(1)
  }

  const toggleExclude = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExcluded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Pagination intelligente (1 ... 4 5 6 ... 12)
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
    <div className="p-8 space-y-6">

      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "'Squada One', sans-serif", color: "#000401" }}
          >
            Registre des brokers
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Tous les data brokers connus, leurs catégories et l'état de vos demandes de suppression.
          </p>
        </div>
      </div>

      {/* ─── Barre de recherche ─────────────────────────────── */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          🔍
        </span>
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
        {/* Bouton "Tous" */}
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
          <span
            className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={
              activeCategory === "tous"
                ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                : { backgroundColor: "#f0efee", color: "#6b7280" }
            }
          >
            {mockBrokers.length}
          </span>
        </button>

        {/* Boutons catégories */}
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
              <span
                className="text-xs px-1.5 py-0.5 rounded font-bold"
                style={
                  isActive
                    ? { backgroundColor: "rgba(255,255,255,0.2)", color: "white" }
                    : { backgroundColor: "#f0efee", color: "#6b7280" }
                }
              >
                {cat.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ─── Filtres avancés (région, difficulté, par page) ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Filtres :</span>

        {/* Région */}
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
            <SelectItem value="eu">🇪🇺 {regionLabels.eu}</SelectItem>
            <SelectItem value="us">🇺🇸 {regionLabels.us}</SelectItem>
            <SelectItem value="global">🌍 {regionLabels.global}</SelectItem>
          </SelectContent>
        </Select>

        {/* Difficulté */}
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
            <SelectItem value="easy">🟢 {difficultyLabels.easy}</SelectItem>
            <SelectItem value="medium">🟠 {difficultyLabels.medium}</SelectItem>
            <SelectItem value="hard">🔴 {difficultyLabels.hard}</SelectItem>
          </SelectContent>
        </Select>

        {/* Bouton reset (visible seulement si filtres actifs) */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-sm font-medium underline transition-colors"
            style={{ color: "#FC7E34" }}
          >
            Réinitialiser les filtres
          </button>
        )}

        {/* Sélecteur "par page" (à droite) */}
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

      {/* ─── Grille des brokers ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {paginated.map((broker) => {
          const isExcluded = excluded.includes(broker.id)
          return (
            <Card
              key={broker.id}
              className="cursor-pointer hover:shadow-md transition-shadow bg-white border-border"
              style={isExcluded ? { opacity: 0.5 } : {}}
              onClick={() => navigate(`/brokers/${broker.slug}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="font-bold text-lg leading-tight"
                      style={{ fontFamily: "'Squada One', sans-serif", color: "#000401" }}
                    >
                      {broker.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{broker.website}</p>
                  </div>
                  <Badge
                    className="text-xs uppercase shrink-0 text-white border-0"
                    style={{ backgroundColor: "#253550" }}
                  >
                    {categoryLabels[broker.category]}
                  </Badge>
                </div>

                {/* Badge vérifié / non-vérifié */}
                <div className="flex items-center gap-2 mt-2">
                  {broker.isVerified ? (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      style={{ backgroundColor: "#dcfce7", color: "#15803d" }}
                    >
                      ✓ Vérifié
                    </span>
                  ) : (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                      style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                    >
                      ⚠ À vérifier
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Notes du broker si dispo, sinon fallback générique */}
                <p className="text-sm text-muted-foreground leading-snug line-clamp-3 min-h-[60px]">
                  {broker.notes || `${categoryLabels[broker.category]} basé en ${regionLabels[broker.region]}. Méthode d'opt-out : ${methodLabels[broker.optOutMethod].toLowerCase()}.`}
                </p>

                {/* Métadonnées (région, méthode, base légale) */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>🌐 {regionLabels[broker.region]}</span>
                  <span>
                    {methodIcons[broker.optOutMethod]} {methodLabels[broker.optOutMethod]}
                  </span>
                  <span>
                    ◯ {broker.legalBasis === "gdpr_art17" ? "RGPD" : broker.legalBasis === "ccpa" ? "CCPA" : "Autre"}
                  </span>
                </div>

                {/* Bouton "Ne pas contacter" */}
                <button
                  className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2 text-sm transition-colors hover:bg-muted"
                  style={isExcluded ? { color: "#FC7E34", borderColor: "#FC7E34" } : { color: "#000401" }}
                  onClick={(e) => toggleExclude(broker.id, e)}
                >
                  <span style={{ color: isExcluded ? "#FC7E34" : "#ef4444" }}>
                    {isExcluded ? "↩" : "✕"}
                  </span>
                  {isExcluded ? "Réintégrer ce broker" : "Ne pas contacter ce broker"}
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ─── État vide ──────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-base mb-2">Aucun broker ne correspond à votre recherche.</p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm font-medium underline"
              style={{ color: "#FC7E34" }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* ─── Pagination ─────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Affichage de {paginated.length} sur {filtered.length} brokers
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
                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-muted-foreground">
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
                  aria-label={`Page ${p}`}
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
      )}

    </div>
  )
}
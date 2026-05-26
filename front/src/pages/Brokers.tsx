import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

const MOCK_BROKERS = [
  {
    id: "1",
    name: "Spokeo",
    slug: "spokeo",
    website: "spokeo.com",
    category: "aggregateurs",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "easy",
    is_verified: true,
    email_contact: "privacy@spokeo.com",
    description: "Agrégateur américain de données personnelles. Compile annuaires, réseaux sociaux et registres publics.",
  },
  {
    id: "2",
    name: "Pages Blanches",
    slug: "pages-blanches",
    website: "pagesblanches.fr",
    category: "annuaires",
    region: "eu",
    legal_basis: "gdpr_art17",
    difficulty: "medium",
    is_verified: true,
    email_contact: "dpo@pagesblanches.fr",
    description: "Annuaire en ligne français référençant adresses et numéros de téléphone des particuliers.",
  },
  {
    id: "3",
    name: "Acxiom",
    slug: "acxiom",
    website: "acxiom.com",
    category: "marketing",
    region: "global",
    legal_basis: "ccpa",
    difficulty: "hard",
    is_verified: false,
    email_contact: "privacy@acxiom.com",
    description: "Géant du marketing data. Collecte et revend des profils comportementaux à grande échelle.",
  },
  {
    id: "4",
    name: "Intelius",
    slug: "intelius",
    website: "intelius.com",
    category: "aggregateurs",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "medium",
    is_verified: true,
    email_contact: "privacy@intelius.com",
    description: "Agrégateur américain de données personnelles. Compile annuaires, réseaux sociaux et registres publics.",
  },
  {
    id: "5",
    name: "BeenVerified",
    slug: "beenverified",
    website: "beenverified.com",
    category: "aggregateurs",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "easy",
    is_verified: true,
    email_contact: "privacy@beenverified.com",
    description: "Agrégateur américain de données personnelles. Compile annuaires, réseaux sociaux et registres publics.",
  },
  {
    id: "6",
    name: "Whitepages",
    slug: "whitepages",
    website: "whitepages.com",
    category: "annuaires",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "easy",
    is_verified: false,
    email_contact: "privacy@whitepages.com",
    description: "Annuaire en ligne américain référençant adresses et numéros de téléphone des particuliers.",
  },
  {
    id: "7",
    name: "Epsilon",
    slug: "epsilon",
    website: "epsilon.com",
    category: "marketing",
    region: "global",
    legal_basis: "gdpr_art17",
    difficulty: "hard",
    is_verified: true,
    email_contact: "privacy@epsilon.com",
    description: "Plateforme de marketing data mondiale. Vend des segments comportementaux aux annonceurs.",
  },
  {
    id: "8",
    name: "LexisNexis",
    slug: "lexisnexis",
    website: "lexisnexis.com",
    category: "recherche",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "hard",
    is_verified: false,
    email_contact: "privacy@lexisnexis.com",
    description: "Base de données juridique et d'investigation. Agrège des millions de dossiers publics.",
  },
  {
    id: "9",
    name: "PeopleFinder",
    slug: "peoplefinder",
    website: "peoplefinder.com",
    category: "aggregateurs",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "medium",
    is_verified: false,
    email_contact: "privacy@peoplefinder.com",
    description: "Agrégateur américain de données personnelles. Compile annuaires, réseaux sociaux et registres publics.",
  },
  {
    id: "10",
    name: "TruePeopleSearch",
    slug: "truepeoplesearch",
    website: "truepeoplesearch.com",
    category: "recherche",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "easy",
    is_verified: true,
    email_contact: "privacy@truepeoplesearch.com",
    description: "Moteur de recherche de personnes américain. Agrège des données publiques et semi-publiques.",
  },
  {
    id: "11",
    name: "DataBrokersList",
    slug: "databrokerslist",
    website: "databrokerslist.com",
    category: "marketing",
    region: "global",
    legal_basis: "gdpr_art17",
    difficulty: "medium",
    is_verified: false,
    email_contact: "privacy@databrokerslist.com",
    description: "Plateforme de courtage de données marketing. Agrège et revend des profils consommateurs.",
  },
  {
    id: "12",
    name: "InfoTracer",
    slug: "infotracer",
    website: "infotracer.com",
    category: "recherche",
    region: "us",
    legal_basis: "ccpa",
    difficulty: "medium",
    is_verified: true,
    email_contact: "privacy@infotracer.com",
    description: "Service de recherche d'informations personnelles. Agrège dossiers publics et données en ligne.",
  },
]

const CATEGORIES = [
  { key: "tous", label: "Tous" },
  { key: "aggregateurs", label: "Agrégateurs" },
  { key: "annuaires", label: "Annuaires" },
  { key: "marketing", label: "Marketing" },
  { key: "recherche", label: "Recherche" },
]

const ITEMS_PER_PAGE = 12

export default function Brokers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("tous")
  const [page, setPage] = useState(1)
  const [excluded, setExcluded] = useState<string[]>([])

  const filtered = MOCK_BROKERS.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === "tous" || b.category === activeCategory
    return matchSearch && matchCat
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const categoryCounts = CATEGORIES.map((cat) => ({
    ...cat,
    count:
      cat.key === "tous"
        ? MOCK_BROKERS.length
        : MOCK_BROKERS.filter((b) => b.category === cat.key).length,
  }))

  const toggleExclude = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExcluded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
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
        <Button
          className="flex items-center gap-2 font-semibold text-white shrink-0"
          style={{ backgroundColor: "#FC7E34", borderColor: "#FC7E34" }}
          onClick={() => navigate("/admin/brokers")}
        >
          <span>⚑</span> Signaler un broker
        </Button>
      </div>

      {/* Barre de recherche */}
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

      {/* Filtres catégories */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground border border-border rounded-lg px-3 py-2 bg-white">
          12 par page <span className="ml-1">▾</span>
        </div>
      </div>

      {/* Grille des brokers */}
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
                    {broker.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-snug line-clamp-3">
                  {broker.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>🌐 {broker.region.toUpperCase()}</span>
                  <span>
                    ◯ {broker.legal_basis === "gdpr_art17" ? "RGPD" : "CCPA"}
                  </span>
                </div>
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

      {/* Vide */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Aucun broker ne correspond à votre recherche.
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Affichage de {paginated.length} sur {filtered.length} brokers
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 text-sm"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className="w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors"
              style={
                page === p
                  ? { backgroundColor: "#FC7E34", color: "white" }
                  : { border: "1px solid #e5e3e1", backgroundColor: "white" }
              }
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 text-sm"
          >
            ›
          </button>
        </div>
      </div>

    </div>
  )
}
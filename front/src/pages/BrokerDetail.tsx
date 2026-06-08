import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  FileText,
  Send,
  Shuffle,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Globe,
} from "lucide-react"
import {
  categoryLabels,
  regionLabels,
  difficultyLabels,
  methodLabels,
  statusConfig,
  type Broker,
  type RemovalRequest,
} from "@/lib/mock-data"
import { getBroker, getRequests } from "@/lib/api"

const legalLabel: Record<string, string> = {
  gdpr_art17: "RGPD Art. 17",
  gdpr_art15: "RGPD Art. 15",
  ccpa: "CCPA",
  pipeda: "PIPEDA",
  other: "Autre",
}

const methodIconMap = {
  email: Mail,
  form: FileText,
  postal: Send,
  mixed: Shuffle,
} as const

const difficultyColor: Record<string, { bg: string; text: string }> = {
  easy: { bg: "#dcfce7", text: "#15803d" },
  medium: { bg: "#fef3c7", text: "#92400e" },
  hard: { bg: "#fee2e2", text: "#991b1b" },
}

function formatDate(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export default function BrokerDetail() {
  const params = useParams()
  const slug = params.slug
  const navigate = useNavigate()

  const [broker, setBroker] = useState<Broker | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestHistory, setRequestHistory] = useState<RemovalRequest[]>([])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getBroker(slug).then((b) => {
      setBroker(b)
      setLoading(false)
      if (b) {
        getRequests({ brokerId: b.id, perPage: 50 }).then((res) =>
          setRequestHistory([...res.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        )
      }
    })
  }, [slug])

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!broker) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-bold uppercase" style={{ color: "#000401" }}>
          Broker introuvable
        </h1>
        <p className="text-muted-foreground">Le broker que vous cherchez n'existe pas dans le registre.</p>
        <Button onClick={() => navigate("/brokers")} className="font-semibold text-white inline-flex items-center gap-2" style={{ backgroundColor: "#FC7E34" }}>
          <ArrowLeft className="w-4 h-4" />
          Retour au registre
        </Button>
      </div>
    )
  }

  const diffStyle = difficultyColor[broker.difficulty]
  const websiteUrl = "https://" + broker.website
  const mailtoUrl = "mailto:" + broker.emailContact
  const MethodIcon = methodIconMap[broker.optOutMethod]

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">

      <Link to="/brokers" className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour au registre
      </Link>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-5xl font-bold uppercase tracking-wide" style={{ color: "#000401" }}>
              {broker.name}
            </h1>
            {broker.isVerified ? (
              <span className="text-sm font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                Vérifié
              </span>
            ) : (
              <span className="text-sm font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                À vérifier
              </span>
            )}
          </div>

          <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-base text-muted-foreground hover:underline inline-flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4" />
            {broker.website}
          </a>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Badge className="text-xs uppercase shrink-0 text-white border-0" style={{ backgroundColor: "#253550" }}>
              {categoryLabels[broker.category]}
            </Badge>
            <Badge variant="outline" className="text-xs uppercase border-border inline-flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {regionLabels[broker.region]}
            </Badge>
            <Badge className="text-xs uppercase border-0" style={{ backgroundColor: diffStyle.bg, color: diffStyle.text }}>
              {difficultyLabels[broker.difficulty]}
            </Badge>
            <Badge variant="outline" className="text-xs uppercase border-border inline-flex items-center gap-1">
              <Scale className="w-3 h-3" />
              {legalLabel[broker.legalBasis]}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl uppercase" style={{ color: "#000401" }}>
                À propos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {broker.notes || broker.name + " est un broker de catégorie " + categoryLabels[broker.category].toLowerCase() + " basé en " + regionLabels[broker.region] + ". La méthode d'opt-out privilégiée est " + methodLabels[broker.optOutMethod].toLowerCase() + ". Aucune note complémentaire n'est disponible pour le moment."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl uppercase" style={{ color: "#000401" }}>
                Coordonnées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-32">Email DPO :</span>
                <a href={mailtoUrl} className="hover:underline font-medium inline-flex items-center gap-1.5" style={{ color: "#FC7E34" }}>
                  <Mail className="w-4 h-4" />
                  {broker.emailContact}
                </a>
              </div>
              {broker.optOutUrl ? (
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground shrink-0 w-32">Formulaire :</span>
                  <a href={broker.optOutUrl} target="_blank" rel="noopener noreferrer" className="hover:underline font-medium break-all inline-flex items-center gap-1.5" style={{ color: "#FC7E34" }}>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    {broker.optOutUrl}
                  </a>
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-32">Pays :</span>
                <span className="font-medium">{broker.country}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-32">Méthode :</span>
                <span className="font-medium inline-flex items-center gap-1.5">
                  <MethodIcon className="w-4 h-4" />
                  {methodLabels[broker.optOutMethod]}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground shrink-0 w-32">Base légale :</span>
                <span className="font-medium inline-flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  {legalLabel[broker.legalBasis]}
                </span>
              </div>
              {broker.lastVerifiedAt ? (
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground shrink-0 w-32">Vérifié le :</span>
                  <span className="font-medium">{formatDate(broker.lastVerifiedAt)}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl uppercase" style={{ color: "#000401" }}>
                Historique de vos demandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Vous n'avez pas encore fait de demande de suppression auprès de ce broker.
                </p>
              ) : (
                <div className="space-y-3">
                  {requestHistory.map((req) => {
                    const status = statusConfig[req.status]
                    const linkTo = "/requests/" + req.id
                    return (
                      <Link key={req.id} to={linkTo} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={"w-2 h-2 rounded-full " + status.dot} />
                          <div>
                            <p className="text-sm font-medium">Demande du {formatDate(req.createdAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              Envoyée le {formatDate(req.sentAt)}
                              {req.respondedAt ? " · Réponse le " + formatDate(req.respondedAt) : ""}
                            </p>
                          </div>
                        </div>
                        <span className={"text-xs font-semibold px-2 py-1 rounded-full " + status.bg + " " + status.color}>
                          {status.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">

            <Card style={{ borderColor: "#FC7E34", borderWidth: 2 }}>
              <CardHeader>
                <CardTitle className="text-xl uppercase" style={{ color: "#000401" }}>
                  Action
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Envoyez une demande de suppression de vos données personnelles à {broker.name}.
                </p>
                <Button className="w-full font-semibold text-white inline-flex items-center justify-center gap-2" style={{ backgroundColor: "#FC7E34" }} onClick={() => navigate("/requests/new?broker=" + broker.slug)}>
                  <Mail className="w-4 h-4" />
                  Demander la suppression
                </Button>
                <p className="text-xs text-muted-foreground italic">
                  Le broker a 30 jours pour répondre, conformément à l'article 12 du RGPD.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase" style={{ color: "#000401" }}>
                  En bref
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Difficulté</span>
                  <span className="font-semibold px-2 py-0.5 rounded text-xs" style={{ backgroundColor: diffStyle.bg, color: diffStyle.text }}>
                    {difficultyLabels[broker.difficulty]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Méthode</span>
                  <span className="font-medium inline-flex items-center gap-1.5">
                    <MethodIcon className="w-4 h-4" />
                    {methodLabels[broker.optOutMethod]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Région</span>
                  <span className="font-medium inline-flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    {regionLabels[broker.region]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vos demandes</span>
                  <span className="font-bold" style={{ color: "#FC7E34" }}>
                    {requestHistory.length}
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.26 } } }

import { Send, User, Mail, MapPin, CheckCircle2, Loader2, ArrowLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getMe, getContacts, getTemplates, sendBatch } from '@/lib/api'
import {
  type Broker, type User as UserType, type UserContact, type EmailTemplate,
  categoryLabels, difficultyLabels,
} from '@/lib/mock-data'

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key.trim()] ?? `{{${key.trim()}}}`)
}

export default function NewRequestReview() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const selectedBrokers: Broker[] = state?.brokers ?? []

  const [user, setUser] = useState<UserType | null>(null)
  const [contacts, setContacts] = useState<UserContact[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set())
  const [selectedAddressIds, setSelectedAddressIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [queued, setQueued] = useState<{ created: number; failed: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (selectedBrokers.length === 0) { navigate('/requests/new'); return }
    Promise.all([getMe(), getContacts(), getTemplates()]).then(([u, c, t]) => {
      setUser(u)
      setContacts(c)
      setTemplates(t)
      const defaultTpl = t.find((tpl) => tpl.isDefault && tpl.language === 'fr') ?? t[0]
      if (defaultTpl) setSelectedTemplateId(defaultTpl.id)
      setSelectedEmailIds(new Set(c.filter((x) => x.type === 'email').map((x) => x.id)))
      setSelectedAddressIds(new Set(c.filter((x) => x.type === 'address').map((x) => x.id)))
      setLoading(false)
    })
  }, [])

  const emailContacts = contacts.filter((c) => c.type === 'email')
  const addressContacts = contacts.filter((c) => c.type === 'address')

  const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, checked: boolean) => {
    setter((prev) => { const next = new Set(prev); checked ? next.add(id) : next.delete(id); return next })
  }

  const selectedEmailsStr = emailContacts.filter((c) => selectedEmailIds.has(c.id)).map((c) => c.value).join(', ')
  const selectedAddressesStr = addressContacts.filter((c) => selectedAddressIds.has(c.id)).map((c) => c.value).join(' | ')

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const previewBroker = selectedBrokers[0]

  const interpolationVars: Record<string, string> = {
    'user.first_name': user?.firstName ?? '',
    'user.last_name': user?.lastName ?? '',
    'user.email': selectedEmailsStr,
    'user.address': selectedAddressesStr,
    'broker.name': previewBroker?.name ?? '',
    'broker.email_contact': previewBroker?.emailContact ?? '',
    'request.date': new Date().toLocaleDateString('fr-FR'),
    'request.id': '[UUID généré à l\'envoi]',
  }

  const previewSubject = selectedTemplate ? interpolate(selectedTemplate.subject, interpolationVars) : ''
  const previewBody = selectedTemplate ? interpolate(selectedTemplate.body, interpolationVars) : ''

  const handleSend = async () => {
    if (!selectedTemplateId || selectedBrokers.length === 0) return
    setSending(true)
    const result = await sendBatch({ brokerIds: selectedBrokers.map((b) => b.id), templateId: selectedTemplateId })
    setSending(false)

    // Une seule demande envoyée sans échec → on ouvre directement la demande.
    // Sinon (plusieurs demandes, ou brokers ignorés) on garde l'écran de récap.
    if (result.createdIds.length === 1 && result.failed === 0) {
      navigate(`/requests/${result.createdIds[0]}`)
      return
    }
    setQueued({ created: result.created, failed: result.failed })
  }

  if (queued !== null) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 350, damping: 22 }}>
          <div className="relative">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <Clock className="w-5 h-5 text-violet-500 absolute -bottom-1 -right-1 bg-white rounded-full" />
          </div>
        </motion.div>
        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-green-600">
            {queued.created} demande{queued.created > 1 ? 's' : ''} mise{queued.created > 1 ? 's' : ''} en file d'envoi
          </p>
          {queued.failed > 0 && (
            <p className="text-sm text-amber-600">{queued.failed} broker{queued.failed > 1 ? 's' : ''} ignoré{queued.failed > 1 ? 's' : ''} (déjà en attente ou invalide)</p>
          )}
          <p className="text-sm text-muted-foreground">Les emails seront envoyés dans quelques instants. Vous pouvez les annuler depuis la liste des demandes.</p>
        </div>
        <button
          onClick={() => navigate('/requests')}
          className="mt-2 text-sm font-medium text-[#FC7E34] hover:underline"
        >
          Voir mes demandes →
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 pb-32 lg:pb-24">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <Link to="/requests" className="hover:text-foreground">Mes demandes</Link>
        <span>›</span>
        <Link to="/requests/new" className="hover:text-foreground">Nouvelle demande</Link>
        <span>›</span>
        <span className="text-foreground">Récapitulatif</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="w-9 h-9 shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
            RÉCAPITULATIF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vérifiez le contenu avant d'envoyer — les données sont pré-remplies depuis votre profil.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="show">
          {/* Brokers sélectionnés */}
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="px-6 pt-5 pb-3">
                <CardTitle className="text-xl font-medium">
                  Brokers ciblés
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({selectedBrokers.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-5">
                <div className="flex flex-wrap gap-2">
                  {selectedBrokers.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${b.website}&sz=16`}
                        alt={b.name}
                        className="w-4 h-4"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span className="font-medium">{b.name}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{categoryLabels[b.category]}</Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0">{difficultyLabels[b.difficulty]}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Grille : Aperçu (2/3) + Configuration (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Aperçu email */}
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="px-6 pt-5 pb-3">
                  <CardTitle className="text-xl font-medium">
                    Aperçu email
                    {selectedBrokers.length > 1 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        — pour {previewBroker?.name} (+{selectedBrokers.length - 1} autre{selectedBrokers.length > 2 ? 's' : ''} avec le même contenu adapté)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  {selectedTemplate && previewBroker ? (
                    <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-3 text-sm font-mono">
                      <div className="space-y-1">
                        <p><span className="text-muted-foreground">À : </span><span className="text-[#253550] font-semibold">{previewBroker.emailContact}</span></p>
                        <p><span className="text-muted-foreground">Objet : </span><span className="font-semibold">{previewSubject}</span></p>
                      </div>
                      <Separator />
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-foreground">
                        {previewBody}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sélectionnez un template pour voir l'aperçu.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Configuration */}
            <motion.div variants={fadeUp} className="space-y-5">

              {/* Template */}
              <Card>
                <CardHeader className="px-6 pt-5 pb-3">
                  <CardTitle className="text-xl font-medium">Template</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Seuls les templates initiaux (Effacement, Accès) sont sélectionnables.
                          Relance et mise en demeure sont appliqués automatiquement pour les suivis. */}
                      {templates.filter((t) => t.isDefault).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — {t.language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Données personnelles */}
              <Card>
                <CardHeader className="px-6 pt-5 pb-3">
                  <CardTitle className="text-xl font-medium">Vos données</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5 space-y-4">
                  {/* Identité — statique */}
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 rounded-lg">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Identité</span>
                    <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
                  </div>

                  {/* Emails */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Adresses email</span>
                    </div>
                    {emailContacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <Checkbox
                          checked={selectedEmailIds.has(c.id)}
                          onCheckedChange={(v) => toggleId(setSelectedEmailIds, c.id, !!v)}
                          className="data-[state=checked]:bg-[#FC7E34] data-[state=checked]:border-[#FC7E34]"
                        />
                        <span className="text-sm font-medium flex-1 truncate">{c.value}</span>
                        {c.label && <span className="text-xs text-muted-foreground shrink-0">{c.label}</span>}
                      </label>
                    ))}
                    {emailContacts.length === 0 && (
                      <p className="text-xs text-amber-600 px-1">Aucun email — ajoutez-en un dans votre profil.</p>
                    )}
                  </div>

                  {/* Adresses */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Adresses postales</span>
                    </div>
                    {addressContacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <Checkbox
                          checked={selectedAddressIds.has(c.id)}
                          onCheckedChange={(v) => toggleId(setSelectedAddressIds, c.id, !!v)}
                          className="data-[state=checked]:bg-[#FC7E34] data-[state=checked]:border-[#FC7E34]"
                        />
                        <span className="text-sm font-medium flex-1">{c.value}</span>
                        {c.label && <span className="text-xs text-muted-foreground shrink-0">{c.label}</span>}
                      </label>
                    ))}
                    {addressContacts.length === 0 && (
                      <p className="text-xs text-amber-600 px-1">Aucune adresse — ajoutez-en une dans votre profil.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

            </motion.div>
          </div>

        </motion.div>
      )}
      {/* Barre d'action sticky */}
      {!loading && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-[210px] right-0 z-40 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Mode dry-run — les emails sont capturés par Mailpit, aucun email réel ne sera envoyé.
          </p>
          {selectedEmailIds.size === 0 && (
            <p className="text-sm text-destructive ml-auto self-center">
              Renseignez au moins une adresse email dans votre profil pour envoyer.
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={sending}>
              Annuler
            </Button>
            <Button
              className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2"
              onClick={handleSend}
              disabled={sending || !selectedTemplateId || selectedEmailIds.size === 0}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Envoi…' : `Envoyer ${selectedBrokers.length} demande${selectedBrokers.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

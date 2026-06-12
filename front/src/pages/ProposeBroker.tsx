import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Building2, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createBroker } from '@/lib/api'
import {
  categoryLabels, regionLabels, methodLabels, difficultyLabels,
  type Broker, type BrokerCategory, type BrokerRegion, type Difficulty, type LegalBasis,
} from '@/lib/mock-data'

// L'API n'accepte que ces 3 méthodes (l'enum backend exclut "postal").
const METHOD_VALUES: ('email' | 'form' | 'mixed')[] = ['email', 'form', 'mixed']

const legalBasisLabels: Record<LegalBasis, string> = {
  gdpr_art17: 'RGPD Art. 17 — effacement',
  gdpr_art15: 'RGPD Art. 15 — accès',
  ccpa: 'CCPA — Californie',
  pipeda: 'PIPEDA — Canada',
  other: 'Autre',
}

type FormState = {
  name: string
  emailContact: string
  website: string
  optOutUrl: string
  country: string
  notes: string
  category: BrokerCategory | ''
  region: BrokerRegion | ''
  optOutMethod: 'email' | 'form' | 'mixed' | ''
  difficulty: Difficulty | ''
  legalBasis: LegalBasis | ''
}

const EMPTY: FormState = {
  name: '', emailContact: '', website: '', optOutUrl: '', country: '', notes: '',
  category: '', region: '', optOutMethod: '', difficulty: '', legalBasis: '',
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-[#253550] mb-1.5">
      {children}{required && <span className="text-[#FC7E34]"> *</span>}
    </label>
  )
}

export default function ProposeBroker() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Broker | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const emailValid = emailRegex.test(form.emailContact.trim())
  // Erreur affichée seulement si l'utilisateur a déjà saisi quelque chose d'invalide.
  const emailError = form.emailContact.trim().length > 0 && !emailValid

  const requiredFilled =
    form.name.trim() && emailValid && form.category &&
    form.region && form.optOutMethod && form.difficulty && form.legalBasis

  const handleSubmit = async () => {
    if (!requiredFilled || sending) return
    setSending(true)
    setError(null)
    const { broker, error } = await createBroker({
      name: form.name.trim(),
      emailContact: form.emailContact.trim(),
      category: form.category as BrokerCategory,
      region: form.region as BrokerRegion,
      optOutMethod: form.optOutMethod as 'email' | 'form' | 'mixed',
      difficulty: form.difficulty as Difficulty,
      legalBasis: form.legalBasis as LegalBasis,
      website: form.website.trim() || undefined,
      optOutUrl: form.optOutUrl.trim() || undefined,
      country: form.country.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
    setSending(false)
    if (error) { setError(error); return }
    if (broker) setCreated(broker)
  }

  // ── Écran de confirmation ──────────────────────────────────────────────────
  if (created) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 350, damping: 22 }}>
          <div className="relative">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <Clock className="w-5 h-5 text-[#FC7E34] absolute -bottom-1 -right-1 bg-white rounded-full" />
          </div>
        </motion.div>
        <div className="text-center space-y-1 max-w-md">
          <p className="text-lg font-semibold text-[#253550]">« {created.name} » a bien été proposé</p>
          <p className="text-sm text-muted-foreground">
            Le broker est <span className="font-medium text-[#FC7E34]">en attente de vérification</span> par un administrateur avant d'apparaître comme vérifié dans le registre.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <Button onClick={() => navigate(`/brokers/${created.slug}`)} className="bg-[#FC7E34] hover:bg-[#e06e28] text-white">
            Voir le broker
          </Button>
          <Button variant="outline" onClick={() => { setForm(EMPTY); setCreated(null) }}>
            Proposer un autre
          </Button>
          <Button variant="ghost" onClick={() => navigate('/brokers')}>
            Retour au registre
          </Button>
        </div>
      </div>
    )
  }

  // ── Formulaire ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <Link to="/brokers" className="hover:text-foreground">Data brokers</Link>
        <span>›</span>
        <span className="text-foreground">Proposer un broker</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="w-9 h-9 shrink-0" onClick={() => navigate('/brokers')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-wide" style={{ fontFamily: "'Squada One', sans-serif", color: '#000401' }}>
            Proposer un broker
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-xl">
            Ajoutez un data broker manquant au registre. Il sera <span className="font-medium">vérifié par un administrateur</span> avant d'être marqué comme fiable.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Identité */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label required>Nom</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ex : Acme Data Inc." />
            </div>
            <div>
              <Label required>Email de contact (DPO)</Label>
              <Input
                type="email"
                value={form.emailContact}
                onChange={(e) => set('emailContact', e.target.value)}
                placeholder="privacy@acme.com"
                aria-invalid={emailError}
                className={emailError ? 'border-red-400 focus-visible:ring-red-400/40' : ''}
              />
              {emailError && <p className="text-xs text-red-600 mt-1">Format d'email invalide.</p>}
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://acme.com" />
            </div>
            <div>
              <Label>URL d'opt-out</Label>
              <Input value={form.optOutUrl} onChange={(e) => set('optOutUrl', e.target.value)} placeholder="https://acme.com/opt-out" />
            </div>
          </div>

          {/* Classification */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label required>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as BrokerCategory)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as BrokerCategory[]).map((k) => (
                    <SelectItem key={k} value={k}>{categoryLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label required>Région</Label>
              <Select value={form.region} onValueChange={(v) => set('region', v as BrokerRegion)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(regionLabels) as BrokerRegion[]).map((k) => (
                    <SelectItem key={k} value={k}>{regionLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label required>Méthode d'opt-out</Label>
              <Select value={form.optOutMethod} onValueChange={(v) => set('optOutMethod', v as 'email' | 'form' | 'mixed')}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {METHOD_VALUES.map((k) => (
                    <SelectItem key={k} value={k}>{methodLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label required>Difficulté</Label>
              <Select value={form.difficulty} onValueChange={(v) => set('difficulty', v as Difficulty)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(difficultyLabels) as Difficulty[]).map((k) => (
                    <SelectItem key={k} value={k}>{difficultyLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label required>Base légale</Label>
              <Select value={form.legalBasis} onValueChange={(v) => set('legalBasis', v as LegalBasis)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(legalBasisLabels) as LegalBasis[]).map((k) => (
                    <SelectItem key={k} value={k}>{legalBasisLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pays (code ISO)</Label>
              <Input value={form.country} maxLength={2} onChange={(e) => set('country', e.target.value.toUpperCase())} placeholder="FR" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Informations utiles pour la vérification (procédure d'opt-out, particularités…)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC7E34]/40"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Créé en attente de vérification.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/brokers')} disabled={sending}>Annuler</Button>
              <Button
                onClick={handleSubmit}
                disabled={!requiredFilled || sending}
                className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                {sending ? 'Envoi…' : 'Proposer le broker'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

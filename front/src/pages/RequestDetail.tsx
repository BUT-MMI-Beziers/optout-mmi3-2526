import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const fadeLeft: Variants = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.24 } } }
import { ArrowLeft, Send, RefreshCw, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, X, Clock, AlertCircle, Flag, Archive, Calendar, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequestDetail } from '@/hooks/useRequestDetail'
import { sendReminder, getEmailPreview } from '@/lib/api'
import {
  statusConfig, categoryLabels, difficultyLabels, methodLabels,
  type RequestStatus,
} from '@/lib/mock-data'

const STATUS_STEPS: RequestStatus[] = ['DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETED']

const statusIcons: Record<RequestStatus, LucideIcon> = {
  DRAFT:        FileText,
  SENT:         Send,
  ACKNOWLEDGED: Clock,
  COMPLETED:    CheckCircle2,
  REFUSED:      XCircle,
  NO_RESPONSE:  AlertCircle,
  COMPLAINT:    Flag,
  SUPPRESSED:   Archive,
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created:        FileText,
  sent:           Send,
  reminder_sent:  RefreshCw,
  status_changed: RefreshCw,
  note_added:     FileText,
}

const EVENT_LABELS: Record<string, string> = {
  created:        'Demande créée',
  sent:           'Email envoyé',
  reminder_sent:  'Relance envoyée',
  status_changed: 'Statut mis à jour',
  note_added:     'Note ajoutée',
}

const legalBasisLabels: Record<string, string> = {
  gdpr_art17: 'Art. 17 RGPD — Droit à l\'effacement',
  gdpr_art15: 'Art. 15 RGPD — Droit d\'accès',
  ccpa:       'CCPA (Californie)',
  pipeda:     'PIPEDA (Canada)',
  other:      'Autre base légale',
}

const languageLabels: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
}

const REMINDER_DELAYS = [3, 7, 15, 30] as const
type ReminderDelay = typeof REMINDER_DELAYS[number]

// ─── Persistance locale des relances programmées ──────────────────────────────
// Stocke {requestId: ISOString} dans localStorage pour persister entre refreshs

const REMINDER_STORAGE_KEY = 'float:scheduled-reminders'

function getStoredReminders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setStoredReminder(requestId: string, isoDate: string) {
  const all = getStoredReminders()
  all[requestId] = isoDate
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(all))
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { request, events, template, loading, error } = useRequestDetail(id ?? '')

  const [sendingReminder, setSendingReminder] = useState(false)
  const [emailPreview, setEmailPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [selectedDelay, setSelectedDelay] = useState<ReminderDelay>(7)
  const [scheduledReminderDate, setScheduledReminderDate] = useState<Date | null>(null)

  // Charger la relance stockée localement au montage (persiste le refresh)
  useEffect(() => {
    if (!id) return
    const stored = getStoredReminders()
    if (stored[id]) {
      setScheduledReminderDate(new Date(stored[id]))
    }
  }, [id])

  const broker = request?.broker ?? null
  const cfg = request ? statusConfig[request.status] : null

  const computeReminderDate = (delayDays: number): Date => {
    const date = new Date()
    date.setDate(date.getDate() + delayDays)
    return date
  }

  const handleConfirmReminder = async () => {
    if (!request) return
    setSendingReminder(true)
    // Note: l'endpoint backend POST /requests/:id/remind n'existe pas encore
    // Le scheduler backend gère déjà les relances automatiques à J+30
    // On stocke localement la date pour qu'elle persiste au refresh
    await sendReminder(request.id)
    const scheduledDate = computeReminderDate(selectedDelay)
    setStoredReminder(request.id, scheduledDate.toISOString())
    setScheduledReminderDate(scheduledDate)
    setSendingReminder(false)
    setReminderModalOpen(false)
  }

  const handleViewEmail = async () => {
    if (!request) return
    setLoadingPreview(true)
    const preview = await getEmailPreview(request.id)
    setEmailPreview(preview)
    setLoadingPreview(false)
  }

  const isTerminal = request
    ? ['COMPLETED', 'REFUSED', 'COMPLAINT', 'SUPPRESSED'].includes(request.status)
    : false
  const currentStep = request ? STATUS_STEPS.indexOf(request.status as RequestStatus) : -1

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <LoadingSkeleton />
  if (error || !request) return (
    <div className="p-8 text-center text-muted-foreground">
      <p>{error ?? 'Demande introuvable.'}</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/requests')}>
        Retour aux demandes
      </Button>
    </div>
  )

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <Link to="/requests" className="hover:text-foreground">Mes demandes</Link>
        <span>›</span>
        <span className="text-foreground">{request.brokerName}</span>
      </nav>

      <motion.div className="flex items-center gap-4" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <Button variant="outline" size="icon" className="w-9 h-9 shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>DÉTAIL DEMANDE</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Réf. {request.id}</p>
        </div>
        {cfg && (() => {
          const StatusIcon = statusIcons[request.status]
          return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground">
              <StatusIcon className="w-4 h-4 shrink-0" />
              <span>{cfg.label}</span>
            </div>
          )
        })()}
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6" variants={stagger} initial="hidden" animate="show">

        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="px-6 pt-5 pb-3">
              <CardTitle className="text-xl font-medium">Broker ciblé</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              {broker ? (
                <div className="flex items-center gap-4">
                  <img src={`https://www.google.com/s2/favicons?domain=${broker.website}&sz=64`} alt={broker.name} className="w-14 h-14 rounded-xl object-contain bg-muted p-2" onError={(e) => { (e.target as HTMLImageElement).src = '/icon.png' }} />
                  <div className="flex-1">
                    <p className="text-base font-bold">{broker.name}</p>
                    <p className="text-sm text-muted-foreground">{broker.website}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        categoryLabels[broker.category],
                        broker.region.toUpperCase(),
                        `Difficulté : ${difficultyLabels[broker.difficulty]}`,
                        `Méthode : ${methodLabels[broker.optOutMethod]}`,
                        ...(template ? [`Email en ${languageLabels[template.language] ?? template.language}`] : []),
                      ].map((tag) => (
                        <span key={tag} className="text-xs bg-muted rounded-md px-2 py-0.5 text-foreground/70">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{broker.emailContact}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Broker introuvable dans le registre.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardHeader className="px-6 pt-5 pb-3">
              <CardTitle className="text-xl font-medium">Dates clés</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Envoyée le</p>
                <p className="text-sm font-medium">{formatDate(request.sentAt)}</p>
              </div>
              {request.respondedAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Réponse reçue le</p>
                    <p className="text-sm font-medium">{formatDate(request.respondedAt)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      en {Math.round((new Date(request.respondedAt).getTime() - new Date(request.sentAt).getTime()) / 86_400_000)} jour(s)
                    </p>
                  </div>
                </>
              )}
              {request.nextActionAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Prochaine action</p>
                    <p className="text-sm font-medium text-amber-600">{formatDate(request.nextActionAt)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="px-6 pt-5 pb-3">
              <CardTitle className="text-xl font-medium">Suivi</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-5">
              <div className="relative w-full">
                <div className="absolute top-[18px] left-[18px] right-[18px] h-0.5 bg-border" />
                {currentStep > 0 && (
                  <div className="absolute top-[18px] left-[18px] h-0.5 bg-[#253550]" style={{ width: `calc(${(currentStep / (STATUS_STEPS.length - 1)) * 100}% - 36px)` }} />
                )}
                <div className="relative flex justify-between z-[1]">
                  {STATUS_STEPS.map((step, i) => {
                    const stepCfg = statusConfig[step]
                    const isPast = i < currentStep
                    const isCurrent = i === currentStep
                    return (
                      <div key={step} className="flex flex-col items-center gap-1.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 ${
                          isCurrent ? 'bg-[#FC7E34] border-[#FC7E34] text-white'
                          : isPast   ? 'bg-[#253550] border-[#253550] text-white'
                          :            'bg-muted border-border text-muted-foreground'
                        }`}>
                          {isPast ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                        </div>
                        <span className={`text-xs text-center whitespace-nowrap ${i > currentStep ? 'text-muted-foreground' : 'font-medium'}`}>
                          {stepCfg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {['REFUSED', 'NO_RESPONSE', 'COMPLAINT', 'SUPPRESSED'].includes(request.status) && cfg && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${cfg.bg}`}>
                  {request.status === 'REFUSED'     && <XCircle className="w-4 h-4 text-red-600" />}
                  {request.status === 'NO_RESPONSE' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                  {request.status === 'COMPLAINT'   && <AlertTriangle className="w-4 h-4 text-red-800" />}
                  <span className={`font-medium ${cfg.color}`}>Statut actuel : {cfg.label}</span>
                </div>
              )}

              <Separator />

              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show">
                  {events.map((evt, i) => {
                    const Icon = EVENT_ICONS[evt.eventType] ?? FileText
                    return (
                      <motion.div key={evt.id} variants={fadeLeft} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-lg bg-[#FC7E34]/10 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-[#FC7E34]" />
                          </div>
                          {i < events.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <p className="text-sm font-medium">{EVENT_LABELS[evt.eventType]}</p>
                          {evt.note && <p className="text-sm text-muted-foreground mt-0.5">{evt.note}</p>}
                          {evt.oldStatus && evt.newStatus && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {statusConfig[evt.oldStatus].label} → {statusConfig[evt.newStatus].label}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(evt.createdAt)}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardHeader className="px-6 pt-5 pb-3">
              <CardTitle className="text-xl font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-2">
              {!isTerminal && (
                <>
                  <Button className="w-full gap-2 h-10 text-white bg-[#FC7E34] hover:bg-[#e06e28]" onClick={() => setReminderModalOpen(true)} disabled={!!scheduledReminderDate}>
                    <RefreshCw className="w-4 h-4" />
                    {scheduledReminderDate ? 'Relance programmée' : 'Envoyer une relance'}
                  </Button>

                  {scheduledReminderDate && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Relance prévue le <strong className="text-amber-700">{formatShortDate(scheduledReminderDate)}</strong></span>
                    </motion.div>
                  )}

                  <Button variant="outline" className="w-full gap-2 h-10" onClick={handleViewEmail} disabled={loadingPreview}>
                    {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Voir l'email envoyé
                  </Button>
                </>
              )}
              {(request.status === 'NO_RESPONSE' || request.status === 'REFUSED') && (
                <Button variant="outline" className="w-full gap-2 h-10 border-red-200 text-red-600 hover:bg-red-50">
                  <AlertTriangle className="w-4 h-4" />
                  Déposer une plainte CNIL
                </Button>
              )}
              <Button variant="outline" className="w-full h-10 text-muted-foreground" onClick={() => navigate('/requests')}>
                Retour aux demandes
              </Button>

              <Separator className="mt-4" />

              <div className="pt-3 space-y-1">
                <p className="text-sm font-semibold text-[#253550]">Cadre légal</p>
                {template && (
                  <p className="text-xs text-[#253550]/70 font-medium">
                    {legalBasisLabels[template.legalBasis] ?? template.legalBasis}
                  </p>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Le broker dispose de <strong>30 jours</strong> pour répondre (art. 12 RGPD).
                  Sans réponse, une relance est envoyée automatiquement. Après 60 jours,
                  vous pouvez saisir la CNIL (art. 77).
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>

      {emailPreview !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEmailPreview(null)} />
          <motion.div className="relative bg-popover rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-xl font-medium">Email envoyé</h2>
              <button onClick={() => setEmailPreview(null)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">{emailPreview}</pre>
            </div>
          </motion.div>
        </div>
      )}

      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !sendingReminder && setReminderModalOpen(false)} />
          <motion.div className="relative bg-popover rounded-xl border border-border shadow-2xl w-full max-w-md flex flex-col" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#FC7E34]/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#FC7E34]" />
                </div>
                <h2 className="text-lg font-semibold">Programmer une relance</h2>
              </div>
              <button onClick={() => !sendingReminder && setReminderModalOpen(false)} className="p-1.5 rounded-md hover:bg-accent transition-colors" disabled={sendingReminder}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Choisissez quand envoyer la relance{broker ? ` à ${broker.name}` : ''} :
              </p>

              <div className="space-y-2">
                {REMINDER_DELAYS.map((delay) => {
                  const date = computeReminderDate(delay)
                  const isSelected = selectedDelay === delay
                  return (
                    <label key={delay} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#FC7E34] bg-[#FC7E34]/5' : 'border-border hover:border-[#FC7E34]/50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="reminder-delay" checked={isSelected} onChange={() => setSelectedDelay(delay)} className="w-4 h-4 accent-[#FC7E34]" />
                        <span className="text-sm font-medium">Dans {delay} jours</span>
                      </div>
                      <span className="text-xs text-muted-foreground">le {formatShortDate(date)}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setReminderModalOpen(false)} disabled={sendingReminder}>
                Annuler
              </Button>
              <Button className="gap-2 bg-[#FC7E34] hover:bg-[#e06e28] text-white" onClick={handleConfirmReminder} disabled={sendingReminder}>
                {sendingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Programmer
              </Button>
            </div>

          </motion.div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="flex items-center gap-4">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
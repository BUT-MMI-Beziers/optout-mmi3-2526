import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Send, User, Mail, MapPin, CheckCircle2, Loader2 } from 'lucide-react'
import { getMe, getContacts, getTemplates, sendBatch } from '@/lib/api'
import {
  type Broker, type User as UserType, type UserContact, type EmailTemplate,
  categoryLabels, difficultyLabels,
} from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  selectedBrokers: Broker[]
  onSuccess: () => void
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key.trim()] ?? `{{${key.trim()}}}`)
}

export default function SendRequestModal({ open, onClose, selectedBrokers, onSuccess }: Props) {
  const [user, setUser] = useState<UserType | null>(null)
  const [contacts, setContacts] = useState<UserContact[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setSent(false)
    setSending(false)
    Promise.all([getMe(), getContacts(), getTemplates()]).then(([u, c, t]) => {
      setUser(u)
      setContacts(c)
      setTemplates(t)
      const defaultTpl = t.find((tpl) => tpl.isDefault && tpl.language === 'fr') ?? t[0]
      if (defaultTpl) setSelectedTemplateId(defaultTpl.id)
      setLoading(false)
    })
  }, [open])

  const primaryEmail = contacts.find((c) => c.type === 'email' && c.isPrimary)?.value
    ?? contacts.find((c) => c.type === 'email')?.value
    ?? user?.email
    ?? ''

  const primaryAddress = contacts.find((c) => c.type === 'address' && c.isPrimary)?.value
    ?? contacts.find((c) => c.type === 'address')?.value
    ?? ''

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Prévisualise pour le premier broker sélectionné
  const previewBroker = selectedBrokers[0]
  const interpolationVars: Record<string, string> = {
    'user.first_name': user?.firstName ?? '',
    'user.last_name': user?.lastName ?? '',
    'user.email': primaryEmail,
    'user.address': primaryAddress,
    'broker.name': previewBroker?.name ?? '',
    'broker.email_contact': previewBroker?.emailContact ?? '',
    'request.date': new Date().toLocaleDateString('fr-FR'),
    'request.id': '[UUID généré à l\'envoi]',
  }

  const previewSubject = selectedTemplate
    ? interpolate(selectedTemplate.subject, interpolationVars)
    : ''
  const previewBody = selectedTemplate
    ? interpolate(selectedTemplate.body, interpolationVars)
    : ''

  const handleSend = async () => {
    if (!selectedTemplateId || selectedBrokers.length === 0) return
    setSending(true)
    await sendBatch({
      brokerIds: selectedBrokers.map((b) => b.id),
      templateId: selectedTemplateId,
    })
    setSending(false)
    setSent(true)
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium tracking-normal">Aperçu de la demande</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed tracking-normal">
            Vérifiez le contenu avant d'envoyer — les données sont pré-remplies depuis votre profil.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sent ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-base font-semibold text-green-600">
              {selectedBrokers.length} demande{selectedBrokers.length > 1 ? 's' : ''} envoyée{selectedBrokers.length > 1 ? 's' : ''} avec succès
            </p>
            <p className="text-sm text-muted-foreground">Redirection en cours…</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Brokers sélectionnés */}
            <div>
              <p className="text-sm font-medium mb-2">
                Brokers ciblés ({selectedBrokers.length})
              </p>
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
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {categoryLabels[b.category]}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {difficultyLabels[b.difficulty]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Données profil pré-remplies */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#FC7E34]" />
                Vos données (depuis votre profil)
              </p>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Identité :</span>
                  <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Email :</span>
                  <span className="font-medium truncate">{primaryEmail}</span>
                </div>
                {primaryAddress && (
                  <div className="col-span-2 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">Adresse :</span>
                    <span className="font-medium">{primaryAddress}</span>
                  </div>
                )}
              </div>
              {!primaryAddress && (
                <p className="text-xs text-amber-600 mt-1.5">
                  ⚠ Adresse manquante dans votre profil — ajoutez-la pour une demande plus complète.
                </p>
              )}
            </div>

            <Separator />

            {/* Sélecteur de template */}
            <div>
              <p className="text-sm font-medium mb-2">Template d'email</p>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                      {t.isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">(par défaut)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aperçu de l'email */}
            {selectedTemplate && previewBroker && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Aperçu — email pour {previewBroker.name}
                  {selectedBrokers.length > 1 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (+{selectedBrokers.length - 1} autre{selectedBrokers.length > 2 ? 's' : ''} avec le même contenu adapté)
                    </span>
                  )}
                </p>
                <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-3 text-sm font-mono">
                  <div className="space-y-1">
                    <p>
                      <span className="text-muted-foreground">À : </span>
                      <span className="text-[#253550] font-semibold">{previewBroker.emailContact}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Objet : </span>
                      <span className="font-semibold">{previewSubject}</span>
                    </p>
                  </div>
                  <Separator />
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-foreground">
                    {previewBody}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Mode dry-run actif — les emails seront capturés par Mailpit, aucun email réel ne sera envoyé.
              </p>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={onClose} disabled={sending}>
                  Annuler
                </Button>
                <Button
                  className="bg-[#FC7E34] hover:bg-[#e06e28] text-white gap-2"
                  onClick={handleSend}
                  disabled={sending || !selectedTemplateId}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sending ? 'Envoi…' : `Envoyer ${selectedBrokers.length} demande${selectedBrokers.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

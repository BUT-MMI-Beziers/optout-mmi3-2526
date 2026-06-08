import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Plus, Trash2, Pencil, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API = '/api/v1'

function authFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, credentials: 'include' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactType = 'email' | 'phone' | 'address'

interface Contact {
  id: string
  type: ContactType
  value: string
  isPrimary: boolean
  label: string | null
}

interface Profil {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  contacts: Contact[]
}

// ─── EditableRow ──────────────────────────────────────────────────────────────

function EditableRow({
  label,
  value,
  type = 'text',
  onSave,
}: {
  label: string
  value: string
  type?: string
  onSave?: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => {
    onSave?.(draft)
    setEditing(false)
  }
  const cancel = () => { setDraft(value); setEditing(false) }

  return (
    <div className="py-4 border-b border-border last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="
              flex-1 h-9 px-3 rounded-lg border border-[#FC7E34]
              bg-muted/40 text-sm text-foreground
              focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30
              transition-colors
            "
          />
          <button
            onClick={save}
            className="h-9 px-3 rounded-lg bg-[#FC7E34] text-white text-xs font-semibold hover:bg-[#e06e28] transition-colors whitespace-nowrap"
          >
            Sauvegarder
          </button>
          <button
            onClick={cancel}
            className="h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Annuler
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#253550]">
            {type === 'password' ? '••••••••••••' : value}
          </span>
          <button
            onClick={() => { setDraft(value); setEditing(true) }}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[#FC7E34] transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Modifier
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ContactCard ──────────────────────────────────────────────────────────────

function ContactCard({
  title,
  subtitle,
  icon: Icon,
  items,
  placeholder,
  type = 'text',
  limit,
  onAdd,
  onRemove,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  items: Contact[]
  placeholder: string
  type?: string
  limit: number
  onAdd: (value: string) => void
  onRemove: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const addItem = () => {
    if (!draft.trim()) return
    onAdd(draft.trim())
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f0eeec] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#253550]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#253550] leading-tight">
              {title} ({items.length}/{limit})
            </p>
            <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={items.length >= limit}
          className="flex items-center gap-1 text-xs font-medium text-[#253550] border border-border rounded-lg px-2.5 py-1.5 hover:border-[#FC7E34] hover:text-[#FC7E34] transition-colors whitespace-nowrap disabled:opacity-40 disabled:hover:border-border disabled:hover:text-[#253550]"
        >
          <Plus className="w-3 h-3" />
          Ajouter
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground flex-1 truncate">
              {item.value} {item.label && <span className="text-xs text-muted-foreground">({item.label})</span>}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.isPrimary && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FC7E34] text-white">
                  Principal
                </span>
              )}
              <button
                onClick={() => onRemove(item.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="
                flex-1 h-9 px-3 rounded-lg border border-[#FC7E34]
                bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30
                transition-colors
              "
            />
            <button
              onClick={addItem}
              className="h-9 px-3 rounded-lg bg-[#FC7E34] text-white text-xs font-semibold hover:bg-[#e06e28] transition-colors"
            >
              Ajouter
            </button>
            <button
              onClick={() => { setAdding(false); setDraft('') }}
              className="h-9 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Initials Avatar ──────────────────────────────────────────────────────────

function InitialsAvatar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg,rgb(255, 255, 255) 0%,rgb(255, 255, 255) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#253550',
          letterSpacing: '-0.5px',
          lineHeight: 1,
          userSelect: 'none',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {initials}
      </span>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Profile() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [contactError, setContactError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    authFetch(`${API}/users/me`)
      .then((r) => r.json())
      .then((data: Profil) => setProfil(data))
  }, [])

  async function updateField(field: 'firstName' | 'lastName', value: string) {
    if (!profil) return
    const payload = { firstName: profil.firstName, lastName: profil.lastName, [field]: value }
    const res = await authFetch(`${API}/users/me`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      setProfil(data)
    }
  }

  async function addContact(type: ContactType, value: string) {
    setContactError('')
    const res = await authFetch(`${API}/users/me/contacts`, {
      method: 'POST',
      body: JSON.stringify({ type, value, label: null }),
    })
    const data = await res.json()
    if (!res.ok) { setContactError(data.error ?? 'Erreur'); return }
    setProfil((p) => (p ? { ...p, contacts: [...p.contacts, data.contact] } : p))
  }

  async function deleteContact(id: string) {
    const res = await authFetch(`${API}/users/me/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProfil((p) => (p ? { ...p, contacts: p.contacts.filter((c) => c.id !== id) } : p))
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
    setDeleting(true)
    const res = await authFetch(`${API}/users/me`, { method: 'DELETE' })
    if (res.ok) {
      await authFetch(`${API}/auth/logout`, { method: 'POST' })
      window.location.href = '/'
    } else {
      setDeleting(false)
    }
  }

  if (!profil) return <div className="p-8">Chargement...</div>

  const emails    = profil.contacts.filter((c) => c.type === 'email')
  const addresses = profil.contacts.filter((c) => c.type === 'address')
  const phones    = profil.contacts.filter((c) => c.type === 'phone')
  const initials  = `${profil.firstName[0] ?? ''}${profil.lastName[0] ?? ''}`.toUpperCase()
  const fullName  = `${profil.firstName} ${profil.lastName}`

  return (
    <div className="min-h-screen bg-[#f5f5f4]">

      {/* ── Bannière avec avatar + nom à l'intérieur ── */}
      <div className="relative bg-[#253550] w-full" style={{ height: '180px' }}>

        {/* Bouton export */}
        <div className="absolute top-4 right-6">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter mes données
          </Button>
        </div>

        {/* Label "MON PROFIL" */}
        <p className="absolute top-5 left-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Mon profil
        </p>

        {/* Avatar + nom — alignés en bas de la bannière */}
        <div className="absolute bottom-5 left-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-white/20 overflow-hidden shadow-lg">
            <InitialsAvatar initials={initials || '?'} />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-tight">{fullName}</p>
            <p className="text-sm text-white/50">{profil.email}</p>
          </div>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Colonne gauche : Identité */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-border bg-white p-6"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Identité
            </p>
            <EditableRow label="Prénom" value={profil.firstName} onSave={(v) => updateField('firstName', v)} />
            <EditableRow label="Nom" value={profil.lastName} onSave={(v) => updateField('lastName', v)} />
            <EditableRow label="Email du compte" value={profil.email} type="email" />
          </motion.div>

          {/* Colonne droite : Cards contact */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.06 }}
            >
              <ContactCard
                title="Mes adresses email"
                subtitle="Emails à retirer des bases des data brokers"
                icon={Mail}
                placeholder="nouvelle@email.com"
                type="email"
                limit={5}
                items={emails}
                onAdd={(value) => addContact('email', value)}
                onRemove={deleteContact}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 }}
            >
              <ContactCard
                title="Mes adresses postales"
                subtitle="Adresses actuelles et passées"
                icon={MapPin}
                placeholder="12 rue de la Paix, 75001 Paris"
                limit={5}
                items={addresses}
                onAdd={(value) => addContact('address', value)}
                onRemove={deleteContact}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.18 }}
            >
              <ContactCard
                title="Mes numéros de téléphone"
                subtitle="Adresses actuelles et passées"
                icon={Phone}
                placeholder="+33 6 12 34 56 78"
                type="tel"
                limit={3}
                items={phones}
                onAdd={(value) => addContact('phone', value)}
                onRemove={deleteContact}
              />
            </motion.div>

            {contactError && <p className="text-sm text-red-600 px-1">{contactError}</p>}
          </div>

        </div>

        {/* Supprimer le compte */}
        <div className="mt-5 rounded-xl border border-border bg-white p-6">
          <h2 className="font-semibold mb-2 text-red-600">Zone dangereuse</h2>
          <p className="text-sm text-muted-foreground mb-3">
            La suppression de votre compte est définitive et irréversible.
          </p>
          <button
            onClick={deleteAccount}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? '...' : 'Supprimer mon compte'}
          </button>
        </div>
      </div>
    </div>
  )
}

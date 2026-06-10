import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Plus, Trash2, Pencil, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API = '/api/v1'

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const opts: RequestInit = {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...((options as any).headers ?? {}) },
  }
  let res = await fetch(url, opts)
  if (res.status === 401) {
    const refresh = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
    if (!refresh.ok) { window.location.href = '/login'; return res }
    res = await fetch(url, opts)
  }
  return res
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

// ─── FieldStatus ──────────────────────────────────────────────────────────────
// Petit composant réutilisable : étoile rouge si obligatoire, "(Optionnel)" gris sinon

function FieldStatus({ required }: { required: boolean }) {
  if (required) {
    return <span className="ml-1 text-red-500 font-bold" title="Champ obligatoire">*</span>
  }
  return <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">(Optionnel)</span>
}

// ─── EditableRow ──────────────────────────────────────────────────────────────

function EditableRow({ label, value, type = 'text', required = false, onSave }: {
  label: string
  value: string
  type?: string
  required?: boolean
  onSave?: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const save = () => { onSave?.(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }

  return (
    <div className="py-4 border-b border-border last:border-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
        <FieldStatus required={required} />
      </p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input type={type} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus className="flex-1 h-9 px-3 rounded-lg border border-[#FC7E34] bg-muted/40 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 transition-colors" />
          <button onClick={save} className="h-9 px-3 rounded-lg bg-[#FC7E34] text-white text-sm font-semibold hover:bg-[#e06e28] transition-colors whitespace-nowrap">Sauvegarder</button>
          <button onClick={cancel} className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-base font-medium text-[#253550]">
            {type === 'password' ? '••••••••••••' : value}
          </span>
          <button onClick={() => { setDraft(value); setEditing(true) }} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#FC7E34] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ContactCard ──────────────────────────────────────────────────────────────

function ContactCard({ title, subtitle, icon: Icon, items, placeholder, type = 'text', pattern, limit, minItems = 0, required = false, onAdd, onRemove }: {
  title: string
  subtitle: string
  icon: React.ElementType
  items: Contact[]
  placeholder: string
  type?: string
  pattern?: string
  limit: number
  minItems?: number
  required?: boolean
  onAdd: (value: string) => void
  onRemove: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [inputError, setInputError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addItem = () => {
    if (!draft.trim()) return
    if (inputRef.current && !inputRef.current.checkValidity()) {
      const msg = type === 'email'
        ? 'Adresse email invalide'
        : type === 'tel'
        ? 'Numéro invalide (ex : +33 6 12 34 56 78)'
        : 'Valeur invalide'
      setInputError(msg)
      return
    }
    setInputError('')
    onAdd(draft.trim())
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#253550]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#253550] leading-tight inline-flex items-baseline">
              <span>
                {title} <span className="text-sm font-normal text-muted-foreground">({items.length}/{limit})</span>
              </span>
              <FieldStatus required={required} />
            </p>
            <p className="text-sm text-muted-foreground leading-tight">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={items.length >= limit}
          className="flex items-center gap-1.5 text-sm font-medium text-[#253550] border border-border rounded-lg px-3 py-1.5 hover:border-[#FC7E34] hover:text-[#FC7E34] transition-colors whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground flex-1 truncate">
              {item.value}
              {item.label && <span className="text-xs text-muted-foreground ml-1">({item.label})</span>}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {item.isPrimary && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FC7E34] text-white">
                  Principal
                </span>
              )}
              <button
                onClick={() => onRemove(item.id)}
                disabled={items.length <= minItems}
                title={items.length <= minItems ? `Minimum ${minItems} requis` : 'Supprimer'}
                className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {adding && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type={type}
                pattern={pattern}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setInputError('') }}
                placeholder={placeholder}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className="flex-1 h-9 px-3 rounded-lg border border-[#FC7E34] bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 transition-colors"
              />
              <button onClick={addItem} className="h-9 px-3 rounded-lg bg-[#FC7E34] text-white text-sm font-semibold hover:bg-[#e06e28] transition-colors">
                Ajouter
              </button>
              <button onClick={() => { setAdding(false); setDraft(''); setInputError('') }} className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Annuler
              </button>
            </div>
            {inputError && <p className="text-xs text-red-500 px-1">{inputError}</p>}
          </div>
        )}
      </div>
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
    const res = await authFetch(`${API}/users/me`, { method: 'PUT', body: JSON.stringify(payload) })
    if (res.ok) setProfil(await res.json())
  }

  async function addContact(type: ContactType, value: string) {
    setContactError('')
    const normalized = value.trim().toLowerCase()
    const alreadyExists = profil!.contacts.some(
      (c) => c.type === type && c.value.trim().toLowerCase() === normalized
    )
    if (alreadyExists) { setContactError('Cette valeur est déjà enregistrée.'); return }

    const res = await authFetch(`${API}/users/me/contacts`, {
      method: 'POST',
      body: JSON.stringify({ type, value, label: null }),
    })
    const data = await res.json()
    if (!res.ok) { setContactError(data.error ?? 'Erreur'); return }
    setProfil((p) => (p ? { ...p, contacts: [...p.contacts, data] } : p))
  }

  async function deleteContact(id: string) {
    const res = await authFetch(`${API}/users/me/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) setProfil((p) => (p ? { ...p, contacts: p.contacts.filter((c) => c.id !== id) } : p))
  }

  async function exportData() {
    const res = await authFetch(`${API}/users/me/export`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `float-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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

  if (!profil) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Chargement du profil…</p>
      </div>
    )
  }

  const emails    = profil.contacts.filter((c) => c.type === 'email')
  const addresses = profil.contacts.filter((c) => c.type === 'address')
  const phones    = profil.contacts.filter((c) => c.type === 'phone')
  const initials  = `${profil.firstName[0] ?? ''}${profil.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Mon profil</span>
      </nav>

      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
          MON PROFIL
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez vos informations personnelles et vos contacts utilisés dans les demandes RGPD.
        </p>
      </div>

      {/* Bannière */}
      <div className="relative rounded-2xl bg-[#253550] overflow-hidden" style={{ height: '160px' }}>
        <Button onClick={exportData} variant="ghost" size="sm" className="absolute top-4 right-4 h-9 gap-2 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 text-sm font-medium">
          <Download className="w-4 h-4" />
          Exporter mes données
        </Button>


        <div className="absolute bottom-5 left-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-white/20 bg-white/10 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">{initials || '?'}</span>
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">{profil.firstName} {profil.lastName}</p>
            <p className="text-sm text-white/60">{profil.email}</p>
          </div>
        </div>
      </div>

      {/* Grille identité + contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Identité */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Identité
          </p>
          <EditableRow label="Prénom" value={profil.firstName} required onSave={(v) => updateField('firstName', v)} />
          <EditableRow label="Nom" value={profil.lastName} required onSave={(v) => updateField('lastName', v)} />
          <EditableRow label="Email du compte" value={profil.email} type="email" required />
        </motion.div>

        {/* Contacts */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
            <ContactCard
              title="Adresses email" subtitle="Emails à retirer des bases des data brokers"
              icon={Mail} placeholder="nouvelle@email.com" type="email"
              limit={5} minItems={1} required items={emails}
              onAdd={(v) => addContact('email', v)} onRemove={deleteContact}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
            <ContactCard
              title="Adresses postales" subtitle="Adresses actuelles et passées"
              icon={MapPin} placeholder="12 rue de la Paix, 75001 Paris"
              limit={5} minItems={1} items={addresses}
              onAdd={(v) => addContact('address', v)} onRemove={deleteContact}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
            <ContactCard
              title="Numéros de téléphone" subtitle="Numéros actuels et passés"
              icon={Phone} placeholder="+33 6 12 34 56 78" type="tel" pattern="^\+?[0-9\s\-\(\)]{7,20}$"
              limit={3} items={phones}
              onAdd={(v) => addContact('phone', v)} onRemove={deleteContact}
            />
          </motion.div>

          {contactError && <p className="text-sm text-red-600 px-1">{contactError}</p>}
        </div>

      </div>

      {/* Légende des champs obligatoires (en bas) */}
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
        <span className="text-red-500 font-bold">*</span>
        <span>Les champs marqués d'un astérisque sont obligatoires pour envoyer des demandes RGPD.</span>
      </p>

      {/* Zone dangereuse */}
      <div className="rounded-xl border border-red-200 bg-card p-6">
        <h2 className="text-base font-semibold text-red-600 mb-1">Zone dangereuse</h2>
        <p className="text-sm text-muted-foreground mb-4">
          La suppression de votre compte est définitive et irréversible. Toutes vos demandes seront perdues.
        </p>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Suppression…' : 'Supprimer mon compte'}
        </button>
      </div>

    </div>
  )
}
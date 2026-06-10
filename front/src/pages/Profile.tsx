import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Plus, Trash2, Pencil, Download, Eye, EyeOff, Fingerprint, Monitor, Smartphone, Globe, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'
import { startRegistration } from '@simplewebauthn/browser'
import { getSessions, revokeSession, revokeOtherSessions, type ActiveSession } from '@/lib/api'

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

function DeviceIcon({ device }: { device: string }) {
  if (device.includes('iPhone') || device.includes('iOS')) return <Smartphone className="w-4 h-4 text-muted-foreground" />
  if (device.includes('Windows') || device.includes('Firefox')) return <Globe className="w-4 h-4 text-muted-foreground" />
  return <Monitor className="w-4 h-4 text-muted-foreground" />
}

export default function Profile() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState<Profil | null>(null)
  const [contactError, setContactError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [twoFaActive, setTwoFaActive] = useState(false)
  const [totpStep, setTotpStep] = useState<'idle' | 'setup' | 'verify' | 'deactivate'>('idle')
  const [totpUri, setTotpUri] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)

  interface PasskeyItem { id: string; name: string | null; deviceType: string | null; backedUp: boolean; createdAt: string; lastUsedAt: string | null }
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyError, setPasskeyError] = useState('')
  const [addingPasskey, setAddingPasskey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [confirmDeletePasskeyId, setConfirmDeletePasskeyId] = useState<string | null>(null)

  const [changingPwd, setChangingPwd] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const [sessions, setSessions] = useState<ActiveSession[]>([])

  async function startTotpSetup() {
    setTotpError(''); setTotpLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp/setup', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { setTotpError(data.error ?? 'Erreur'); return }
      setTotpUri(data.uri); setTotpSecret(data.secret); setTotpStep('setup')
    } finally { setTotpLoading(false) }
  }

  async function activateTotp() {
    setTotpError(''); setTotpLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp/activate', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: totpSecret, code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setTotpError(data.error ?? 'Code incorrect'); return }
      setTwoFaActive(true); setTotpStep('idle'); setTotpCode('')
    } finally { setTotpLoading(false) }
  }

  async function deactivateTotp() {
    setTotpError(''); setTotpLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setTotpError(data.error ?? 'Code incorrect'); return }
      setTwoFaActive(false); setTotpStep('idle'); setTotpCode('')
    } finally { setTotpLoading(false) }
  }

  async function loadPasskeys() {
    const res = await fetch('/api/v1/auth/passkeys', { credentials: 'include' })
    if (res.ok) setPasskeys(await res.json())
  }

  async function handleRegisterPasskey() {
    setPasskeyError(''); setPasskeyLoading(true)
    try {
      const optsRes = await fetch('/api/v1/auth/passkey/register/start', { credentials: 'include' })
      if (!optsRes.ok) { setPasskeyError("Impossible de démarrer l'enregistrement"); return }
      const opts = await optsRes.json()
      let reg
      try { reg = await startRegistration({ optionsJSON: opts }) }
      catch { setPasskeyError('Enregistrement annulé ou non disponible'); return }
      const finishRes = await fetch('/api/v1/auth/passkey/register/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...reg, _keyName: newKeyName || undefined }),
      })
      const finishData = await finishRes.json()
      if (!finishRes.ok) { setPasskeyError(finishData.error ?? 'Enregistrement échoué'); return }
      setAddingPasskey(false); setNewKeyName(''); await loadPasskeys()
    } catch { setPasskeyError("Erreur lors de l'enregistrement") }
    finally { setPasskeyLoading(false) }
  }

  async function handleDeletePasskey(id: string) {
    const res = await fetch(`/api/v1/auth/passkeys/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { setPasskeys((prev) => prev.filter((k) => k.id !== id)); setConfirmDeletePasskeyId(null) }
  }

  async function handleChangePassword() {
    setPwdError(''); setPwdLoading(true)
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) { setPwdError(data.error ?? 'Erreur'); return }
      navigate('/login')
    } catch { setPwdError('Impossible de contacter le serveur') }
    finally { setPwdLoading(false) }
  }

  useEffect(() => {
    authFetch(`${API}/users/me`)
      .then((r) => r.json())
      .then((data: Profil & { totpEnabled?: boolean }) => {
        setProfil(data)
        if (data.totpEnabled) setTwoFaActive(true)
        getSessions().then(setSessions)
        loadPasskeys()
      })
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
        <span className="text-foreground">Mon compte</span>
      </nav>

      {/* Titre */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
          MON COMPTE
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez vos informations personnelles, vos contacts et la sécurité de votre compte.
        </p>
      </div>

      {/* Bannière */}
      <div className="relative rounded-2xl bg-[#253550] overflow-hidden" style={{ height: '160px' }}>
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

      {/* Identité + Contacts côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-2xl border border-border bg-white overflow-hidden">
          <div className="flex items-center px-8 py-5 border-b border-border">
            <User className="w-3.5 h-3.5 text-[#FC7E34]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FC7E34] ml-2">Identité</span>
          </div>
          <div className="px-8 py-6 flex flex-col gap-0">
            <EditableRow label="Prénom" value={profil.firstName} required onSave={(v) => updateField('firstName', v)} />
            <EditableRow label="Nom" value={profil.lastName} required onSave={(v) => updateField('lastName', v)} />
            <EditableRow label="Email du compte" value={profil.email} type="email" required />
            <div className="py-4 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Rôle</p>
              <span className="text-base font-medium text-[#253550]">
                {profil.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </span>
            </div>
            <div className="pt-5">
              <Button onClick={exportData} variant="outline" size="sm" className="gap-2 text-sm font-medium">
                <Download className="w-4 h-4" />
                Exporter mes données
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }} className="rounded-2xl border border-border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-8 py-5 border-b border-border">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#FC7E34]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#FC7E34]">Contacts RGPD</span>
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="text-red-500 font-bold">*</span> obligatoires
            </span>
          </div>
          <div className="px-8 py-6 space-y-4">
            <ContactCard
              title="Adresses email" subtitle="Emails à retirer des bases des data brokers"
              icon={Mail} placeholder="nouvelle@email.com" type="email"
              limit={5} minItems={1} required items={emails}
              onAdd={(v) => addContact('email', v)} onRemove={deleteContact}
            />
            <ContactCard
              title="Adresses postales" subtitle="Adresses actuelles et passées"
              icon={MapPin} placeholder="12 rue de la Paix, 75001 Paris"
              limit={5} minItems={1} items={addresses}
              onAdd={(v) => addContact('address', v)} onRemove={deleteContact}
            />
            <ContactCard
              title="Numéros de téléphone" subtitle="Numéros actuels et passés"
              icon={Phone} placeholder="+33 6 12 34 56 78" type="tel" pattern="^\+?[0-9\s\-\(\)]{7,20}$"
              limit={3} items={phones}
              onAdd={(v) => addContact('phone', v)} onRemove={deleteContact}
            />
            {contactError && <p className="text-sm text-red-600 px-1">{contactError}</p>}
          </div>
        </motion.div>
      </div>

      {/* Section sécurité */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }} className="rounded-2xl border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between px-8 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#FC7E34]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#FC7E34]">Sécurité</span>
          </div>
          <span className={`text-[11px] font-semibold rounded-full px-3 py-1 border ${twoFaActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-orange-500 bg-orange-50 border-orange-200'}`}>
            ● {twoFaActive ? '2FA activée' : '2FA non activée'}
          </span>
        </div>
        <div className="px-8 py-7">
          <h2 className="text-xl font-semibold tracking-tight text-[#253550] mb-2">Protégez votre compte</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
            Mot de passe, double authentification et sessions actives. Activez la 2FA pour un score de sécurité maximal.
          </p>

          <div className="grid grid-cols-3 gap-5 mb-10">
            {/* Mot de passe */}
            <div className="rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5"><span className="text-lg">🔒</span><span className="text-sm font-semibold text-[#253550]">Mot de passe</span></div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">● Fort</span>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">Dernière modification il y a 47 jours. Nous recommandons un renouvellement tous les 90 jours.</p>
              {!changingPwd ? (
                <>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 mb-4 border border-border">
                    <span className="text-xs text-muted-foreground tracking-widest">••••••••••••••</span>
                  </div>
                  <button onClick={() => setChangingPwd(true)} className="w-full h-10 rounded-lg border border-border text-xs font-medium text-[#253550] hover:border-[#253550] transition-colors">Modifier le mot de passe</button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="Mot de passe actuel" className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                  </div>
                  <div className="relative">
                    <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                  </div>
                  {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleChangePassword} disabled={pwdLoading || !currentPwd || !newPwd} className="flex-1 h-9 rounded-lg bg-[#FC7E34] text-white text-xs font-semibold hover:bg-[#e06e28] transition-colors disabled:opacity-50">{pwdLoading ? 'Enregistrement…' : 'Confirmer'}</button>
                    <button onClick={() => { setChangingPwd(false); setCurrentPwd(''); setNewPwd(''); setPwdError('') }} className="flex-1 h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
                  </div>
                </div>
              )}
            </div>

            {/* 2FA TOTP */}
            <div className={`rounded-xl border-2 p-6 ${twoFaActive ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#FC7E34]/40 bg-[#FC7E34]/3'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5"><span className="text-lg">📱</span><span className="text-sm font-semibold text-[#253550]">2FA TOTP</span></div>
                <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border ${twoFaActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-orange-500 bg-orange-50 border-orange-200'}`}>● {twoFaActive ? 'Actif' : 'Inactif'}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">Ajoutez une seconde couche de sécurité avec une application d'authentification (Google Authenticator, Authy…).</p>
              <div className="bg-white/80 rounded-lg px-4 py-2.5 mb-4 border border-dashed border-gray-200">
                <span className="text-[10px] text-muted-foreground font-mono">Compatible : Authy · 1Password · Google Auth</span>
              </div>
              {totpStep === 'idle' && (
                <button onClick={twoFaActive ? () => setTotpStep('deactivate') : startTotpSetup} disabled={totpLoading} className={`w-full h-10 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${twoFaActive ? 'bg-gray-100 text-gray-500 border border-border hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'bg-[#FC7E34] text-white hover:bg-[#e06e28]'}`}>
                  {twoFaActive ? 'Désactiver la 2FA' : 'Activer la 2FA'}
                </button>
              )}
              {totpStep === 'setup' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Scannez ce QR avec votre app d'authentification, ou entrez le code manuellement.</p>
                  <div className="flex justify-center p-3 bg-white border border-border rounded-lg"><QRCodeSVG value={totpUri} size={160} /></div>
                  <div className="bg-gray-50 border border-dashed border-border rounded-lg px-3 py-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Code manuel</p>
                    <p className="font-mono text-xs text-[#253550] tracking-widest break-all select-all">{totpSecret}</p>
                  </div>
                  <button onClick={() => setTotpStep('verify')} className="w-full h-9 rounded-lg bg-[#FC7E34] text-white text-xs font-bold hover:bg-[#e06e28] transition-colors">J'ai scanné → Vérifier</button>
                  <button onClick={() => setTotpStep('idle')} className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                </div>
              )}
              {totpStep === 'verify' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Entrez le code à 6 chiffres généré par votre application.</p>
                  <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="000 000" className="w-full h-11 text-center text-xl font-mono tracking-widest rounded-lg border border-[#FC7E34] bg-muted/40 focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30" />
                  {totpError && <p className="text-xs text-red-500">{totpError}</p>}
                  <button onClick={activateTotp} disabled={totpLoading || totpCode.length < 6} className="w-full h-10 rounded-lg bg-[#FC7E34] text-white text-xs font-bold hover:bg-[#e06e28] transition-colors disabled:opacity-50">{totpLoading ? 'Vérification…' : 'Confirmer et activer'}</button>
                  <button onClick={() => { setTotpStep('setup'); setTotpCode(''); setTotpError('') }} className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">← Retour au QR</button>
                </div>
              )}
              {totpStep === 'deactivate' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Entrez votre code TOTP actuel pour désactiver la 2FA.</p>
                  <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="000 000" className="w-full h-11 text-center text-xl font-mono tracking-widest rounded-lg border border-red-300 bg-muted/40 focus:outline-none focus:ring-2 focus:ring-red-200" />
                  {totpError && <p className="text-xs text-red-500">{totpError}</p>}
                  <button onClick={deactivateTotp} disabled={totpLoading || totpCode.length < 6} className="w-full h-10 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50">{totpLoading ? 'Désactivation…' : 'Désactiver la 2FA'}</button>
                  <button onClick={() => { setTotpStep('idle'); setTotpCode(''); setTotpError('') }} className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                </div>
              )}
            </div>

            {/* Passkeys */}
            <div className="rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5"><span className="text-lg">🔑</span><span className="text-sm font-semibold text-[#253550]">Passkeys</span></div>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">● {passkeys.length} clé{passkeys.length !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">Connexion sans mot de passe via Face ID, Touch ID ou clé USB. Plus rapide et plus sécurisé.</p>
              {passkeys.length > 0 && (
                <div className="mb-3 space-y-0">
                  {passkeys.map((key, i) => (
                    <div key={key.id} className={`py-2.5 ${i < passkeys.length - 1 ? 'border-b border-border' : ''}`}>
                      {confirmDeletePasskeyId === key.id ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-red-500 flex-1">Supprimer cette clé ?</p>
                          <button onClick={() => handleDeletePasskey(key.id)} className="h-7 px-2.5 rounded-md bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors">Supprimer</button>
                          <button onClick={() => setConfirmDeletePasskeyId(null)} className="h-7 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <Fingerprint className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#253550] truncate">{key.name ?? 'Clé de sécurité'}</p>
                            {key.lastUsedAt && <p className="text-[10px] text-muted-foreground">{new Date(key.lastUsedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>}
                          </div>
                          {key.backedUp && (
                            <span title="Sauvegardée dans un trousseau cloud (iCloud, Google…) — disponible sur tous vos appareils" className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 shrink-0 cursor-help">☁ Cloud</span>
                          )}
                          <button onClick={() => setConfirmDeletePasskeyId(key.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!addingPasskey ? (
                <button onClick={() => setAddingPasskey(true)} className="w-full h-10 rounded-lg border border-dashed border-[#FC7E34]/50 text-[#FC7E34] text-xs font-bold hover:bg-[#FC7E34]/5 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Ajouter une passkey
                </button>
              ) : (
                <div className="space-y-2.5">
                  <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Nom (ex: MacBook Touch ID)" className="w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
                  {passkeyError && <p className="text-xs text-red-500">{passkeyError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleRegisterPasskey} disabled={passkeyLoading} className="flex-1 h-9 rounded-lg bg-[#FC7E34] text-white text-xs font-bold hover:bg-[#e06e28] transition-colors disabled:opacity-50">{passkeyLoading ? 'En cours...' : 'Enregistrer'}</button>
                    <button onClick={() => { setAddingPasskey(false); setNewKeyName(''); setPasskeyError('') }} className="flex-1 h-9 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sessions actives */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#253550]">Sessions actives</span>
              <span className="text-[11px] font-bold text-muted-foreground">· {sessions.length}</span>
            </div>
            <div className="space-y-0">
              {sessions.length === 0 && <p className="text-sm text-muted-foreground py-4">Aucune session active.</p>}
              {sessions.map((session, i) => (
                <div key={session.id} className={`flex items-center gap-5 py-4 ${i < sessions.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <DeviceIcon device={session.device ?? ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <span className="text-sm font-semibold text-[#253550]">{session.device ?? 'Appareil inconnu'}</span>
                      {session.current && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">● Session actuelle</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{session.ip ?? 'IP inconnue'}{session.location ? ` · ${session.location}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[100px]">
                    <p className="text-xs font-semibold text-[#253550]">{session.current ? 'Maintenant' : new Date(session.lastSeenAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {!session.current && (
                    <button onClick={async () => { await revokeSession(session.id); setSessions((prev) => prev.filter((s) => s.id !== session.id)) }} className="h-9 px-4 rounded-lg border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">Révoquer</button>
                  )}
                </div>
              ))}
            </div>
            {sessions.length > 1 && (
              <div className="flex justify-end mt-5">
                <button onClick={async () => { await revokeOtherSessions(); setSessions((prev) => prev.filter((s) => s.current)) }} className="h-9 px-5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors">
                  Déconnecter toutes les autres sessions
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

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
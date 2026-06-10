import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, RefreshCw, Shield, Monitor, Smartphone, Globe, Eye, EyeOff, Fingerprint, Trash2, Plus } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { startRegistration } from '@simplewebauthn/browser'
import { getSessions, revokeSession, revokeOtherSessions, type ActiveSession } from '@/lib/api'

interface NotificationItem {
  id: string
  title: string
  description: string
  active: boolean
  recommended?: boolean
}

interface Session {
  id: string
  device: string
  location: string
  ip: string
  time: string
  subtime?: string
  current?: boolean
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-[#FC7E34]' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function SliderControl({ label, sublabel, value, min, max, unit, onChange }: {
  label: string; sublabel: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="rounded-xl border border-border bg-[#fafafa] p-6 flex-1 min-w-0">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FC7E34]">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      </div>
      <div className="flex items-baseline gap-1.5 mb-5">
        <span className="text-5xl font-black text-[#253550] leading-none">{value}</span>
        <span className="text-sm text-muted-foreground font-medium">{unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-[#FC7E34] hover:border-[#FC7E34] transition-colors text-sm font-bold">−</button>
        <div className="flex-1 relative h-2 bg-gray-200 rounded-full">
          <div className="absolute left-0 top-0 h-full bg-[#FC7E34] rounded-full transition-all" style={{ width: `${pct}%` }} />
          <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-[#FC7E34] hover:border-[#FC7E34] transition-colors text-sm font-bold">+</button>
      </div>
    </div>
  )
}

function SectionHeader({ num, icon: Icon, label, right }: {
  num: string; icon: React.ElementType; label: string; right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-border">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-muted-foreground/50 bg-gray-100 rounded-md px-2 py-0.5">{num}</span>
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-[#FC7E34]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#FC7E34]">{label}</span>
        </div>
      </div>
      {right}
    </div>
  )
}

function DeviceIcon({ device }: { device: string }) {
  if (device.includes('iPhone') || device.includes('iOS')) return <Smartphone className="w-4 h-4 text-muted-foreground" />
  if (device.includes('Windows') || device.includes('Firefox')) return <Globe className="w-4 h-4 text-muted-foreground" />
  return <Monitor className="w-4 h-4 text-muted-foreground" />
}

export default function Settings() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 'confirmation', title: 'Confirmation', description: 'Un broker confirme la prise en compte de votre demande de suppression.', active: true },
    { id: 'relance', title: 'Relance due', description: "FLOAT s'apprête à relancer un broker qui n'a pas répondu dans le délai imparti.", active: true, recommended: true },
    { id: 'campagne', title: 'Campagne terminée', description: "Toutes les demandes d'une campagne sont closes (acceptées, refusées ou expirées).", active: true },
    { id: 'refus', title: 'Refus', description: 'Un broker rejette votre demande — vous recevrez la raison et les options possibles.', active: true },
  ])

  const [relancesActive, setRelancesActive] = useState(true)
  const [delaiPremiere, setDelaiPremiere] = useState(14)
  const [intervalle, setIntervalle] = useState(7)
  const [maxRelances, setMaxRelances] = useState(3)
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

  async function startTotpSetup() {
    setTotpError('')
    setTotpLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp/setup', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { setTotpError(data.error ?? 'Erreur'); return }
      setTotpUri(data.uri)
      setTotpSecret(data.secret)
      setTotpStep('setup')
    } finally {
      setTotpLoading(false)
    }
  }

  async function activateTotp() {
    setTotpError('')
    setTotpLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp/activate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: totpSecret, code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setTotpError(data.error ?? 'Code incorrect'); return }
      setTwoFaActive(true)
      setTotpStep('idle')
      setTotpCode('')
    } finally {
      setTotpLoading(false)
    }
  }

  async function deactivateTotp() {
    setTotpError('')
    setTotpLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setTotpError(data.error ?? 'Code incorrect'); return }
      setTwoFaActive(false)
      setTotpStep('idle')
      setTotpCode('')
    } finally {
      setTotpLoading(false)
    }
  }

  async function loadPasskeys() {
    const res = await fetch('/api/v1/auth/passkeys', { credentials: 'include' })
    if (res.ok) setPasskeys(await res.json())
  }

  async function handleRegisterPasskey() {
    setPasskeyError('')
    setPasskeyLoading(true)
    try {
      const optsRes = await fetch('/api/v1/auth/passkey/register/start', { credentials: 'include' })
      if (!optsRes.ok) { setPasskeyError('Impossible de démarrer l\'enregistrement'); return }
      const opts = await optsRes.json()

      let reg
      try {
        reg = await startRegistration({ optionsJSON: opts })
      } catch {
        setPasskeyError('Enregistrement annulé ou non disponible')
        return
      }

      const finishRes = await fetch('/api/v1/auth/passkey/register/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...reg, _keyName: newKeyName || undefined }),
      })
      const finishData = await finishRes.json()
      if (!finishRes.ok) { setPasskeyError(finishData.error ?? 'Enregistrement échoué'); return }
      setAddingPasskey(false)
      setNewKeyName('')
      await loadPasskeys()
    } catch {
      setPasskeyError('Erreur lors de l\'enregistrement')
    } finally {
      setPasskeyLoading(false)
    }
  }

  async function handleDeletePasskey(id: string) {
    const res = await fetch(`/api/v1/auth/passkeys/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) {
      setPasskeys((prev) => prev.filter((k) => k.id !== id))
      setConfirmDeletePasskeyId(null)
    }
  }

  async function handleChangePassword() {
    setPwdError('')
    setPwdLoading(true)
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) { setPwdError(data.error ?? 'Erreur'); return }
      navigate('/login')
    } catch {
      setPwdError('Impossible de contacter le serveur')
    } finally {
      setPwdLoading(false)
    }
  }

  const [sessions, setSessions] = useState<ActiveSession[]>([])

  useEffect(() => {
    getSessions().then(setSessions)
    fetch('/api/v1/users/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.totpEnabled) setTwoFaActive(true) })
      .catch(() => {})
    loadPasskeys()
  }, [])

  const toggleNotif = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, active: !n.active } : n)))

  async function handleRevokeSession(id: string) {
    await revokeSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleRevokeAll() {
    await revokeOtherSessions()
    setSessions((prev) => prev.filter((s) => s.current))
  }
  const activeCount = notifications.filter((n) => n.active).length

  const calendarRows = [
    { day: 'J+0', label: 'Envoi de la demande initiale au broker' },
    { day: `J+${delaiPremiere}`, label: 'Relance courtoise (template « Relance courtoise »)' },
    { day: `J+${delaiPremiere + intervalle}`, label: 'Ton plus ferme, mention CCPA/RGPD' },
    { day: `J+${delaiPremiere + intervalle * 2}`, label: maxRelances >= 3 ? '3ème et dernière relance — escalade vers signalement CNIL' : 'Dernière relance' },
  ].slice(0, maxRelances + 1)

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
          <nav className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
            <span className="text-[#253550] font-medium hover:text-foreground cursor-pointer">FLOAT</span>
            <span>›</span>
            <span className="text-foreground">Paramètres</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>PARAMÈTRES</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Configurez vos notifications, vos relances automatiques et votre sécurité. Les modifications sont enregistrées dès qu'elles sont confirmées.
          </p>
        </motion.div>

        {/* ── Section 01 : Notifications ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="rounded-2xl border border-border bg-white overflow-hidden mb-5">
          <SectionHeader
            num="01" icon={Bell} label="Notifications"
            right={
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                ● {activeCount} / {notifications.length} actifs
              </span>
            }
          />
          <div>
            {notifications.map((notif, i) => (
              <div key={notif.id} className={`flex items-center gap-5 px-8 py-5 ${i < notifications.length - 1 ? 'border-b border-border' : ''} hover:bg-gray-50/60 transition-colors`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-sm font-semibold text-[#253550]">{notif.title}</span>
                    {notif.recommended && (
                      <span className="text-[10px] font-semibold text-[#FC7E34] border border-[#FC7E34]/30 bg-[#FC7E34]/5 rounded-full px-2.5 py-0.5">● Recommandé</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{notif.description}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border ${notif.active ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-gray-400 bg-gray-100 border-gray-200'}`}>
                    ● {notif.active ? 'Actif' : 'Inactif'}
                  </span>
                  <Toggle checked={notif.active} onChange={() => toggleNotif(notif.id)} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Section 02 : Relances automatiques ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-2xl border border-border bg-white overflow-hidden mb-5">
          <SectionHeader
            num="02" icon={RefreshCw} label="Relances automatiques"
            right={
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">Activer les relances</span>
                <Toggle checked={relancesActive} onChange={setRelancesActive} />
              </div>
            }
          />
          <div className="px-8 py-7">
            <h2 className="text-xl font-semibold tracking-tight text-[#253550] mb-2">Tenir la pression, sans y penser</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              FLOAT relance automatiquement les brokers qui n'ont pas répondu. Ajustez le rythme à votre stratégie.
            </p>
            <div className={`flex gap-5 transition-opacity duration-300 mb-8 ${relancesActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <SliderControl label="Délai 1ère relance" sublabel="J+" value={delaiPremiere} min={1} max={30} unit="jours" onChange={setDelaiPremiere} />
              <SliderControl label="Intervalle" sublabel="entre relances" value={intervalle} min={1} max={30} unit="jours" onChange={setIntervalle} />
              <SliderControl label="Max relances" sublabel="par broker" value={maxRelances} min={1} max={10} unit="essais" onChange={setMaxRelances} />
            </div>

            {/* Calendrier */}
            <div className={`rounded-xl border border-dashed border-[#FC7E34]/40 overflow-hidden transition-opacity duration-300 ${relancesActive ? 'opacity-100' : 'opacity-40'}`}>
              <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-dashed border-[#FC7E34]/30 bg-[#FC7E34]/3">
                <div className="w-4 h-0.5 bg-[#FC7E34]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FC7E34]">Aperçu du calendrier de relance</span>
              </div>
              {calendarRows.map((row, i) => (
                <div key={i} className={`flex items-center gap-8 px-6 py-3 ${i < calendarRows.length - 1 ? 'border-b border-border/60' : ''}`}>
                  <span className="text-xs font-bold text-[#253550] w-12 flex-shrink-0 font-mono">{row.day}</span>
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Section 03 : Sécurité ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="rounded-2xl border border-border bg-white overflow-hidden">
          <SectionHeader
            num="03" icon={Shield} label="Sécurité"
            right={
              <span className={`text-[11px] font-semibold rounded-full px-3 py-1 border ${twoFaActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-orange-500 bg-orange-50 border-orange-200'}`}>
                ● {twoFaActive ? '2FA activée' : '2FA non activée'}
              </span>
            }
          />
          <div className="px-8 py-7">
            <h2 className="text-xl font-semibold tracking-tight text-[#253550] mb-2">Protégez votre compte</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              Mot de passe, double authentification et sessions actives. Activez la 2FA pour un score de sécurité maximal.
            </p>

            {/* Mot de passe + 2FA + Passkeys */}
            <div className="grid grid-cols-3 gap-5 mb-10">
              <div className="rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🔒</span>
                    <span className="text-sm font-semibold text-[#253550]">Mot de passe</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">● Fort</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Dernière modification il y a 47 jours. Nous recommandons un renouvellement tous les 90 jours.
                </p>
                {!changingPwd ? (
                  <>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 mb-4 border border-border">
                      <span className="text-xs text-muted-foreground tracking-widest">••••••••••••••</span>
                    </div>
                    <button onClick={() => setChangingPwd(true)} className="w-full h-10 rounded-lg border border-border text-xs font-medium text-[#253550] hover:border-[#253550] transition-colors">
                      Modifier le mot de passe
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        placeholder="Mot de passe actuel"
                        className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors"
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="Nouveau mot de passe"
                        className="w-full h-9 pl-3 pr-9 rounded-lg border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleChangePassword} disabled={pwdLoading || !currentPwd || !newPwd} className="flex-1 h-9 rounded-lg bg-[#FC7E34] text-white text-xs font-semibold hover:bg-[#e06e28] transition-colors disabled:opacity-50">
                        {pwdLoading ? 'Enregistrement…' : 'Confirmer'}
                      </button>
                      <button onClick={() => { setChangingPwd(false); setCurrentPwd(''); setNewPwd(''); setPwdError('') }} className="flex-1 h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={`rounded-xl border-2 p-6 ${twoFaActive ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#FC7E34]/40 bg-[#FC7E34]/3'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">📱</span>
                    <span className="text-sm font-semibold text-[#253550]">2FA TOTP</span>
                  </div>
                  <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border ${twoFaActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-orange-500 bg-orange-50 border-orange-200'}`}>
                    ● {twoFaActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Ajoutez une seconde couche de sécurité avec une application d'authentification (Google Authenticator, Authy…).
                </p>
                <div className="bg-white/80 rounded-lg px-4 py-2.5 mb-4 border border-dashed border-gray-200">
                  <span className="text-[10px] text-muted-foreground font-mono">Compatible : Authy · 1Password · Google Auth</span>
                </div>

                {totpStep === 'idle' && (
                  <button
                    onClick={twoFaActive ? () => setTotpStep('deactivate') : startTotpSetup}
                    disabled={totpLoading}
                    className={`w-full h-10 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${twoFaActive ? 'bg-gray-100 text-gray-500 border border-border hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'bg-[#FC7E34] text-white hover:bg-[#e06e28]'}`}
                  >
                    {twoFaActive ? 'Désactiver la 2FA' : 'Activer la 2FA'}
                  </button>
                )}

                {totpStep === 'setup' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Scannez ce QR avec votre app d'authentification, ou entrez le code manuellement.</p>
                    <div className="flex justify-center p-3 bg-white border border-border rounded-lg">
                      <QRCodeSVG value={totpUri} size={160} />
                    </div>
                    <div className="bg-gray-50 border border-dashed border-border rounded-lg px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Code manuel</p>
                      <p className="font-mono text-xs text-[#253550] tracking-widest break-all select-all">{totpSecret}</p>
                    </div>
                    <button onClick={() => setTotpStep('verify')} className="w-full h-9 rounded-lg bg-[#FC7E34] text-white text-xs font-bold hover:bg-[#e06e28] transition-colors">
                      J'ai scanné → Vérifier
                    </button>
                    <button onClick={() => setTotpStep('idle')} className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                  </div>
                )}

                {totpStep === 'verify' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Entrez le code à 6 chiffres généré par votre application.</p>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000 000"
                      className="w-full h-11 text-center text-xl font-mono tracking-widest rounded-lg border border-[#FC7E34] bg-muted/40 focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30"
                    />
                    {totpError && <p className="text-xs text-red-500">{totpError}</p>}
                    <button onClick={activateTotp} disabled={totpLoading || totpCode.length < 6} className="w-full h-10 rounded-lg bg-[#FC7E34] text-white text-xs font-bold hover:bg-[#e06e28] transition-colors disabled:opacity-50">
                      {totpLoading ? 'Vérification…' : 'Confirmer et activer'}
                    </button>
                    <button onClick={() => { setTotpStep('setup'); setTotpCode(''); setTotpError('') }} className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">← Retour au QR</button>
                  </div>
                )}

                {totpStep === 'deactivate' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Entrez votre code TOTP actuel pour désactiver la 2FA.</p>
                    <input
                      type="text" inputMode="numeric" maxLength={6}
                      value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000 000"
                      className="w-full h-11 text-center text-xl font-mono tracking-widest rounded-lg border border-red-300 bg-muted/40 focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    {totpError && <p className="text-xs text-red-500">{totpError}</p>}
                    <button onClick={deactivateTotp} disabled={totpLoading || totpCode.length < 6} className="w-full h-10 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                      {totpLoading ? 'Désactivation…' : 'Désactiver la 2FA'}
                    </button>
                    <button onClick={() => { setTotpStep('idle'); setTotpCode(''); setTotpError('') }} className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
                  </div>
                )}
              </div>

              {/* Passkey card */}
              <div className="rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🔑</span>
                    <span className="text-sm font-semibold text-[#253550]">Passkeys</span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                    ● {passkeys.length} clé{passkeys.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Connexion sans mot de passe via Face ID, Touch ID ou clé USB. Plus rapide et plus sécurisé.
                </p>

                {/* Liste des passkeys */}
                {passkeys.length > 0 && (
                  <div className="mb-3 space-y-0">
                    {passkeys.map((key, i) => (
                      <div key={key.id} className={`py-2.5 ${i < passkeys.length - 1 ? 'border-b border-border' : ''}`}>
                        {confirmDeletePasskeyId === key.id ? (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-red-500 flex-1">Supprimer cette clé ?</p>
                            <button onClick={() => handleDeletePasskey(key.id)} className="h-7 px-2.5 rounded-md bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors">
                              Supprimer
                            </button>
                            <button onClick={() => setConfirmDeletePasskeyId(null)} className="h-7 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <Fingerprint className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#253550] truncate">{key.name ?? 'Clé de sécurité'}</p>
                              {key.lastUsedAt && (
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(key.lastUsedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </p>
                              )}
                            </div>
                            {key.backedUp && (
                              <span title="Sauvegardée dans un trousseau cloud (iCloud, Google…) — disponible sur tous vos appareils" className="text-[10px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 shrink-0 cursor-help">
                                ☁ Cloud
                              </span>
                            )}
                            <button onClick={() => setConfirmDeletePasskeyId(key.id)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!addingPasskey ? (
                  <button
                    onClick={() => setAddingPasskey(true)}
                    className="w-full h-10 rounded-lg border border-dashed border-[#FC7E34]/50 text-[#FC7E34] text-xs font-bold hover:bg-[#FC7E34]/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une passkey
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Nom (ex: MacBook Touch ID)"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors"
                    />
                    {passkeyError && <p className="text-xs text-red-500">{passkeyError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleRegisterPasskey} disabled={passkeyLoading} className="flex-1 h-9 rounded-lg bg-[#FC7E34] text-white text-xs font-bold hover:bg-[#e06e28] transition-colors disabled:opacity-50">
                        {passkeyLoading ? 'En cours...' : 'Enregistrer'}
                      </button>
                      <button onClick={() => { setAddingPasskey(false); setNewKeyName(''); setPasskeyError('') }} className="flex-1 h-9 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Annuler
                      </button>
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
                {sessions.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">Aucune session active.</p>
                )}
                {sessions.map((session, i) => (
                  <div key={session.id} className={`flex items-center gap-5 py-4 ${i < sessions.length - 1 ? 'border-b border-border' : ''}`}>
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <DeviceIcon device={session.device ?? ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <span className="text-sm font-semibold text-[#253550]">{session.device ?? 'Appareil inconnu'}</span>
                        {session.current && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">● Session actuelle</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.ip ?? 'IP inconnue'}
                        {session.location ? ` · ${session.location}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[100px]">
                      <p className="text-xs font-semibold text-[#253550]">
                        {session.current ? 'Maintenant' : new Date(session.lastSeenAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {!session.current && (
                      <button onClick={() => handleRevokeSession(session.id)} className="h-9 px-4 rounded-lg border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        Révoquer
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {sessions.length > 1 && (
                <div className="flex justify-end mt-5">
                  <button onClick={handleRevokeAll} className="h-9 px-5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors">
                    Déconnecter toutes les autres sessions
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
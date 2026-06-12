import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, RefreshCw, Loader2 } from 'lucide-react'
import {
  getPreferences,
  updatePreferences,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from '@/lib/api'

// Catégories de notifications réellement émises par le backend.
type NotifKey = keyof UserPreferences['notifications']

const NOTIF_ITEMS: { key: NotifKey; title: string; description: string; recommended?: boolean }[] = [
  { key: 'confirmation', title: 'Confirmation', description: 'Un broker confirme la suppression de vos données (demande complétée ou ajout à la liste de suppression).' },
  { key: 'relance', title: 'Relance automatique', description: "FLOAT relance un broker resté sans réponse, et vous prévient lorsqu'une mise en demeure devient possible.", recommended: true },
  { key: 'refus', title: 'Refus', description: 'Un broker rejette votre demande — vous recevez la notification pour réagir (plainte CNIL, etc.).' },
]

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
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
    <div className="rounded-xl border border-border bg-[#fafafa] p-6 max-w-sm">
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

function SectionHeader({ icon: Icon, label, right }: {
  icon: React.ElementType; label: string; right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-border">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#FC7E34]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#FC7E34]">{label}</span>
      </div>
      {right}
    </div>
  )
}

export default function Settings() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  // Anti-spam du PATCH quand on fait glisser le slider du délai.
  const delayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    getPreferences().then((p) => {
      setPrefs(p)
      setLoading(false)
    })
    return () => { if (delayTimer.current) clearTimeout(delayTimer.current) }
  }, [])

  // Toggle d'une catégorie de notification — mise à jour optimiste + PATCH.
  const toggleNotif = (key: NotifKey) => {
    const next = !prefs.notifications[key]
    setPrefs((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: next } }))
    updatePreferences({ notifications: { [key]: next } })
  }

  const toggleReminders = (enabled: boolean) => {
    setPrefs((prev) => ({ ...prev, reminders: { ...prev.reminders, enabled } }))
    updatePreferences({ reminders: { enabled } })
  }

  // Délai : on rafraîchit l'UI immédiatement, mais on n'envoie le PATCH qu'après 500ms d'inactivité.
  const changeDelay = (delayDays: number) => {
    setPrefs((prev) => ({ ...prev, reminders: { ...prev.reminders, delayDays } }))
    if (delayTimer.current) clearTimeout(delayTimer.current)
    delayTimer.current = setTimeout(() => {
      updatePreferences({ reminders: { delayDays } })
    }, 500)
  }

  const activeCount = Object.values(prefs.notifications).filter(Boolean).length
  const { enabled, delayDays } = prefs.reminders

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
            Choisissez les notifications que vous recevez et le rythme de vos relances automatiques. Chaque modification est enregistrée immédiatement.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Chargement de vos préférences…</span>
          </div>
        ) : (
          <>
            {/* ── Section 01 : Notifications ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="rounded-2xl border border-border bg-white overflow-hidden mb-5">
              <SectionHeader
                icon={Bell} label="Notifications"
                right={
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    ● {activeCount} / {NOTIF_ITEMS.length} actifs
                  </span>
                }
              />
              <div>
                {NOTIF_ITEMS.map((item, i) => {
                  const active = prefs.notifications[item.key]
                  return (
                    <div key={item.key} className={`flex items-center gap-5 px-8 py-5 ${i < NOTIF_ITEMS.length - 1 ? 'border-b border-border' : ''} hover:bg-gray-50/60 transition-colors`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="text-sm font-semibold text-[#253550]">{item.title}</span>
                          {item.recommended && (
                            <span className="text-[10px] font-semibold text-[#FC7E34] border border-[#FC7E34]/30 bg-[#FC7E34]/5 rounded-full px-2.5 py-0.5">● Recommandé</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 border ${active ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-gray-400 bg-gray-100 border-gray-200'}`}>
                          ● {active ? 'Actif' : 'Inactif'}
                        </span>
                        <Toggle checked={active} onChange={() => toggleNotif(item.key)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* ── Section 02 : Relances automatiques ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-2xl border border-border bg-white overflow-hidden mb-5">
              <SectionHeader
                icon={RefreshCw} label="Relances automatiques"
                right={
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Activer les relances</span>
                    <Toggle checked={enabled} onChange={toggleReminders} />
                  </div>
                }
              />
              <div className="px-8 py-7">
                <h2 className="text-xl font-semibold tracking-tight text-[#253550] mb-2">Tenir la pression, sans y penser</h2>
                <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
                  Quand un broker ne répond pas, FLOAT le relance automatiquement après le délai que vous fixez. Au-delà, vous êtes invité à saisir la CNIL.
                </p>

                <div className={`transition-opacity duration-300 mb-8 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <SliderControl label="Délai avant relance" sublabel="sans réponse" value={delayDays} min={1} max={90} unit="jours" onChange={changeDelay} />
                </div>

                {/* Aperçu honnête : reflète exactement ce que font les schedulers backend. */}
                <div className={`rounded-xl border border-dashed border-[#FC7E34]/40 overflow-hidden transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="flex items-center gap-2.5 px-6 py-3.5 border-b border-dashed border-[#FC7E34]/30 bg-[#FC7E34]/5">
                    <div className="w-4 h-0.5 bg-[#FC7E34]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#FC7E34]">Ce qui se passe</span>
                  </div>
                  {[
                    { day: 'J+0', label: 'Envoi de la demande initiale au broker' },
                    { day: `J+${delayDays}`, label: 'Sans réponse, FLOAT envoie une relance automatique' },
                    { day: `J+${delayDays * 2}`, label: 'Toujours rien : vous pouvez déposer une mise en demeure CNIL' },
                  ].map((row, i, rows) => (
                    <div key={i} className={`flex items-center gap-8 px-6 py-3 ${i < rows.length - 1 ? 'border-b border-border/60' : ''}`}>
                      <span className="text-xs font-bold text-[#253550] w-14 flex-shrink-0 font-mono">{row.day}</span>
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}

      </div>
    </div>
  )
}

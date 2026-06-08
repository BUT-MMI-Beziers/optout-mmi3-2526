import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Plus, Trash2, Pencil, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactItem {
  id: number
  value: string
  principal: boolean
}

// ─── EditableRow ──────────────────────────────────────────────────────────────

function EditableRow({ label, value, type = 'text' }: { label: string; value: string; type?: string }) {
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(value)
  const [draft, setDraft] = useState(value)

  const save = () => { setCurrent(draft); setEditing(false) }
  const cancel = () => { setDraft(current); setEditing(false) }

  return (
    <div className="py-4 border-b border-border last:border-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="flex-1 h-9 px-3 rounded-lg border border-[#FC7E34] bg-muted/40 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 transition-colors"
          />
          <button onClick={save} className="h-9 px-3 rounded-lg bg-[#FC7E34] text-white text-sm font-semibold hover:bg-[#e06e28] transition-colors whitespace-nowrap">
            Sauvegarder
          </button>
          <button onClick={cancel} className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-base font-medium text-[#253550]">
            {type === 'password' ? '••••••••••••' : current}
          </span>
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#FC7E34] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ContactCard ──────────────────────────────────────────────────────────────

function ContactCard({ title, subtitle, icon: Icon, items: initialItems, placeholder, type = 'text' }: {
  title: string
  subtitle: string
  icon: React.ElementType
  items: ContactItem[]
  placeholder: string
  type?: string
}) {
  const [items, setItems] = useState<ContactItem[]>(initialItems)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const addItem = () => {
    if (!draft.trim()) return
    setItems([...items, { id: Date.now(), value: draft.trim(), principal: false }])
    setDraft('')
    setAdding(false)
  }

  const removeItem = (id: number) => setItems(items.filter((i) => i.id !== id))
  const setPrincipal = (id: number) => setItems(items.map((i) => ({ ...i, principal: i.id === id })))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#253550]" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#253550] leading-tight">{title}</p>
            <p className="text-sm text-muted-foreground leading-tight">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#253550] border border-border rounded-lg px-3 py-1.5 hover:border-[#FC7E34] hover:text-[#FC7E34] transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground flex-1 truncate">{item.value}</span>
            <div className="flex items-center gap-2 shrink-0">
              {item.principal ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FC7E34] text-white">
                  Principal
                </span>
              ) : (
                <button onClick={() => setPrincipal(item.id)} className="text-sm font-medium text-muted-foreground hover:text-[#FC7E34] transition-colors whitespace-nowrap">
                  Définir principal
                </button>
              )}
              <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
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
              className="flex-1 h-9 px-3 rounded-lg border border-[#FC7E34] bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 transition-colors"
            />
            <button onClick={addItem} className="h-9 px-3 rounded-lg bg-[#FC7E34] text-white text-sm font-semibold hover:bg-[#e06e28] transition-colors">
              Ajouter
            </button>
            <button onClick={() => { setAdding(false); setDraft('') }} className="h-9 px-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Profile() {
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
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 h-9 gap-2 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Exporter mes données
        </Button>

        <div className="absolute bottom-5 left-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>LM</span>
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">Léo Martin</p>
            <p className="text-sm text-white/60">leo.martin@gmail.com</p>
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
          <EditableRow label="Prénom" value="Léo" />
          <EditableRow label="Nom" value="Martin" />
          <EditableRow label="Date de naissance" value="15/03/1990" />
          <EditableRow label="Mot de passe" value="password" type="password" />
        </motion.div>

        {/* Contacts */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
            <ContactCard
              title="Adresses email"
              subtitle="Emails à retirer des bases des data brokers"
              icon={Mail}
              placeholder="nouvelle@email.com"
              type="email"
              items={[
                { id: 1, value: 'leo.martin@gmail.com', principal: true },
                { id: 2, value: 'leo.martin.pro@gmail.com', principal: false },
              ]}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}>
            <ContactCard
              title="Adresses postales"
              subtitle="Adresses actuelles et passées"
              icon={MapPin}
              placeholder="12 rue de la Paix, 75001 Paris"
              items={[
                { id: 1, value: '12 rue de la Paix, 75002 Paris', principal: true },
                { id: 2, value: '5 avenue Victor Hugo, 34500 Béziers', principal: false },
              ]}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
            <ContactCard
              title="Numéros de téléphone"
              subtitle="Numéros actuels et passés"
              icon={Phone}
              placeholder="+33 6 12 34 56 78"
              type="tel"
              items={[
                { id: 1, value: '+33 6 12 34 56 78', principal: true },
                { id: 2, value: '+33 4 67 11 22 33', principal: false },
              ]}
            />
          </motion.div>
        </div>

      </div>
    </div>
  )
}

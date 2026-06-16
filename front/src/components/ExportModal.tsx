import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, User, Phone, Bell, FileText, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'

const API = '/api/v1'

interface ExportData {
  exportedAt: string
  user: Record<string, unknown>
  contacts: unknown[]
  notifications: unknown[]
  removalRequests: unknown[]
}

interface Category {
  key: keyof Omit<ExportData, 'exportedAt'>
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  count: (data: ExportData) => number
}

const CATEGORIES: Category[] = [
  {
    key: 'user',
    label: 'Profil',
    description: 'Nom, email, rôle, date d\'inscription',
    icon: User,
    count: () => 1,
  },
  {
    key: 'contacts',
    label: 'Contacts',
    description: 'Emails, téléphones, adresses enregistrés',
    icon: Phone,
    count: (d) => d.contacts.length,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Historique de toutes les notifications reçues',
    icon: Bell,
    count: (d) => d.notifications.length,
  },
  {
    key: 'removalRequests',
    label: 'Demandes de suppression',
    description: 'Historique complet de toutes vos demandes',
    icon: FileText,
    count: (d) => d.removalRequests.length,
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function ExportModal({ open, onClose }: Props) {
  const [data, setData] = useState<ExportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)))
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected(new Set(CATEGORIES.map(c => c.key)))
    apiFetch(`${API}/users/me/export`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [open])

  const allSelected = selected.size === CATEGORIES.length
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(CATEGORIES.map(c => c.key)))
  const toggle = (key: string) => {
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    setSelected(next)
  }

  const handleDownload = () => {
    if (!data || selected.size === 0) return
    setDownloading(true)
    const filtered: Record<string, unknown> = { exportedAt: data.exportedAt }
    for (const cat of CATEGORIES) {
      if (selected.has(cat.key)) filtered[cat.key] = data[cat.key]
    }
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `float-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-background rounded-2xl border border-border shadow-2xl w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">Exporter mes données</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Sélectionnez les catégories à inclure dans l'export</p>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-3">
              {/* Select all */}
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {allSelected
                  ? <CheckSquare className="w-4 h-4 text-[#253550]" />
                  : <Square className="w-4 h-4" />}
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>

              {/* Categories */}
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = selected.has(cat.key)
                  const count = data ? cat.count(data) : null
                  return (
                    <button
                      key={cat.key}
                      onClick={() => toggle(cat.key)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#253550] bg-[#253550]/5'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#253550] text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{cat.label}</p>
                          {count !== null && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {count} élément{count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                      </div>
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-[#253550] shrink-0" />
                        : <Square className="w-5 h-5 text-muted-foreground shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Format JSON · Art. 20 RGPD
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
                <Button
                  size="sm"
                  className="gap-2 bg-[#253550] hover:bg-[#1a2840] text-white"
                  disabled={selected.size === 0 || loading || downloading}
                  onClick={handleDownload}
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Télécharger ({selected.size})
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

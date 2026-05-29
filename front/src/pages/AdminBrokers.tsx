import { useState } from "react"

export default function AdminBrokers() {
  // --- Bulk Import State ---
  const [file, setFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // --- Single Broker Creation State ---
  const [formData, setFormData] = useState({
    name: "",
    emailContact: "",
    website: "",
    optOutUrl: "",
    category: "people-search",
    region: "eu",
    country: "",
    optOutMethod: "email",
    difficulty: "easy",
    legalBasis: "gdpr_art17",
    notes: ""
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createResult, setCreateResult] = useState<any | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // --- Bulk Import Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setImportResult(null)
      setImportError(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImportLoading(true)
    setImportResult(null)
    setImportError(null)

    try {
      const text = await file.text()
      const isYaml = file.name.endsWith('.yaml') || file.name.endsWith('.yml')
      const contentType = isYaml ? 'application/yaml' : 'application/json'

      const response = await fetch('/api/brokers/import', {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: text,
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors de l\'import'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          errorMessage = `Erreur ${response.status}: ${response.statusText || 'Le serveur a renvoyé une réponse invalide'}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setImportResult(
        `Import réussi ! ${data.imported} brokers importés, ${data.skipped} ignorés.`
      )
    } catch (err: any) {
      setImportError(err.message || 'Une erreur est survenue.')
    } finally {
      setImportLoading(false)
    }
  }

  // --- Single Broker Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateResult(null)
    setCreateError(null)

    // Clean optional fields (empty string -> null)
    const payload = {
      ...formData,
      website: formData.website.trim() || null,
      optOutUrl: formData.optOutUrl.trim() || null,
      country: formData.country.trim() || null,
      notes: formData.notes.trim() || null,
    }

    try {
      const response = await fetch('/api/brokers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la création du broker'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          errorMessage = `Erreur ${response.status}: ${response.statusText || 'Le serveur a renvoyé une réponse invalide'}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setCreateResult(data)
      
      // Reset main inputs but keep defaults
      setFormData({
        name: "",
        emailContact: "",
        website: "",
        optOutUrl: "",
        category: "people-search",
        region: "eu",
        country: "",
        optOutMethod: "email",
        difficulty: "easy",
        legalBasis: "gdpr_art17",
        notes: ""
      })
    } catch (err: any) {
      setCreateError(err.message || 'Une erreur est survenue.')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">
          Admin - Data Brokers
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
          Interface d'administration pour importer des bases de données de brokers ou créer des entrées à l'unité pour test.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* ================= COLUMN 1: BULK IMPORT ================= */}
        <div className="border border-gray-200 dark:border-zinc-800 p-6 rounded-xl space-y-6 bg-white dark:bg-zinc-900/50 shadow-sm backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
              Importation de graine (Bulk Seed)
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Permet de charger un fichier JSON ou YAML contenant plusieurs brokers.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Sélectionner un fichier (.json, .yaml, .yml)
              </label>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700 transition-colors cursor-pointer"
              />
            </div>

            {file && (
              <button
                onClick={handleImport}
                disabled={importLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-zinc-800 cursor-pointer shadow-sm transition-all"
              >
                {importLoading ? 'Importation en cours...' : 'Lancer l\'importation'}
              </button>
            )}
          </div>

          {importResult && (
            <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/60 text-sm">
              {importResult}
            </div>
          )}

          {importError && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 text-sm">
              {importError}
            </div>
          )}
        </div>

        {/* ================= COLUMN 2: SINGLE CREATION (POST) ================= */}
        <div className="border border-gray-200 dark:border-zinc-800 p-6 rounded-xl space-y-6 bg-white dark:bg-zinc-900/50 shadow-sm backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              Création unitaire (POST /api/brokers)
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Mini test brut pour soumettre un formulaire de nouveau broker.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            
            {/* Required Fields Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Acme Corp"
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Email de contact *
                </label>
                <input
                  type="email"
                  name="emailContact"
                  value={formData.emailContact}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: privacy@acme.com"
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Optional Web Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Site Web
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://acme.com"
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Lien Opt-Out
                </label>
                <input
                  type="url"
                  name="optOutUrl"
                  value={formData.optOutUrl}
                  onChange={handleInputChange}
                  placeholder="https://acme.com/optout"
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Classifications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Catégorie *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="people-search">People Search</option>
                  <option value="marketing">Marketing</option>
                  <option value="risk-mitigation">Risk Mitigation</option>
                  <option value="recruitment">Recruitment</option>
                  <option value="other">Other / Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Région *
                </label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="eu">Europe (EU)</option>
                  <option value="us">États-Unis (US)</option>
                  <option value="global">Global</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Code Pays (2 car.)
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  maxLength={2}
                  placeholder="Ex: FR, US"
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Methods and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Méthode Opt-Out *
                </label>
                <select
                  name="optOutMethod"
                  value={formData.optOutMethod}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="email">Email</option>
                  <option value="form">Formulaire</option>
                  <option value="postal">Postal</option>
                  <option value="mixed">Mixte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Difficulté *
                </label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="easy">Facile (Easy)</option>
                  <option value="medium">Moyen (Medium)</option>
                  <option value="hard">Difficile (Hard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Base Légale *
                </label>
                <select
                  name="legalBasis"
                  value={formData.legalBasis}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="gdpr_art17">RGPD Art. 17</option>
                  <option value="gdpr_art15">RGPD Art. 15</option>
                  <option value="ccpa">CCPA</option>
                  <option value="pipeda">PIPEDA</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Notes additionnelles ou observations..."
                className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-zinc-800 cursor-pointer shadow-sm transition-all"
            >
              {createLoading ? 'Création en cours...' : 'Créer le Broker'}
            </button>
          </form>

          {/* Creation Error */}
          {createError && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 text-sm">
              <strong className="font-semibold">Erreur de soumission :</strong>
              <div className="mt-1">{createError}</div>
            </div>
          )}

          {/* Creation Success / Raw Response Visualizer */}
          {createResult && (
            <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900/60 text-sm space-y-2">
              <div className="font-semibold text-green-900 dark:text-green-200">
                Broker créé avec succès !
              </div>
              <div className="text-xs font-mono bg-white/70 dark:bg-zinc-950/60 p-2.5 rounded border border-green-200/50 dark:border-green-900/40 overflow-x-auto">
                <pre>{JSON.stringify(createResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

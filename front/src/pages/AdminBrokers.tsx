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

  // --- Test / Playground State ---
  const [testSlug, setTestSlug] = useState("")
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [testFormData, setTestFormData] = useState<any | null>(null)

  const handleTestInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTestFormData((prev: any) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLoadBroker = async () => {
    if (!testSlug.trim()) {
      setTestError("Veuillez saisir un slug")
      return
    }
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)
    setTestFormData(null)

    try {
      const response = await fetch(`/api/brokers/${testSlug.trim()}`)
      if (!response.ok) {
        let errMessage = "Broker introuvable"
        try {
          const data = await response.json()
          errMessage = data.error || errMessage
        } catch {}
        throw new Error(errMessage)
      }
      const data = await response.json()
      setTestFormData({
        name: data.name || "",
        emailContact: data.emailContact || "",
        website: data.website || "",
        optOutUrl: data.optOutUrl || "",
        category: data.category || "people-search",
        region: data.region || "eu",
        country: data.country || "",
        optOutMethod: data.optOutMethod || "email",
        difficulty: data.difficulty || "easy",
        legalBasis: data.legalBasis || "gdpr_art17",
        notes: data.notes || ""
      })
      setTestResult(data)
    } catch (err: any) {
      setTestError(err.message || "Une erreur est survenue.")
    } finally {
      setTestLoading(false)
    }
  }

  const handlePatchVerify = async () => {
    if (!testSlug.trim()) return
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)

    try {
      const response = await fetch(`/api/brokers/${testSlug.trim()}/verify`, {
        method: 'PATCH'
      })
      if (!response.ok) {
        let errMessage = "Erreur lors de la vérification (PATCH)"
        try {
          const data = await response.json()
          errMessage = data.error || errMessage
        } catch {}
        throw new Error(errMessage)
      }
      const data = await response.json()
      setTestResult(data)
    } catch (err: any) {
      setTestError(err.message || "Une erreur est survenue.")
    } finally {
      setTestLoading(false)
    }
  }

  const handlePutUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testSlug.trim() || !testFormData) return
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)

    const payload = {
      ...testFormData,
      website: testFormData.website?.trim() || null,
      optOutUrl: testFormData.optOutUrl?.trim() || null,
      country: testFormData.country?.trim() || null,
      notes: testFormData.notes?.trim() || null,
    }

    try {
      const response = await fetch(`/api/brokers/${testSlug.trim()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errMessage = "Erreur lors de la modification (PUT)"
        try {
          const data = await response.json()
          errMessage = data.error || errMessage
        } catch {}
        throw new Error(errMessage)
      }

      const data = await response.json()
      setTestResult(data)
      if (data.slug) {
        setTestSlug(data.slug)
      }
    } catch (err: any) {
      setTestError(err.message || "Une erreur est survenue.")
    } finally {
      setTestLoading(false)
    }
  }

  const handleDeleteBroker = async () => {
    if (!testSlug.trim()) return
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le broker "${testSlug}" ?`)) return

    setTestLoading(true)
    setTestResult(null)
    setTestError(null)

    try {
      const response = await fetch(`/api/brokers/${testSlug.trim()}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        let errMessage = "Erreur lors de la suppression (DELETE)"
        try {
          const data = await response.json()
          errMessage = data.error || errMessage
        } catch {}
        throw new Error(errMessage)
      }

      const data = await response.json()
      setTestResult(data)
      setTestFormData(null)
    } catch (err: any) {
      setTestError(err.message || "Une erreur est survenue.")
    } finally {
      setTestLoading(false)
    }
  }

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

      {/* ================= SECTION 3: PLAYGROUND DE TEST (GET, PUT, PATCH, DELETE) ================= */}
      <div className="border border-gray-200 dark:border-zinc-800 p-6 rounded-xl space-y-6 bg-white dark:bg-zinc-900/50 shadow-sm backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-bold">🛠️</span>
            Playground de Test des Routes (GET / PUT / PATCH / DELETE)
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Recherchez un broker par son <strong>slug</strong> pour le visualiser, le modifier (PUT), le vérifier (PATCH) ou le supprimer (DELETE).
          </p>
        </div>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={testSlug}
              onChange={(e) => setTestSlug(e.target.value)}
              placeholder="Saisir le slug (ex: acme-corp)"
              className="w-full p-2.5 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <button
            onClick={handleLoadBroker}
            disabled={testLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-6 rounded-lg disabled:bg-gray-400 dark:disabled:bg-zinc-800 cursor-pointer shadow-sm transition-all text-sm flex items-center justify-center gap-2"
          >
            {testLoading ? 'Chargement...' : 'Charger le Broker (GET)'}
          </button>
        </div>

        {/* Form & Actions Panel */}
        {testFormData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-zinc-800">
            {/* Left: PUT Edit Form */}
            <form onSubmit={handlePutUpdate} className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 border-b border-gray-100 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">PUT</span>
                Modifier les détails du Broker
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={testFormData.name}
                    onChange={handleTestInputChange}
                    required
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    name="emailContact"
                    value={testFormData.emailContact}
                    onChange={handleTestInputChange}
                    required
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Site Web
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={testFormData.website}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Lien Opt-Out
                  </label>
                  <input
                    type="url"
                    name="optOutUrl"
                    value={testFormData.optOutUrl}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Catégorie
                  </label>
                  <select
                    name="category"
                    value={testFormData.category}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="people-search">People Search</option>
                    <option value="marketing">Marketing</option>
                    <option value="risk-mitigation">Risk Mitigation</option>
                    <option value="recruitment">Recruitment</option>
                    <option value="other">Other / Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Région
                  </label>
                  <select
                    name="region"
                    value={testFormData.region}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="eu">Europe (EU)</option>
                    <option value="us">États-Unis (US)</option>
                    <option value="global">Global</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Pays (2 car.)
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={testFormData.country}
                    onChange={handleTestInputChange}
                    maxLength={2}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Méthode Opt-Out
                  </label>
                  <select
                    name="optOutMethod"
                    value={testFormData.optOutMethod}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="email">Email</option>
                    <option value="form">Formulaire</option>
                    <option value="postal">Postal</option>
                    <option value="mixed">Mixte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Difficulté
                  </label>
                  <select
                    name="difficulty"
                    value={testFormData.difficulty}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="easy">Facile (Easy)</option>
                    <option value="medium">Moyen (Medium)</option>
                    <option value="hard">Difficile (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Base Légale
                  </label>
                  <select
                    name="legalBasis"
                    value={testFormData.legalBasis}
                    onChange={handleTestInputChange}
                    className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="gdpr_art17">RGPD Art. 17</option>
                    <option value="gdpr_art15">RGPD Art. 15</option>
                    <option value="ccpa">CCPA</option>
                    <option value="pipeda">PIPEDA</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={testFormData.notes}
                  onChange={handleTestInputChange}
                  rows={2}
                  className="w-full p-2 border rounded-lg text-sm bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={testLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-zinc-800 cursor-pointer shadow-sm transition-all text-sm"
              >
                {testLoading ? 'Mise à jour...' : 'Mettre à jour le Broker (PUT)'}
              </button>
            </form>

            {/* Right: Quick Actions & State Visualizer */}
            <div className="space-y-6">
              {/* Quick Actions (PATCH & DELETE) */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 border-b border-gray-100 dark:border-zinc-800 pb-2">
                  Actions rapides
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handlePatchVerify}
                    disabled={testLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-zinc-800 cursor-pointer shadow-sm transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-indigo-800 text-indigo-100">PATCH</span>
                    Vérifier le Broker (/verify)
                  </button>

                  <button
                    onClick={handleDeleteBroker}
                    disabled={testLoading}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-zinc-800 cursor-pointer shadow-sm transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-rose-800 text-rose-100">DELETE</span>
                    Supprimer le Broker
                  </button>
                </div>
              </div>

              {/* Status and Verification Badge info */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 text-xs space-y-2">
                <div className="font-semibold text-gray-700 dark:text-zinc-300">
                  Détails d'état de l'entité chargée :
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-zinc-400 font-mono">
                  <div>Statut vérifié :</div>
                  <div className="font-semibold">
                    {testResult?.isVerified ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">✓ Vérifié</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">⚠ Non vérifié</span>
                    )}
                  </div>
                  <div>Créé le :</div>
                  <div>{testResult?.createdAt ? new Date(testResult.createdAt).toLocaleString() : 'N/A'}</div>
                  <div>Mis à jour le :</div>
                  <div>{testResult?.updatedAt ? new Date(testResult.updatedAt).toLocaleString() : 'N/A'}</div>
                  {testResult?.lastVerifiedAt && (
                    <>
                      <div>Vérifié le :</div>
                      <div>{new Date(testResult.lastVerifiedAt).toLocaleString()}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Test Feedback / Results */}
        {testError && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60 text-sm">
            <strong className="font-semibold">Erreur de test :</strong>
            <div className="mt-1">{testError}</div>
          </div>
        )}

        {testResult && (
          <div className="p-4 bg-purple-50 text-purple-800 rounded-lg border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60 text-sm space-y-2">
            <div className="font-semibold text-purple-900 dark:text-purple-200 flex items-center justify-between">
              <span>Dernier retour de l'API (Response JSON) :</span>
              <button
                onClick={() => setTestResult(null)}
                className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 underline cursor-pointer"
              >
                Masquer
              </button>
            </div>
            <div className="text-xs font-mono bg-white/70 dark:bg-zinc-950/60 p-2.5 rounded border border-purple-200/50 dark:border-purple-900/40 overflow-x-auto">
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

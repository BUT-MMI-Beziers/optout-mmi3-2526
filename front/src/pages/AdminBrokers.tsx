import { useState } from "react"

export default function AdminBrokers() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)
    setError(null)

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

      setResult(
        `Import réussi ! ${data.imported} brokers importés, ${data.skipped} ignorés.`
      )
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Admin - Import Brokers</h1>
      
      <div className="border p-4 rounded space-y-4 bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800">
        <div>
          <label className="block font-medium mb-1">Sélectionner un fichier (JSON ou YAML)</label>
          <input
            type="file"
            accept=".json,.yaml,.yml"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-zinc-800 dark:file:text-zinc-300"
          />
        </div>

        {file && (
          <button
            onClick={handleImport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:bg-gray-400 cursor-pointer"
          >
            {loading ? 'Importation en cours...' : 'Importer'}
          </button>
        )}
      </div>

      {result && (
        <div className="p-4 bg-green-50 text-green-800 rounded border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900">
          {result}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900">
          {error}
        </div>
      )}
    </div>
  )
}

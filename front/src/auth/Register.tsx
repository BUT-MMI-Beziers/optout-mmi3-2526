import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

function UnderlineField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  icon: Icon,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  minLength?: number
  icon: React.ElementType
}) {
  return (
    <div className="border-b border-gray-200 pb-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder:text-gray-300 outline-none"
        />
        <Icon size={18} className="text-gray-300 shrink-0" />
      </div>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setIsLoading(true)
    try {
      await register(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-10">

        {/* Titre */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-gray-900">
            <span className="underline decoration-violet-500 decoration-4 underline-offset-2">
              Bienvenue sur FLOAT.
            </span>
            <br />
            Inscrivez-vous pour reprendre le contrôle de vos données.
          </h1>
          <p className="text-sm text-gray-400">
            Renseignez vos informations pour commencer.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <UnderlineField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="Toto@gmail.com"
            autoComplete="email"
            icon={Mail}
          />

          <UnderlineField
            id="password"
            label="Mot de passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Au moins 8 caractères"
            autoComplete="new-password"
            minLength={8}
            icon={Lock}
          />

          <UnderlineField
            id="confirm"
            label="Confirmer le mot de passe"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            autoComplete="new-password"
            icon={Lock}
          />

          {/* Checkbox CGU */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="checkbox"
              aria-checked={terms}
              onClick={() => setTerms(!terms)}
              className={`mt-0.5 size-5 shrink-0 rounded-full border-2 transition-colors ${
                terms
                  ? 'border-orange-400 bg-orange-400'
                  : 'border-gray-300 bg-white'
              }`}
            />
            <span className="text-sm text-gray-600">
              J'accepte les conditions d'utilisation et la politique de confidentialité
            </span>
          </label>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !terms}
              className="flex-1 rounded-full bg-orange-400 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Création…' : "S'inscrire"}
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 rounded-full bg-orange-50 py-3 text-sm font-semibold text-orange-400 transition-opacity hover:opacity-90"
            >
              Se connecter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

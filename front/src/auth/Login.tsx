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
  icon: Icon,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
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

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
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
            Connectez-vous pour reprendre le contrôle de vos données.
          </h1>
          <p className="text-sm text-gray-400">
            Renseignez vos identifiants pour continuer.
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
            placeholder="••••••••"
            autoComplete="current-password"
            icon={Lock}
          />

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-full bg-orange-400 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="flex-1 rounded-full bg-orange-50 py-3 text-sm font-semibold text-orange-400 transition-opacity hover:opacity-90"
            >
              S'inscrire
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

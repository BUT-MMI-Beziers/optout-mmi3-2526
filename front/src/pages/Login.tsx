import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Eye, EyeOff, ShieldCheck, Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startAuthentication } from '@simplewebauthn/browser'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [passkeyLoading, setPasskeyLoading] = useState(false)

  // TOTP challenge state
  const [totpStep, setTotpStep] = useState<'idle' | 'challenge'>('idle')
  const [totpUserId, setTotpUserId] = useState('')
  const [totpTempToken, setTotpTempToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      if (data.requiresTOTP) {
        setTotpUserId(data.userId)
        setTotpTempToken(data.tempToken)
        setTotpStep('challenge')
        return
      }
      navigate('/dashboard')
    } catch {
      setError('Impossible de contacter le serveur')
    } finally {
      setLoading(false)
    }
  }

  const handleTotpChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/totp/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: totpUserId, tempToken: totpTempToken, code: totpCode }),
      })
      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* réponse non-JSON */ }
      if (!res.ok) { setError(data.error ?? 'Code incorrect'); return }
      navigate('/dashboard')
    } catch {
      setError('Impossible de contacter le serveur')
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeyLogin = async () => {
    setError('')
    setPasskeyLoading(true)
    try {
      const query = email ? `?email=${encodeURIComponent(email)}` : ''
      const optsRes = await fetch(`/api/v1/auth/passkey/auth/start${query}`, { credentials: 'include' })
      if (!optsRes.ok) { setError('Impossible de démarrer la connexion passkey'); return }
      const opts = await optsRes.json()

      let assertion
      try {
        assertion = await startAuthentication({ optionsJSON: opts })
      } catch {
        setError('Connexion passkey annulée ou non disponible')
        return
      }

      const finishRes = await fetch('/api/v1/auth/passkey/auth/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(assertion),
      })
      const finishData = await finishRes.json()
      if (!finishRes.ok) { setError(finishData.error ?? 'Authentification passkey échouée'); return }
      navigate('/dashboard')
    } catch {
      setError('Erreur lors de la connexion passkey')
    } finally {
      setPasskeyLoading(false)
    }
  }

  if (totpStep === 'challenge') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col justify-center px-12 py-16 w-full max-w-[520px]">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <span className="text-2xl font-bold tracking-tight text-[#253550]">FLOAT.</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }} className="mt-12">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-6 h-6 text-[#FC7E34]" />
              <h1 className="text-2xl font-semibold tracking-tight text-[#253550]">Vérification 2FA</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Ouvrez votre application d'authentification et entrez le code à 6 chiffres.
            </p>
          </motion.div>

          <motion.form onSubmit={handleTotpChallenge} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }} className="mt-10 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Code de vérification
              </label>
              <input
                type="text" inputMode="numeric" maxLength={6} autoFocus
                value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                required
                className="w-full h-14 text-center text-2xl font-mono tracking-widest rounded-lg border border-border bg-muted/40 text-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="pt-2">
              <Button type="submit" disabled={loading || totpCode.length < 6} className="w-full h-11 bg-[#FC7E34] hover:bg-[#e06e28] text-white font-semibold">
                {loading ? 'Vérification...' : 'Confirmer'}
              </Button>
            </div>

            <button type="button" onClick={() => { setTotpStep('idle'); setError(''); setTotpCode('') }} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
              ← Retour à la connexion
            </button>
          </motion.form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col justify-center px-12 py-16 w-full max-w-[520px]">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <span className="text-2xl font-bold tracking-tight text-[#253550]">FLOAT.</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="mt-12"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-[#253550] leading-snug">
            Bienvenue sur FLOAT.<br />
            Reprenez le contrôle<br />
            de vos données.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connectez-vous pour accéder à votre tableau de bord.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
          className="mt-10 space-y-5"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toto@gmail.com"
                required
                className="
                  w-full h-11 pl-4 pr-10 rounded-lg border border-border
                  bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34]
                  transition-colors
                "
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                className="
                  w-full h-11 pl-4 pr-10 rounded-lg border border-border
                  bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34]
                  transition-colors
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Bouton Se connecter */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#FC7E34] hover:bg-[#e06e28] text-white font-semibold"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </div>

          {/* Séparateur */}
          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Bouton passkey */}
          <Button
            type="button"
            variant="outline"
            disabled={passkeyLoading}
            onClick={handlePasskeyLogin}
            className="w-full h-11 gap-2.5 border-border text-[#253550] font-medium hover:border-[#253550] transition-colors"
          >
            <Fingerprint className="w-4 h-4 text-[#FC7E34]" />
            {passkeyLoading ? 'Vérification...' : 'Se connecter avec une passkey'}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-[#FC7E34] font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  )
}

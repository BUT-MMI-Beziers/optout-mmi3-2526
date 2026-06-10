import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Eye, EyeOff, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PasswordRequirements, isPasswordValid } from '@/components/PasswordRequirements'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const passwordValid = isPasswordValid(password)
  const canSubmit = accepted && passwordValid && firstName.trim() && lastName.trim() && email.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accepted) return
    if (!passwordValid) { setError('Le mot de passe ne respecte pas les critères de sécurité.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      navigate('/dashboard')
    } catch {
      setError('Impossible de contacter le serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col justify-center px-12 py-16 w-full max-w-[600px]">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <span className="text-2xl font-bold tracking-tight text-[#253550]">FLOAT.</span>
        </motion.div>

        {/* Titre */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }} className="mt-12">
          <h1 className="text-2xl font-semibold tracking-tight text-[#253550] leading-snug">
            Bienvenue sur FLOAT.<br />
            Inscrivez-vous pour<br />
            reprendre le contrôle<br />
            de vos données.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Renseignez vos informations pour commencer.
          </p>
        </motion.div>

        {/* Formulaire */}
        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16 }} className="mt-10 space-y-5">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prénom</label>
              <div className="relative">
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Léo" required className="w-full h-11 pl-4 pr-10 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label>
              <div className="relative">
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" required className="w-full h-11 pl-4 pr-10 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
            <div className="relative">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toto@gmail.com" required className="w-full h-11 pl-4 pr-10 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mot de passe</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Au moins 12 caractères" required className="w-full h-11 pl-4 pr-10 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FC7E34]/30 focus:border-[#FC7E34] transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Indicateur des règles — apparaît dès qu'on commence à taper */}
            {password.length > 0 && <PasswordRequirements password={password} />}
          </div>

          {/* Checkbox CGU */}
          <div className="flex items-start gap-3 pt-1">
            <button type="button" onClick={() => setAccepted(!accepted)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${accepted ? 'bg-[#FC7E34] border-[#FC7E34]' : 'border-border bg-muted/40 hover:border-[#FC7E34]/50'}`}>
              {accepted && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className="text-sm text-muted-foreground leading-snug">
              J'accepte les{' '}
              <a href="#" className="text-[#253550] font-medium hover:underline">conditions d'utilisation</a>
              {' '}et la{' '}
              <a href="#" className="text-[#253550] font-medium hover:underline">politique de confidentialité</a>
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Bouton S'inscrire */}
          <div className="pt-2">
            <Button type="submit" disabled={loading || !canSubmit} className="w-full h-11 bg-[#FC7E34] hover:bg-[#e06e28] text-white font-semibold disabled:opacity-50">
              {loading ? 'Inscription...' : "S'inscrire"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-[#FC7E34] font-medium hover:underline">Se connecter</Link>
          </p>
        </motion.form>
      </div>
    </div>
  )
}
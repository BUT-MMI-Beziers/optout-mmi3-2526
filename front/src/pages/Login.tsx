import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: appeler l'API d'authentification
      // await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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
                placeholder="Au moins 12 caractères"
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
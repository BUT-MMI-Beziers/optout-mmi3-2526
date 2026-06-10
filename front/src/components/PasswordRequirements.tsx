import { Check, X } from 'lucide-react'

// ─── Règles de validation du mot de passe ────────────────────────────────────
// Source de vérité unique pour les 2 pages (Login + Register)

export const passwordRules = [
  { id: 'length', label: 'Au moins 12 caractères', test: (p: string) => p.length >= 12 },
  { id: 'upper',  label: 'Une majuscule',          test: (p: string) => /[A-Z]/.test(p) },
  { id: 'digit',  label: 'Un chiffre',             test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Un caractère spécial',  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

// Helper exporté pour piloter le bouton submit
export function isPasswordValid(password: string): boolean {
  return passwordRules.every((rule) => rule.test(password))
}

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {passwordRules.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.id} className="flex items-center gap-2 text-xs transition-colors">
            <span className={`flex items-center justify-center w-4 h-4 rounded-full shrink-0 ${ok ? 'bg-green-500' : 'bg-muted'}`}>
              {ok
                ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                : <X className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={3} />
              }
            </span>
            <span className={ok ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
              {rule.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
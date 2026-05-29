import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'

export default function Reminders() {
  return (
    <div className="p-8 space-y-6">
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/dashboard" className="hover:text-foreground">FLOAT</Link>
        <span>›</span>
        <span className="text-foreground">Relances programmées</span>
      </nav>

      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Squada One', sans-serif" }}>
          RELANCES PROGRAMMÉES
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les relances automatiques envoyées aux brokers sans réponse.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <Clock className="w-10 h-10 opacity-30" />
        <p className="text-sm">Cette page est en cours de développement.</p>
      </div>
    </div>
  )
}

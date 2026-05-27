import { Outlet, Link } from "react-router-dom"

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <nav className="flex gap-4">
          <Link to="/">Accueil</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/brokers">Brokers</Link>
          <Link to="/profile">Profil</Link>
          <Link to="/login">Connexion</Link>
          <Link to="/register">Inscription</Link>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
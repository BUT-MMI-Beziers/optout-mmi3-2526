// TODO: remplacer par le vrai composant avant le push
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erreur"); return }
      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      navigate("/dashboard")
    } catch {
      setError("Impossible de contacter le serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h1 style={{ marginBottom: 24 }}>Connexion (test)</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: 8, fontSize: 14 }} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: 8, fontSize: 14 }} />
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {loading ? "..." : "Se connecter"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Pas de compte ? <Link to="/register">S'inscrire</Link>
      </p>
    </div>
  )
}

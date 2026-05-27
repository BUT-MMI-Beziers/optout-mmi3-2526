// TODO: remplacer par le vrai composant avant le push
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      <h1 style={{ marginBottom: 24 }}>Inscription (test)</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="text"     placeholder="Prénom"          value={form.firstName} onChange={set("firstName")} required style={{ padding: 8, fontSize: 14 }} />
        <input type="text"     placeholder="Nom"             value={form.lastName}  onChange={set("lastName")}  required style={{ padding: 8, fontSize: 14 }} />
        <input type="email"    placeholder="Email"           value={form.email}     onChange={set("email")}     required style={{ padding: 8, fontSize: 14 }} />
        <input type="password" placeholder="Mot de passe (8 car. min)" value={form.password} onChange={set("password")} required style={{ padding: 8, fontSize: 14 }} />
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "8px 16px", cursor: "pointer" }}>
          {loading ? "..." : "Créer le compte"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </div>
  )
}

import { Link } from "react-router-dom"

export default function Landing() {
  return (
    <div style={{ maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 32 }}>Cloak</h1>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <Link to="/login" style={{ padding: "10px 24px", border: "1px solid #333", borderRadius: 6, textDecoration: "none" }}>
          Se connecter
        </Link>
        <Link to="/register" style={{ padding: "10px 24px", background: "#333", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
          Créer un compte
        </Link>
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"

const API = "/api"

function authFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, credentials: "include" })
}

type Contact = {
  id: string
  type: "email" | "phone" | "address"
  value: string
  isPrimary: boolean
  label: string | null
}

type Profil = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  contacts: Contact[]
}

export default function Profile() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const [newContact, setNewContact] = useState({ type: "email" as Contact["type"], value: "", label: "" })
  const [contactError, setContactError] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    authFetch(`${API}/users/me`, { headers: { "Content-Type": "application/json" } })
      .then(r => r.json())
      .then((data: Profil) => {
        setProfil(data)
        setFirstName(data.firstName)
        setLastName(data.lastName)
      })
  }, [])

  async function saveProfil(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    const res = await authFetch(`${API}/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    })
    if (res.ok) {
      const data = await res.json()
      setProfil(data)
      setMessage("Profil mis à jour")
    } else {
      setMessage("Erreur lors de la mise à jour")
    }
    setSaving(false)
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    setContactError("")
    const res = await authFetch(`${API}/users/me/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newContact),
    })
    const data = await res.json()
    if (!res.ok) { setContactError(data.error ?? "Erreur"); return }
    setProfil(p => p ? { ...p, contacts: [...p.contacts, data.contact] } : p)
    setNewContact({ type: "email", value: "", label: "" })
  }

  async function deleteContact(id: string) {
    const res = await authFetch(`${API}/users/me/contacts/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      setProfil(p => p ? { ...p, contacts: p.contacts.filter(c => c.id !== id) } : p)
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Supprimer définitivement votre compte ? Cette action est irréversible.")) return
    setDeleting(true)
    const res = await authFetch(`${API}/users/me`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      window.location.href = "/"
    } else {
      setDeleting(false)
    }
  }

  if (!profil) return <div className="p-8">Chargement...</div>

  const emails    = profil.contacts.filter(c => c.type === "email")
  const addresses = profil.contacts.filter(c => c.type === "address")
  const phones    = profil.contacts.filter(c => c.type === "phone")

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>

      {/* Infos de base */}
      <form onSubmit={saveProfil} className="mb-8 flex flex-col gap-3">
        <div>
          <label className="block text-sm mb-1">Prénom *</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Nom *</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email du compte</label>
          <input type="email" value={profil.email} disabled className="border p-2 w-full rounded bg-gray-100" />
        </div>
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded">
          {saving ? "..." : "Sauvegarder"}
        </button>
      </form>

      {/* Contacts */}
      <section className="mb-6">
        <h2 className="font-semibold mb-3">Emails ({emails.length}/5) *</h2>
        {emails.map(c => (
          <div key={c.id} className="flex justify-between items-center border rounded p-2 mb-2">
            <span>{c.value} {c.label && <span className="text-xs text-gray-400">({c.label})</span>}</span>
            <button onClick={() => deleteContact(c.id)} className="text-red-500 text-sm">Supprimer</button>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Adresses ({addresses.length}/5) *</h2>
        {addresses.map(c => (
          <div key={c.id} className="flex justify-between items-center border rounded p-2 mb-2">
            <span>{c.value} {c.label && <span className="text-xs text-gray-400">({c.label})</span>}</span>
            <button onClick={() => deleteContact(c.id)} className="text-red-500 text-sm">Supprimer</button>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Téléphones ({phones.length}/3)</h2>
        {phones.map(c => (
          <div key={c.id} className="flex justify-between items-center border rounded p-2 mb-2">
            <span>{c.value} {c.label && <span className="text-xs text-gray-400">({c.label})</span>}</span>
            <button onClick={() => deleteContact(c.id)} className="text-red-500 text-sm">Supprimer</button>
          </div>
        ))}
      </section>

      {/* Ajouter un contact */}
      <form onSubmit={addContact} className="flex flex-col gap-3 border-t pt-6">
        <h2 className="font-semibold">Ajouter un contact</h2>
        <div>
          <label className="block text-sm mb-1">Type</label>
          <select
            value={newContact.type}
            onChange={e => setNewContact(n => ({ ...n, type: e.target.value as Contact["type"] }))}
            className="border p-2 w-full rounded"
          >
            <option value="email">Email</option>
            <option value="address">Adresse</option>
            <option value="phone">Téléphone</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Valeur</label>
          <input
            type="text"
            value={newContact.value}
            onChange={e => setNewContact(n => ({ ...n, value: e.target.value }))}
            required
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Label (optionnel)</label>
          <input
            type="text"
            placeholder="ex: perso, pro, domicile"
            value={newContact.label}
            onChange={e => setNewContact(n => ({ ...n, label: e.target.value }))}
            className="border p-2 w-full rounded"
          />
        </div>
        {contactError && <p className="text-sm text-red-500">{contactError}</p>}
        <button type="submit" className="bg-black text-white px-4 py-2 rounded">Ajouter</button>
      </form>

      {/* Supprimer le compte */}
      <div className="border-t pt-6 mt-6">
        <h2 className="font-semibold mb-2 text-red-600">Zone dangereuse</h2>
        <p className="text-sm text-gray-500 mb-3">La suppression de votre compte est définitive et irréversible.</p>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          {deleting ? "..." : "Supprimer mon compte"}
        </button>
      </div>
    </div>
  )
}

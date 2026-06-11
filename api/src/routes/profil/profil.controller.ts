// Rôle : point d'entrée HTTP du module profil.
// Lit userId depuis le contexte injecté par authMiddleware, valide les inputs
// basiques, délègue à profil.service.ts et retourne le JSON au client.
// Ne touche jamais la base de données directement.
//
// Reçoit les requêtes HTTP profil, récupère userId depuis le contexte JWT,
// appelle le service et renvoie la réponse. Ne touche pas la base directement.
import type { Context } from 'hono'
import * as service from './profil.service.js'
import type { UpdateProfilBody, UpdatePreferencesBody, CreateContactBody } from './profil.types.js'

// ── Profil ────────────────────────────────────────────────────

// GET /api/users/me — retourne les infos déchiffrées du compte connecté
export async function getMe(c: Context) {
  const userId = c.get('userId') as string
  const profil = await service.getProfil(userId)
  if (!profil) return c.json({ error: 'User not found' }, 404)
  return c.json(profil)
}

// PUT /api/users/me — modifie prénom et/ou nom (les deux sont optionnels)
export async function updateMe(c: Context) {
  const userId = c.get('userId') as string
  const body = await c.req.json<UpdateProfilBody>()

  if (!body.firstName && !body.lastName) {
    return c.json({ error: 'Provide at least firstName or lastName' }, 400)
  }

  const updated = await service.updateProfil(userId, body)
  if (!updated) return c.json({ error: 'User not found' }, 404)
  return c.json(updated)
}

// DELETE /api/users/me — supprime le compte et toutes ses données (cascade en base)
export async function deleteMe(c: Context) {
  const userId = c.get('userId') as string
  await service.deleteProfil(userId)
  return c.body(null, 204)
}

// ── Préférences ───────────────────────────────────────────────

// GET /api/users/me/preferences — retourne les préférences notifs et relances
export async function getPreferences(c: Context) {
  const userId = c.get('userId') as string
  const prefs = await service.getPreferences(userId)
  if (!prefs) return c.json({ error: 'User not found' }, 404)
  return c.json(prefs)
}

// PATCH /api/users/me/preferences — patch partiel (un toggle ou un délai à la fois)
export async function updatePreferences(c: Context) {
  const userId = c.get('userId') as string
  const body = await c.req.json<UpdatePreferencesBody>()

  if (!body || (body.notifications === undefined && body.reminders === undefined)) {
    return c.json({ error: 'Provide notifications and/or reminders' }, 400)
  }

  const updated = await service.updatePreferences(userId, body)
  if (!updated) return c.json({ error: 'User not found' }, 404)
  return c.json(updated)
}

// ── Contacts ──────────────────────────────────────────────────

// GET /api/users/me/contacts — liste tous les contacts de l'utilisateur
export async function getContacts(c: Context) {
  const userId = c.get('userId') as string
  const contacts = await service.getContacts(userId)
  return c.json(contacts)
}

// POST /api/users/me/contacts — ajoute un contact après validation du type et des limites
export async function addContact(c: Context) {
  const userId = c.get('userId') as string
  const body = await c.req.json<CreateContactBody>()

  if (!body.type || !body.value) {
    return c.json({ error: 'Fields type and value are required' }, 400)
  }

  const validTypes = ['email', 'phone', 'address']
  if (!validTypes.includes(body.type)) {
    return c.json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400)
  }

  const result = await service.addContact(userId, body)
  // Le service retourne une erreur si la limite max du type est atteinte
  if (result.error) return c.json({ error: result.error }, 422)
  return c.json(result.contact, 201)
}

// DELETE /api/users/me/contacts/:id — supprime un contact (refusé si min atteint)
export async function deleteContact(c: Context) {
  const userId = c.get('userId') as string
  const id = c.req.param('id') ?? ''
  if (!id) return c.json({ error: 'Missing contact id' }, 400)

  const deleted = await service.deleteContact(userId, id)
  if (!deleted) {
    return c.json({ error: 'Contact not found or minimum limit reached' }, 404)
  }
  return c.body(null, 204)
}

// ── Export RGPD (Art. 15) ─────────────────────────────────────

// GET /api/users/me/export — retourne toutes les données personnelles en JSON téléchargeable
export async function exportData(c: Context) {
  const userId = c.get('userId') as string
  const data = await service.exportUserData(userId)
  if (!data) return c.json({ error: 'User not found' }, 404)

  c.header('Content-Disposition', `attachment; filename="export-${userId}.json"`)
  c.header('Content-Type', 'application/json')
  return c.body(JSON.stringify(data, null, 2))
}

// ── Notifications ─────────────────────────────────────────────

// GET /api/users/me/notifications — liste les notifications (ex: réponse à une demande de suppression)
export async function getNotifications(c: Context) {
  const userId = c.get('userId') as string
  const notifs = await service.getNotifications(userId)
  return c.json(notifs)
}

// PATCH /api/users/me/notifications/:id — marque une notification comme lue
export async function markNotificationRead(c: Context) {
  const userId = c.get('userId') as string
  const id = c.req.param('id') ?? ''
  if (!id) return c.json({ error: 'Missing notification id' }, 400)

  const notif = await service.markNotificationRead(userId, id)
  if (!notif) return c.json({ error: 'Notification not found' }, 404)
  return c.json(notif)
}

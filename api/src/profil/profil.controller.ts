import type { Context } from 'hono'
import * as service from './profil.service.js'
import type { UpdateProfilBody, CreateContactBody } from './profil.types.js'

// ── Profil ────────────────────────────────────────────────────

export async function getMe(c: Context) {
  const userId = c.get('userId') as string
  const profil = await service.getProfil(userId)
  if (!profil) return c.json({ error: 'User not found' }, 404)
  return c.json(profil)
}

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

export async function deleteMe(c: Context) {
  const userId = c.get('userId') as string
  await service.deleteProfil(userId)
  return c.body(null, 204)
}

// ── Contacts ──────────────────────────────────────────────────

export async function getContacts(c: Context) {
  const userId = c.get('userId') as string
  const contacts = await service.getContacts(userId)
  return c.json(contacts)
}

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
  if (result.error) return c.json({ error: result.error }, 422)
  return c.json(result.contact, 201)
}

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

// ── Export RGPD ───────────────────────────────────────────────

export async function exportData(c: Context) {
  const userId = c.get('userId') as string
  const data = await service.exportUserData(userId)
  if (!data) return c.json({ error: 'User not found' }, 404)

  c.header('Content-Disposition', `attachment; filename="export-${userId}.json"`)
  c.header('Content-Type', 'application/json')
  return c.json(data)
}

// ── Notifications ─────────────────────────────────────────────

export async function getNotifications(c: Context) {
  const userId = c.get('userId') as string
  const notifs = await service.getNotifications(userId)
  return c.json(notifs)
}

export async function markNotificationRead(c: Context) {
  const userId = c.get('userId') as string
  const id = c.req.param('id') ?? ''
  if (!id) return c.json({ error: 'Missing notification id' }, 400)

  const notif = await service.markNotificationRead(userId, id)
  if (!notif) return c.json({ error: 'Notification not found' }, 404)
  return c.json(notif)
}

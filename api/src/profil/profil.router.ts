import { Hono } from 'hono'
import { authMiddleware } from '../auth/auth.middleware.js'
import * as ctrl from './profil.controller.js'

const profil = new Hono()

// Toutes les routes de ce router sont protégées par JWT
profil.use('/*', authMiddleware)

// ── Profil ────────────────────────────────────────────────────
// GET  /users/me
profil.get('/users/me', ctrl.getMe)

// PUT  /users/me
profil.put('/users/me', ctrl.updateMe)

// DELETE /users/me
profil.delete('/users/me', ctrl.deleteMe)

// ── Contacts ──────────────────────────────────────────────────
// GET  /users/me/contacts
profil.get('/users/me/contacts', ctrl.getContacts)

// POST /users/me/contacts
profil.post('/users/me/contacts', ctrl.addContact)

// DELETE /users/me/contacts/:id
profil.delete('/users/me/contacts/:id', ctrl.deleteContact)

// ── Export RGPD (Art. 15) ──────────────────────────────────────
// GET  /users/me/export
profil.get('/users/me/export', ctrl.exportData)

// ── Notifications ─────────────────────────────────────────────
// GET  /users/me/notifications
profil.get('/users/me/notifications', ctrl.getNotifications)

// PATCH /users/me/notifications/:id
profil.patch('/users/me/notifications/:id', ctrl.markNotificationRead)

export default profil

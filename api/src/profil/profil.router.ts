// Rôle : déclare les routes du module profil, montées sous /api dans index.ts.
// authMiddleware est appliqué sur /* — toutes les routes exigent un JWT valide.
// Couvre : profil (get/update/delete), contacts (list/add/delete),
// export RGPD Art. 15, et notifications.
//
// Définit les routes du profil, montées sous /api dans index.ts.
// Toutes les routes passent par authMiddleware — l'utilisateur doit être connecté.
import { Hono } from 'hono'
import { authMiddleware } from '../auth/auth.middleware.js'
import * as ctrl from './profil.controller.js'

const profil = new Hono()

// Applique authMiddleware sur toutes les routes de ce router
profil.use('/*', authMiddleware)

// ── Profil ────────────────────────────────────────────────────
// GET  /api/users/me          — récupère les infos du compte connecté
profil.get('/users/me', ctrl.getMe)

// PUT  /api/users/me          — modifie prénom et/ou nom
profil.put('/users/me', ctrl.updateMe)

// DELETE /api/users/me        — supprime définitivement le compte
profil.delete('/users/me', ctrl.deleteMe)

// ── Contacts ──────────────────────────────────────────────────
// GET  /api/users/me/contacts         — liste tous les contacts (emails, adresses, téléphones)
profil.get('/users/me/contacts', ctrl.getContacts)

// POST /api/users/me/contacts         — ajoute un contact (limites : 5 emails, 5 adresses, 3 téléphones)
profil.post('/users/me/contacts', ctrl.addContact)

// DELETE /api/users/me/contacts/:id   — supprime un contact (refusé si minimum atteint)
profil.delete('/users/me/contacts/:id', ctrl.deleteContact)

// ── Export RGPD (Art. 15) ──────────────────────────────────────
// GET  /api/users/me/export   — télécharge toutes les données personnelles en JSON
profil.get('/users/me/export', ctrl.exportData)

// ── Notifications ─────────────────────────────────────────────
// GET   /api/users/me/notifications       — liste les notifications de l'utilisateur
profil.get('/users/me/notifications', ctrl.getNotifications)

// PATCH /api/users/me/notifications/:id   — marque une notification comme lue
profil.patch('/users/me/notifications/:id', ctrl.markNotificationRead)

export default profil

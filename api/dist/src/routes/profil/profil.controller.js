import * as service from './profil.service.js';
// ── Profil ────────────────────────────────────────────────────
// GET /api/users/me — retourne les infos déchiffrées du compte connecté
export async function getMe(c) {
    const userId = c.get('userId');
    const profil = await service.getProfil(userId);
    if (!profil)
        return c.json({ error: 'User not found' }, 404);
    return c.json(profil);
}
// PUT /api/users/me — modifie prénom et/ou nom (les deux sont optionnels)
export async function updateMe(c) {
    const userId = c.get('userId');
    const body = await c.req.json();
    if (!body.firstName && !body.lastName) {
        return c.json({ error: 'Provide at least firstName or lastName' }, 400);
    }
    const updated = await service.updateProfil(userId, body);
    if (!updated)
        return c.json({ error: 'User not found' }, 404);
    return c.json(updated);
}
// DELETE /api/users/me — supprime le compte et toutes ses données (cascade en base)
export async function deleteMe(c) {
    const userId = c.get('userId');
    await service.deleteProfil(userId);
    return c.body(null, 204);
}
// ── Contacts ──────────────────────────────────────────────────
// GET /api/users/me/contacts — liste tous les contacts de l'utilisateur
export async function getContacts(c) {
    const userId = c.get('userId');
    const contacts = await service.getContacts(userId);
    return c.json(contacts);
}
// POST /api/users/me/contacts — ajoute un contact après validation du type et des limites
export async function addContact(c) {
    const userId = c.get('userId');
    const body = await c.req.json();
    if (!body.type || !body.value) {
        return c.json({ error: 'Fields type and value are required' }, 400);
    }
    const validTypes = ['email', 'phone', 'address'];
    if (!validTypes.includes(body.type)) {
        return c.json({ error: `type must be one of: ${validTypes.join(', ')}` }, 400);
    }
    const result = await service.addContact(userId, body);
    // Le service retourne une erreur si la limite max du type est atteinte
    if (result.error)
        return c.json({ error: result.error }, 422);
    return c.json(result.contact, 201);
}
// DELETE /api/users/me/contacts/:id — supprime un contact (refusé si min atteint)
export async function deleteContact(c) {
    const userId = c.get('userId');
    const id = c.req.param('id') ?? '';
    if (!id)
        return c.json({ error: 'Missing contact id' }, 400);
    const deleted = await service.deleteContact(userId, id);
    if (!deleted) {
        return c.json({ error: 'Contact not found or minimum limit reached' }, 404);
    }
    return c.body(null, 204);
}
// ── Export RGPD (Art. 15) ─────────────────────────────────────
// GET /api/users/me/export — retourne toutes les données personnelles en JSON téléchargeable
export async function exportData(c) {
    const userId = c.get('userId');
    const data = await service.exportUserData(userId);
    if (!data)
        return c.json({ error: 'User not found' }, 404);
    c.header('Content-Disposition', `attachment; filename="export-${userId}.json"`);
    c.header('Content-Type', 'application/json');
    return c.json(data);
}
// ── Notifications ─────────────────────────────────────────────
// GET /api/users/me/notifications — liste les notifications (ex: réponse à une demande de suppression)
export async function getNotifications(c) {
    const userId = c.get('userId');
    const notifs = await service.getNotifications(userId);
    return c.json(notifs);
}
// PATCH /api/users/me/notifications/:id — marque une notification comme lue
export async function markNotificationRead(c) {
    const userId = c.get('userId');
    const id = c.req.param('id') ?? '';
    if (!id)
        return c.json({ error: 'Missing notification id' }, 400);
    const notif = await service.markNotificationRead(userId, id);
    if (!notif)
        return c.json({ error: 'Notification not found' }, 404);
    return c.json(notif);
}

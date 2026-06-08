// Rôle : définit tous les types TypeScript du module profil.
// Contient les DTOs retournés au client (données déchiffrées), les corps de requêtes
// entrantes (update, ajout de contact) et les règles métier sur les contacts
// (min/max par type : email, phone, address).
//
// Types partagés entre profil.controller.ts et profil.service.ts
// ── Règles métier sur les contacts ────────────────────────────
// min : nombre minimum requis (suppression refusée en dessous)
// max : nombre maximum autorisé (ajout refusé au-dessus)
export const CONTACT_LIMITS = {
    email: { min: 1, max: 5 },
    phone: { min: 0, max: 3 },
    address: { min: 1, max: 5 },
};

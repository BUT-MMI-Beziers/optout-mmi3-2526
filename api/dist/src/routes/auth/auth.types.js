// Rôle : définit tous les types TypeScript utilisés par le module auth.
// Contient la structure du JWT (JWTPayload), les corps de requêtes (register, login,
// changePassword) et les types de réponse. Centralise aussi la déclaration des
// variables injectées dans le contexte Hono (userId, userRole) pour que les
// controllers puissent les lire avec le bon type via c.get().
//
// Types partagés entre les fichiers auth (middleware, controller, service)
export {};

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

// ============================================================================
// IMPORTS DES ROUTEURS (Modules métiers)
// ============================================================================
import { templatesRoutes } from './routes/templates.routes'
import { requestsRoutes } from './routes/requests.routes'

// Initialisation de l'application principale
const app = new Hono()

// ============================================================================
// MIDDLEWARES GLOBAUX
// ============================================================================
// Activation du CORS pour autoriser les requêtes provenant du frontend
app.use('/*', cors())

// ============================================================================
// ROUTE DE SANTÉ (Healthcheck)
// ============================================================================
// Permet de vérifier rapidement que le serveur est démarré et fonctionnel
app.get('/', (c) => {
  return c.json({ message: 'Float API is running' })
})

// ============================================================================
// ROUTAGE DE L'API (v1)
// ============================================================================
// Délégation des sous-routes aux routeurs spécifiques par domaine
app.route('/api/v1/templates', templatesRoutes)
app.route('/api/v1/requests', requestsRoutes)

// ============================================================================
// DÉMARRAGE DU SERVEUR
// ============================================================================
serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0'
})
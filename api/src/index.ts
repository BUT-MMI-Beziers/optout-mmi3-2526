import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

// Import du routeur dédié aux templates (créé lors de la refacto)
import { templatesRoutes } from './routes/templates.routes'

const app = new Hono()

// Activation du CORS pour permettre au frontend de communiquer avec l'API
app.use('/*', cors())

// Route de vérification de santé de l'API (Healthcheck)
app.get('/', (c) => {
  return c.json({ message: 'Float API is running' })
})

// ============================================================================
// DÉCLARATION DES ROUTES
// ============================================================================

// Branchement du routeur des templates. 
// Toutes les routes définies dans templatesRoutes seront automatiquement 
// préfixées par /api/v1/templates
app.route('/api/v1/templates', templatesRoutes)

// Démarrage du serveur
serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0'
})
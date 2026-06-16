import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readFileSync } from 'fs'
import path from 'path'
import * as yaml from 'js-yaml'
import brokersRoute from './routes/brokers.routes.js'
import templatesRoutes from './routes/templates.routes.js'
import requestsRoutes from './routes/requests.routes.js'
import { statsRoutes } from './routes/stats.routes.js'
import authRouter from './routes/auth/auth.router.js'
import profilRouter from './routes/profil/profil.router.js'

const app = new Hono()

app.use('/*', cors())

// Routes de documentation
app.get('/openapi.json', (c) => {
  try {
    const openapiPath = path.resolve(process.cwd(), 'openapi.yaml')
    const fileContent = readFileSync(openapiPath, 'utf8')
    const openapiSpec = yaml.load(fileContent) as Record<string, unknown>

    console.log('Version détectée:', openapiSpec?.openapi)

    return c.json(openapiSpec)
  } catch (error) {
    console.error("Impossible de charger le fichier openapi.yaml :", error)
    return c.json({ error: "Erreur de chargement de la spécification OpenAPI" }, 500)
  }
})
app.get('/docs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Documentation API - OptOut</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
            ],
          });
        };
      </script>
    </body>
    </html>
  `)
})

app.route('/api/v1/brokers', brokersRoute)
app.route('/api/v1/auth', authRouter)
app.route('/api/v1', profilRouter)
app.route('/api/v1/templates', templatesRoutes)
app.route('/api/v1/requests', requestsRoutes)
app.route('/api/v1/stats', statsRoutes)

const port = Number(process.env.API_PORT_INTERNAL) || 3000

serve({ fetch: app.fetch, port })
console.log(`API démarrée sur http://localhost:${port}`)
console.log(`Documentation disponible sur http://localhost:${port}/docs`)

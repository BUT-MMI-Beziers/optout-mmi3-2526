import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import brokersRoute from './routes/brokers.routes.js'
import templatesRoutes from './routes/templates.routes.js'
import requestsRoutes from './routes/requests.routes.js'
import { statsRoutes } from './routes/stats.routes.js'
import { usersRoutes } from './routes/users.routes.js'
import authRouter from './routes/auth/auth.router.js'
import profilRouter from './routes/profil/profil.router.js'
import { swaggerUI } from '@hono/swagger-ui'
import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'  // déjà installé dans ton projet

const spec = load(readFileSync('./src/docs/openapi.yaml', 'utf-8'))
const app = new Hono()

app.use('/*', cors())

app.route('/api/v1/brokers', brokersRoute)
app.route('/api/v1/auth', authRouter)
app.route('/api/v1', profilRouter)
app.route('/api/v1/templates', templatesRoutes)
app.route('/api/v1/requests', requestsRoutes)
app.route('/api/v1/stats', statsRoutes)
app.route('/api/v1/users', usersRoutes)

//Docs
app.get('/api/docs/spec', (c) => c.json(spec))
app.get('/api/docs', swaggerUI({ url: '/api/docs/spec' }))

const port = Number(process.env.API_PORT_INTERNAL) || 3000

serve({ fetch: app.fetch, port })
console.log(`API démarrée sur http://localhost:${port}`)
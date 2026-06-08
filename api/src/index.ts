import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import brokersRoute from './routes/brokers.js'
import authRouter from './routes/auth/auth.router.js'
import profilRouter from './routes/profil/profil.router.js'
import templatesRoutes from './routes/templates.routes.js'
import requestsRoutes from './routes/requests.routes.js'

const app = new Hono()

app.use('/*', cors())

app.route('/api/v1/brokers', brokersRoute)
app.route('/api/v1/auth', authRouter)
app.route('/api/v1', profilRouter)
app.route('/api/v1/templates', templatesRoutes)
app.route('/api/v1/requests', requestsRoutes)

const port = Number(process.env.API_PORT_INTERNAL) || 3000

serve({ fetch: app.fetch, port })
console.log(`API démarrée sur http://localhost:${port}`)

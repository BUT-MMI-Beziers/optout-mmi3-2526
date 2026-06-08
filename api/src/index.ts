import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import brokersRoute from './routes/brokers.js'
import templatesRoutes from './routes/templates.routes.js'
import requestsRoutes from './routes/requests.routes.js'
import { statsRoutes } from './routes/stats.routes.js'

const app = new Hono()

app.route('/api/v1/brokers', brokersRoute)
app.route('/api/v1/templates', templatesRoutes)
app.route('/api/v1/requests', requestsRoutes)
app.route('/api/v1/stats', statsRoutes)


const port = Number(process.env.API_PORT_INTERNAL) || 3000

serve({ fetch: app.fetch, port })
console.log(`API démarrée sur http://localhost:${port}`)
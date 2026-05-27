import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import brokersRoute from './routes/brokers.js'
import authRouter from './auth/auth.router.js'
import profilRouter from './profil/profil.router.js'

const app = new Hono()

app.use('/*', cors())

app.route('/api/brokers', brokersRoute)
app.route('/api/auth', authRouter)
app.route('/api', profilRouter)

const port = Number(process.env.API_PORT_INTERNAL) || 3000

serve({ fetch: app.fetch, port })
console.log(`API démarrée sur http://localhost:${port}`)

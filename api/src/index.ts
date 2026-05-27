import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import authRouter from './auth/auth.router.js'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Float API is running' })
})

// Caddy strip /api prefix before forwarding → API receives /v1/...
app.route('/v1/auth', authRouter)

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0',
})

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

import { templatesRoutes } from './routes/templates.routes'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Float API is running' })
})

// mount routes
app.route('/api/v1/templates', templatesRoutes)

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
  hostname: '0.0.0.0'
})
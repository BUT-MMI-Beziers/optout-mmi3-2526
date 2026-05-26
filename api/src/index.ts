import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { migrate } from './db/migrate.js'
import { csrfMiddleware } from './middleware/csrf.js'
import authRouter from './routes/auth.js'

const app = new Hono()

app.use(
  '/*',
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost',
    credentials: true,
  }),
)

app.use('/v1/*', csrfMiddleware)

app.get('/', (c) => c.json({ message: 'Float API is running' }))

app.route('/v1/auth', authRouter)

migrate()
  .then(() => {
    serve({
      fetch: app.fetch,
      port: Number(process.env.PORT) || 3000,
      hostname: '0.0.0.0',
    })
    console.log(`[API] listening on port ${process.env.PORT ?? 3000}`)
  })
  .catch((err) => {
    console.error('[API] startup failed:', err)
    process.exit(1)
  })

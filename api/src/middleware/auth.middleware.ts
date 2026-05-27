import { createMiddleware } from 'hono/factory'
import { verify } from 'jsonwebtoken'

export interface JwtPayload {
  sub: string   // user UUID
  email: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')

  try {
    const payload = verify(token, secret) as JwtPayload
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

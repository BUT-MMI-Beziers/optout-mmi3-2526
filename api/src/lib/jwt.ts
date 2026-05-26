import { sign, verify } from 'hono/jwt'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'change-me-access'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh'
const ACCESS_TTL = 60 * 15 // 15 minutes
const REFRESH_TTL = 60 * 60 * 24 * 7 // 7 days

export type AccessTokenPayload = {
  sub: string
  email: string
  exp: number
}

export const signAccessToken = (userId: string, email: string) =>
  sign(
    { sub: userId, email, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL },
    ACCESS_SECRET,
    'HS256',
  )

export const verifyAccessToken = (token: string) =>
  verify(token, ACCESS_SECRET, 'HS256') as Promise<AccessTokenPayload>

export const signRefreshToken = (userId: string, tokenId: string) =>
  sign(
    {
      sub: userId,
      jti: tokenId,
      exp: Math.floor(Date.now() / 1000) + REFRESH_TTL,
    },
    REFRESH_SECRET,
    'HS256',
  )

export const verifyRefreshToken = (token: string) =>
  verify(token, REFRESH_SECRET, 'HS256') as Promise<{
    sub: string
    jti: string
    exp: number
  }>

export { REFRESH_TTL }

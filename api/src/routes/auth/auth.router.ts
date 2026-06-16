// Rôle : déclare les routes du module auth et branche les middlewares.
// Les tokens transitent uniquement par cookies HttpOnly — jamais dans le body.
import { Hono } from 'hono'
import { authMiddleware, loginRateLimiter } from './auth.middleware.js'
import { register, login, logout, refresh, changePassword, getSessions, revokeSessionById, revokeOtherSessions } from './auth.controller.js'
import { setupTotp, activateTotp, deactivateTotp, solveChallenge } from './totp.controller.js'
import { startPasskeyRegistration, finishPasskeyRegistration, startPasskeyAuthentication, finishPasskeyAuthentication, listPasskeys, deletePasskey } from './passkey.controller.js'

const authRouter = new Hono()

// loginRateLimiter bloque après 5 tentatives par IP sur 15 minutes
authRouter.post('/register', loginRateLimiter, register)
authRouter.post('/login',    loginRateLimiter, login)

// /refresh n'a pas besoin d'authMiddleware — le refresh token est vérifié en base
authRouter.post('/refresh', refresh)

// authMiddleware requis : révoque le refresh token en base et efface les cookies
authRouter.post('/logout', authMiddleware, logout)

// authMiddleware requis : l'utilisateur doit être connecté pour changer son mot de passe
authRouter.patch('/password', authMiddleware, changePassword)

// Sessions
authRouter.get('/sessions',        authMiddleware, getSessions)
authRouter.delete('/sessions',     authMiddleware, revokeOtherSessions)
authRouter.delete('/sessions/:id', authMiddleware, revokeSessionById)

// TOTP 2FA
authRouter.get('/totp/setup',       authMiddleware, setupTotp)
authRouter.post('/totp/activate',   authMiddleware, activateTotp)
authRouter.delete('/totp',          authMiddleware, deactivateTotp)
authRouter.post('/totp/challenge',  loginRateLimiter, solveChallenge)

// Passkeys (WebAuthn/FIDO2)
authRouter.get('/passkey/register/start',   authMiddleware, startPasskeyRegistration)
authRouter.post('/passkey/register/finish',  authMiddleware, finishPasskeyRegistration)
authRouter.get('/passkey/auth/start',        startPasskeyAuthentication)
authRouter.post('/passkey/auth/finish',      loginRateLimiter, finishPasskeyAuthentication)
authRouter.get('/passkeys',                  authMiddleware, listPasskeys)
authRouter.delete('/passkeys/:id',           authMiddleware, deletePasskey)

export default authRouter

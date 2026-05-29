// Définit les routes de l'authentification, montées sous /api/auth dans index.ts
import { Hono } from 'hono'
import { authMiddleware, loginRateLimiter } from './auth.middleware.js'
import { register, login, logout, changePassword } from './auth.controller.js'

const authRouter = new Hono()

// loginRateLimiter bloque après 5 tentatives par IP sur 15 minutes
authRouter.post('/register', loginRateLimiter, register)
authRouter.post('/login',    loginRateLimiter, login)
authRouter.post('/logout',   logout)
// authMiddleware vérifie le JWT — l'utilisateur doit être connecté pour changer son mot de passe
authRouter.patch('/password', authMiddleware, changePassword)

export default authRouter

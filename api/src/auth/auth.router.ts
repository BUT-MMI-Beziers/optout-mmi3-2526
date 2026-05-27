import { Hono } from 'hono'
import { authMiddleware, loginRateLimiter } from './auth.middleware.js'
import { register, login, logout, changePassword } from './auth.controller.js'

const authRouter = new Hono()

authRouter.post('/register', loginRateLimiter, register)
authRouter.post('/login',    loginRateLimiter, login)
authRouter.post('/logout',   logout)
authRouter.patch('/password', authMiddleware, changePassword)

export default authRouter

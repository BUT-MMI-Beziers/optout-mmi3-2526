// Rôle : déclare les routes du module auth et branche les middlewares.
// Les tokens transitent uniquement par cookies HttpOnly — jamais dans le body.
import { Hono } from 'hono';
import { authMiddleware, loginRateLimiter } from './auth.middleware.js';
import { register, login, logout, refresh, changePassword } from './auth.controller.js';
const authRouter = new Hono();
// loginRateLimiter bloque après 5 tentatives par IP sur 15 minutes
authRouter.post('/register', loginRateLimiter, register);
authRouter.post('/login', loginRateLimiter, login);
// /refresh n'a pas besoin d'authMiddleware — le refresh token est vérifié en base
authRouter.post('/refresh', refresh);
// authMiddleware requis : révoque le refresh token en base et efface les cookies
authRouter.post('/logout', authMiddleware, logout);
// authMiddleware requis : l'utilisateur doit être connecté pour changer son mot de passe
authRouter.patch('/password', authMiddleware, changePassword);
export default authRouter;

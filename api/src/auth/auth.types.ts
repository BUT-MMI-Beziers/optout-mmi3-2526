// Rôle : définit tous les types TypeScript utilisés par le module auth.
// Contient la structure du JWT (JWTPayload), les corps de requêtes (register, login,
// changePassword) et les types de réponse. Centralise aussi la déclaration des
// variables injectées dans le contexte Hono (userId, userRole) pour que les
// controllers puissent les lire avec le bon type via c.get().
//
// Types partagés entre les fichiers auth (middleware, controller, service)

// Structure du payload embarqué dans le token JWT
export interface JWTPayload {
  sub: string             // userId (UUID)
  role: 'user' | 'admin'
  exp: number             // timestamp d'expiration (Unix)
  iat: number             // timestamp d'émission (Unix)
}

// Déclare les variables injectées dans le contexte Hono par authMiddleware.
// Permet d'utiliser c.get('userId') avec le bon type dans tous les controllers.
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    userRole: 'user' | 'admin'
  }
}

// Corps de la requête POST /register
export interface RegisterBody {
  email: string
  password: string
  firstName: string
  lastName: string
}

// Corps de la requête POST /login
export interface LoginBody {
  email: string
  password: string
}

// Corps de la requête PATCH /password
export interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
}

export interface LogoutBody {
  refreshToken: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUserInfo {
  id: string
  email: string
  role: 'user' | 'admin'
}

export interface AuthResponse extends AuthTokens {
  user: AuthUserInfo
}

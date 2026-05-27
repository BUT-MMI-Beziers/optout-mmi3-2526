// Payload embarqué dans l'access token JWT
export interface JWTPayload {
  sub: string             // userId (UUID)
  role: 'user' | 'admin'
  exp: number
  iat: number
}

// Variables injectées dans le contexte Hono par authMiddleware
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    userRole: 'user' | 'admin'
  }
}

export interface RegisterBody {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginBody {
  email: string
  password: string
}

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

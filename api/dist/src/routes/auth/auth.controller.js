import * as authService from './auth.service.js';
const IS_PROD = process.env.NODE_ENV === 'production';
// Construit la valeur d'un Set-Cookie HttpOnly Secure SameSite=Strict.
function buildCookie(name, value, maxAge) {
    const parts = [
        `${name}=${value}`,
        `Max-Age=${maxAge}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
    ];
    if (IS_PROD)
        parts.push('Secure');
    return parts.join('; ');
}
function clearCookie(name) {
    return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}
// ── Helpers de validation ───────────────────────────────────────────────────
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePassword(password) {
    if (password.length < 8)
        return 'Le mot de passe doit contenir au moins 8 caractères';
    return null;
}
// ── POST /api/auth/register ─────────────────────────────────────────────────
export async function register(c) {
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Corps JSON invalide' }, 400);
    }
    const { email, password, firstName, lastName } = body;
    if (!email || !password || !firstName || !lastName) {
        return c.json({ error: 'email, password, firstName et lastName sont requis' }, 400);
    }
    if (!isValidEmail(email)) {
        return c.json({ error: 'Format d\'email invalide' }, 400);
    }
    const pwError = validatePassword(password);
    if (pwError)
        return c.json({ error: pwError }, 400);
    const existing = await authService.findUserByEmail(email.toLowerCase());
    if (existing) {
        return c.json({ error: 'Cet email est déjà utilisé' }, 409);
    }
    const user = await authService.createUser({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
    });
    const tokens = await authService.generateTokens(user.id, user.role);
    c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true });
    c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true });
    return c.json({ user }, 201);
}
// ── POST /api/auth/login ────────────────────────────────────────────────────
export async function login(c) {
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Corps JSON invalide' }, 400);
    }
    const { email, password } = body;
    if (!email || !password) {
        return c.json({ error: 'email et password sont requis' }, 400);
    }
    const user = await authService.findUserByEmail(email.toLowerCase());
    // Message volontairement vague pour ne pas révéler si l'email existe en base
    if (!user) {
        return c.json({ error: 'Identifiants invalides' }, 401);
    }
    const valid = await authService.verifyPassword(password, user.passwordHash);
    if (!valid) {
        return c.json({ error: 'Identifiants invalides' }, 401);
    }
    const tokens = await authService.generateTokens(user.id, user.role);
    c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true });
    c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true });
    return c.json({ user: { id: user.id, email: user.email, role: user.role } });
}
// ── POST /api/auth/refresh ──────────────────────────────────────────────────
// Échange le refresh token (cookie HttpOnly) contre un nouvel access token.
// Rotation : un nouveau refresh token est émis et l'ancien invalidé en base.
// Le refresh token a le format "<userId>.<random>" — userId extrait sans JWT.
export async function refresh(c) {
    const refreshToken = getCookieValue(c, 'refreshToken');
    if (!refreshToken) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const userId = refreshToken.split('.')[0];
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const user = await authService.verifyRefreshToken(userId, refreshToken);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const tokens = await authService.generateTokens(user.id, user.role);
    c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true });
    c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true });
    return c.json({ ok: true });
}
// ── POST /api/auth/logout ───────────────────────────────────────────────────
// Révoque le refresh token en base et efface les deux cookies.
export async function logout(c) {
    const userId = c.get('userId');
    if (userId) {
        await authService.revokeRefreshToken(userId);
    }
    c.header('Set-Cookie', clearCookie('accessToken'), { append: true });
    c.header('Set-Cookie', clearCookie('refreshToken'), { append: true });
    return c.json({ message: 'Déconnexion réussie' });
}
// ── PATCH /api/auth/password ────────────────────────────────────────────────
export async function changePassword(c) {
    const userId = c.get('userId');
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Corps JSON invalide' }, 400);
    }
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
        return c.json({ error: 'currentPassword et newPassword sont requis' }, 400);
    }
    const pwError = validatePassword(newPassword);
    if (pwError)
        return c.json({ error: pwError }, 400);
    const user = await authService.findUserById(userId);
    if (!user)
        return c.json({ error: 'Utilisateur introuvable' }, 404);
    const valid = await authService.verifyPassword(currentPassword, user.passwordHash);
    if (!valid)
        return c.json({ error: 'Mot de passe actuel incorrect' }, 400);
    await authService.updatePassword(userId, newPassword);
    // Révoque le refresh token pour forcer une reconnexion sur tous les appareils
    await authService.revokeRefreshToken(userId);
    c.header('Set-Cookie', clearCookie('accessToken'), { append: true });
    c.header('Set-Cookie', clearCookie('refreshToken'), { append: true });
    return c.json({ message: 'Mot de passe mis à jour. Veuillez vous reconnecter.' });
}
// ── Utilitaire ──────────────────────────────────────────────────────────────
function getCookieValue(c, name) {
    const cookieHeader = c.req.header('Cookie') ?? '';
    for (const part of cookieHeader.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name)
            return rest.join('=');
    }
    return undefined;
}

import { Hono } from 'hono';
import { db } from '../db/index.js';
import { brokers } from '../db/schema.js';
import { and, eq, ilike } from 'drizzle-orm';
import * as yaml from 'js-yaml';
import { authMiddleware, adminGuard } from './auth/auth.middleware.js';
const brokersRoute = new Hono();
function toSlug(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
// ─── GET / ────────────────────────────────────────────────
brokersRoute.get('/', async (c) => {
    try {
        const category = c.req.query('category');
        const region = c.req.query('region');
        const difficulty = c.req.query('difficulty');
        const search = c.req.query('search');
        const isVerifiedStr = c.req.query('isVerified');
        const pageParam = c.req.query('page');
        const perPageParam = c.req.query('per_page') || c.req.query('limit');
        const parsedPage = parseInt(pageParam || '1', 10);
        const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
        const parsedPerPage = parseInt(perPageParam || '20', 10);
        const perPage = Math.max(1, isNaN(parsedPerPage) ? 20 : parsedPerPage);
        const offset = (page - 1) * perPage;
        const conditions = [];
        if (category) {
            conditions.push(eq(brokers.category, category));
        }
        if (region) {
            conditions.push(eq(brokers.region, region));
        }
        if (difficulty) {
            conditions.push(eq(brokers.difficulty, difficulty));
        }
        if (isVerifiedStr) {
            conditions.push(eq(brokers.isVerified, isVerifiedStr === 'true'));
        }
        if (search) {
            conditions.push(ilike(brokers.name, `%${search}%`));
        }
        // 1. Récupérer le total des éléments correspondants pour calculer la pagination
        const countQuery = db.select({ id: brokers.id }).from(brokers);
        const allMatching = conditions.length > 0
            ? await countQuery.where(and(...conditions))
            : await countQuery;
        const total = allMatching.length;
        // 2. Récupérer les éléments paginés
        const dataQuery = db.select().from(brokers);
        const results = conditions.length > 0
            ? await dataQuery.where(and(...conditions)).limit(perPage).offset(offset)
            : await dataQuery.limit(perPage).offset(offset);
        const lastPage = Math.ceil(total / perPage) || 1;
        return c.json({
            data: results,
            total,
            currentPage: page,
            lastPage
        });
    }
    catch (error) {
        console.error('Error fetching brokers:', error);
        return c.json({ error: 'Une erreur interne est survenue lors de la récupération des brokers' }, 500);
    }
});
// ─── POST /brokers ───────────────────────────────────────
brokersRoute.post('/', async (c) => {
    const body = await c.req.json();
    const required = ['name', 'emailContact', 'category',
        'region', 'optOutMethod', 'difficulty', 'legalBasis'];
    for (const field of required) {
        if (!body[field]) {
            return c.json({ error: `Champ manquant : ${field}` }, 400);
        }
    }
    try {
        const [newBroker] = await db
            .insert(brokers)
            .values({
            name: body.name,
            slug: toSlug(body.name),
            emailContact: body.emailContact,
            website: body.website ?? null,
            optOutUrl: body.optOutUrl ?? null,
            category: body.category,
            region: body.region,
            country: body.country ?? null,
            optOutMethod: body.optOutMethod,
            difficulty: body.difficulty,
            legalBasis: body.legalBasis,
            notes: body.notes ?? null,
            isVerified: false,
        })
            .returning();
        return c.json(newBroker, 201);
    }
    catch (err) {
        if (err.code === '23505' || err.cause?.code === '23505') {
            return c.json({ error: `Un broker avec le nom "${body.name}" existe déjà` }, 409);
        }
        console.error('Erreur POST /brokers:', err);
        return c.json({ error: 'Erreur interne lors de la création du broker' }, 500);
    }
});
// ─── GET /brokers/export ─────────────────────────────────
brokersRoute.get('/export', async (c) => {
    const allBrokers = await db
        .select()
        .from(brokers);
    const format = c.req.query('format') ?? 'json'; // ?format=yaml ou ?format=json
    const date = new Date().toISOString().split('T')[0];
    const data = {
        exportedAt: new Date().toISOString(),
        count: allBrokers.length,
        brokers: allBrokers,
    };
    if (format === 'yaml') {
        const filename = `brokers-export-${date}.yaml`;
        c.header('Content-Disposition', `attachment; filename="${filename}"`);
        c.header('Content-Type', 'application/yaml');
        return c.text(yaml.dump(data));
    }
    const filename = `brokers-export-${date}.json`;
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Type', 'application/json');
    return c.json(data);
});
// ─── POST /brokers/import ────────────────────────────────
brokersRoute.post('/import', async (c) => {
    const contentType = c.req.header('Content-Type') ?? '';
    let list;
    try {
        // Détecte automatiquement JSON ou YAML selon le Content-Type
        if (contentType.includes('yaml')) {
            const text = await c.req.text();
            const parsed = yaml.load(text);
            list = Array.isArray(parsed) ? parsed : parsed?.brokers;
        }
        else {
            const body = await c.req.json();
            list = Array.isArray(body) ? body : body.brokers;
        }
    }
    catch (err) {
        return c.json({ error: `Erreur de parsing du fichier : ${err.message}` }, 400);
    }
    if (!Array.isArray(list) || list.length === 0) {
        return c.json({ error: 'Body invalide : tableau de brokers attendu' }, 400);
    }
    const rows = list.map((b) => ({
        name: b.name,
        slug: b.slug ?? toSlug(b.name),
        emailContact: b.emailContact ?? b.email_contact ?? "no-email@optout.local",
        website: b.website ?? null,
        optOutUrl: b.optOutUrl ?? b.opt_out_url ?? null,
        category: b.category,
        region: b.region,
        country: b.country ?? null,
        optOutMethod: b.optOutMethod ?? b.opt_out_method,
        difficulty: b.difficulty,
        legalBasis: b.legalBasis ?? b.legal_basis,
        notes: b.notes ?? null,
        isVerified: b.isVerified ?? false,
    }));
    try {
        const inserted = await db
            .insert(brokers)
            .values(rows)
            .onConflictDoNothing()
            .returning();
        return c.json({
            imported: inserted.length,
            skipped: rows.length - inserted.length,
            brokers: inserted,
        }, 201);
    }
    catch (err) {
        return c.json({ error: `Erreur lors de l'insertion en base de données : ${err.message}` }, 500);
    }
});
// ─── GET /brokers/:slug ────────────────────────────────
brokersRoute.get('/:slug', async (c) => {
    const slug = c.req.param('slug');
    const [broker] = await db
        .select()
        .from(brokers)
        .where(eq(brokers.slug, slug))
        .limit(1);
    if (!broker) {
        return c.json({ error: 'Broker introuvable' }, 404);
    }
    return c.json(broker);
});
// ─── PUT /brokers/:slug ──────────────────────────────────
brokersRoute.put('/:slug', authMiddleware, adminGuard, async (c) => {
    const slug = c.req.param('slug');
    const body = await c.req.json();
    const [existing] = await db
        .select()
        .from(brokers)
        .where(eq(brokers.slug, slug))
        .limit(1);
    if (!existing) {
        return c.json({ error: 'Broker introuvable' }, 404);
    }
    const nextName = body.name ?? existing.name;
    const [updatedBroker] = await db
        .update(brokers)
        .set({
        name: nextName,
        slug: body.name ? toSlug(nextName) : existing.slug,
        emailContact: body.emailContact ?? existing.emailContact,
        website: body.website ?? existing.website,
        optOutUrl: body.optOutUrl ?? existing.optOutUrl,
        category: body.category ?? existing.category,
        region: body.region ?? existing.region,
        country: body.country ?? existing.country,
        optOutMethod: body.optOutMethod ?? existing.optOutMethod,
        difficulty: body.difficulty ?? existing.difficulty,
        legalBasis: body.legalBasis ?? existing.legalBasis,
        notes: body.notes ?? existing.notes,
        updatedAt: new Date(),
    })
        .where(eq(brokers.slug, slug))
        .returning();
    return c.json(updatedBroker);
});
// ─── DELETE /brokers/:slug ────────────────────────────────
brokersRoute.delete('/:slug', authMiddleware, adminGuard, async (c) => {
    const slug = c.req.param('slug');
    const [deletedBroker] = await db
        .delete(brokers)
        .where(eq(brokers.slug, slug))
        .returning();
    if (!deletedBroker) {
        return c.json({ error: 'Broker introuvable' }, 404);
    }
    return c.json({ success: true, broker: deletedBroker });
});
// ─── PATCH /brokers/:slug/verify ─────────────────────────
brokersRoute.patch('/:slug/verify', authMiddleware, adminGuard, async (c) => {
    const slug = c.req.param('slug');
    const [verifiedBroker] = await db
        .update(brokers)
        .set({
        isVerified: true,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
    })
        .where(eq(brokers.slug, slug))
        .returning();
    if (!verifiedBroker) {
        return c.json({ error: 'Broker introuvable' }, 404);
    }
    return c.json(verifiedBroker);
});
export default brokersRoute;

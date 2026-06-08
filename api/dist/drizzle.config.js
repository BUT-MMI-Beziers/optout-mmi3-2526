import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';
const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });
export default defineConfig({
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});

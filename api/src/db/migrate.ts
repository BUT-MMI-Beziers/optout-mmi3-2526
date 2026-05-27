import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as dotenv from 'dotenv'
import { seedTemplates } from './seeds/template_mails_seed.js'
import { seedBrokers } from './seeds/brokers_seed.js'

// Charge l'environnement depuis le fichier de configuration racine
dotenv.config({ path: '../.env' })

const databaseUrl = process.env.DATABASE_URL!
if (!databaseUrl) {
  console.error('Error: DATABASE_URL is not defined in environment variables.')
  process.exit(1)
}

async function main() {
  console.log('Connecting to database to apply migrations...')

  let retries = 10
  let client: postgres.Sql | null = null

  // Boucle d'attente active pour s'assurer que PostgreSQL est prêt à accepter des connexions
  while (retries > 0) {
    try {
      client = postgres(databaseUrl, { max: 1 })
      await client`SELECT 1`
      break
    } catch (err) {
      console.log(`Database is not ready yet, retrying in 2 seconds... (${retries} attempts left)`)
      if (client) {
        await client.end()
      }
      retries -= 1
      if (retries === 0) {
        console.error('Error: Could not connect to the database. Exiting.', err)
        process.exit(1)
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  if (!client) {
    console.error('Error: Database client was not initialized.')
    process.exit(1)
  }

  const db = drizzle(client)

  try {
    console.log('Running database migrations...')
    // Applique les migrations présentes dans le dossier
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    console.log('Migrations applied successfully!')

    // Exécute les seeds indispensables
    await seedTemplates(db)
    await seedBrokers(db)
  } catch (error) {
    console.error('Failed to run migrations or seeds:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Database connection closed.')
  }
}

main()

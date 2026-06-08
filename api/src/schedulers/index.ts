import { runReminderScheduler } from './reminder.scheduler.js'

// ============================================================
// LANCEUR DES SCHEDULERS
// Délai de 10s au démarrage pour laisser Postgres s'initialiser
// Puis toutes les 24h
// ============================================================

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const STARTUP_DELAY_MS = 10_000 // 10 secondes

async function startSchedulers() {
  console.log('[schedulers] Démarrage dans 10s (attente Postgres)...')

  await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY_MS))

  console.log('[schedulers] Démarrage des schedulers...')

  // Lancement immédiat après le délai
  await runReminderScheduler()

  // Puis toutes les 24h
  setInterval(async () => {
    await runReminderScheduler()
  }, TWENTY_FOUR_HOURS_MS)
}

startSchedulers()
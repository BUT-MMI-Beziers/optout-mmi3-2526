import { runReminderScheduler } from './reminder.scheduler.js'
import { runFormalNoticeScheduler } from './reminder.scheduler.js'
import { runManualReminderScheduler } from './reminder.scheduler.js'

// ============================================================
// LANCEUR DES SCHEDULERS
// Délai de 10s au démarrage pour laisser Postgres s'initialiser
// Puis toutes les 24h
// ============================================================

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const STARTUP_DELAY_MS = 10_000

async function startSchedulers() {
  console.log('[schedulers] Démarrage dans 10s (attente Postgres)...')

  await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY_MS))

  console.log('[schedulers] Démarrage des schedulers...')

  // Lancement immédiat au démarrage
  await runReminderScheduler()       // F16 — 30j
  await runFormalNoticeScheduler()   // F17 — 60j
  await runManualReminderScheduler() // F18 — relances manuelles

  // Puis toutes les 24h
  setInterval(async () => {
    await runReminderScheduler()
    await runFormalNoticeScheduler()
    await runManualReminderScheduler()
  }, TWENTY_FOUR_HOURS_MS)
}

startSchedulers()
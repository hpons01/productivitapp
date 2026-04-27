import { registerHabitsIpc } from './habits.ipc'
import { registerPomodoroIpc } from './pomodoro.ipc'
import { registerTasksIpc } from './tasks.ipc'
import { registerJournalIpc } from './journal.ipc'
import { registerEnergyIpc } from './energy.ipc'
import { registerAnalyticsIpc } from './analytics.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerLootIpc } from './loot.ipc'
import { registerExportIpc } from './export.ipc'
import { registerWindowIpc } from './window.ipc'
import { registerPetsIpc } from './pets.ipc'
import { registerQuestsIpc } from './quests.ipc'
import { registerUpdaterIpc } from './updater.ipc'
import { registerShopIpc } from './shop.ipc'
import { registerAuthIpc } from './auth.ipc'
import { registerSyncIpc } from './sync.ipc'

export function registerAllIpcHandlers(): void {
  registerHabitsIpc()
  registerPomodoroIpc()
  registerTasksIpc()
  registerJournalIpc()
  registerEnergyIpc()
  registerAnalyticsIpc()
  registerSettingsIpc()
  registerLootIpc()
  registerExportIpc()
  registerWindowIpc()
  registerPetsIpc()
  registerQuestsIpc()
  registerUpdaterIpc()
  registerShopIpc()
  registerAuthIpc()
  registerSyncIpc()
}

import { registerHabitsIpc } from './habits.ipc'
import { registerPomodoroIpc } from './pomodoro.ipc'
import { registerTasksIpc } from './tasks.ipc'
import { registerJournalIpc } from './journal.ipc'
import { registerEnergyIpc } from './energy.ipc'
import { registerAnalyticsIpc } from './analytics.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerLootIpc } from './loot.ipc'

export function registerAllIpcHandlers(): void {
  registerHabitsIpc()
  registerPomodoroIpc()
  registerTasksIpc()
  registerJournalIpc()
  registerEnergyIpc()
  registerAnalyticsIpc()
  registerSettingsIpc()
  registerLootIpc()
}

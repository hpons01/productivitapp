import { app, ipcMain } from 'electron'
import { getDb } from '../db'
import { getSetting, setSetting, getAllSettings } from '../db/queries/settings.queries'
import { scheduleNotifications } from '../notifications'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_event, key: string) => {
    const db = getDb()
    return getSetting(db, key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    const db = getDb()
    setSetting(db, key, value)

    if (key === 'start_on_boot') {
      app.setLoginItemSettings({
        openAtLogin: value === 'true'
      })
    }

    // Re-schedule notifications if notification settings changed
    if (key.startsWith('notification_')) {
      scheduleNotifications()
    }

    return { success: true }
  })

  ipcMain.handle('settings:getAll', () => {
    const db = getDb()
    return getAllSettings(db)
  })

  ipcMain.handle('settings:resetOnboarding', () => {
    const db = getDb()

    const resetJourney = db.transaction(() => {
      db.exec(`
        DELETE FROM habit_completions;
        DELETE FROM habits;
        DELETE FROM pomodoro_sessions;
        DELETE FROM tasks;
        DELETE FROM journal_entries;
        DELETE FROM energy_logs;
        DELETE FROM xp_log;
        DELETE FROM boss_battles;
        DELETE FROM daily_quests;
        DELETE FROM loot_inventory;
        DELETE FROM habit_lapse_reflections;
        DELETE FROM habit_micro_checkins;
        DELETE FROM event_log;
        DELETE FROM pet_xp_log;
        DELETE FROM pets;
        DELETE FROM pet_eggs;
      `)

      db.prepare('UPDATE badges SET unlocked_at = NULL').run()
      db
        .prepare('DELETE FROM settings WHERE key IN (?, ?, ?, ?)')
        .run('user_name', 'commitment_statement', 'core_values', 'primary_value')
      setSetting(db, 'selected_character_class', 'apprentice')
      setSetting(db, 'onboarding_completed', 'false')
    })

    resetJourney()
    scheduleNotifications()

    return { success: true }
  })
}

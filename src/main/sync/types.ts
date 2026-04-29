export type SyncTableName =
  | 'habits'
  | 'habit_completions'
  | 'habit_micro_checkins'
  | 'habit_lapse_reflections'
  | 'tasks'
  | 'task_projects'
  | 'pomodoro_sessions'
  | 'pomodoro_presets'
  | 'journal_entries'
  | 'energy_logs'
  | 'xp_log'
  | 'badges'
  | 'boss_battles'
  | 'daily_quests'
  | 'quest_enrollments'
  | 'quest_outcomes'
  | 'catalog_enrollments'
  | 'pets'
  | 'pet_eggs'
  | 'pet_xp_log'
  | 'focus_log'
  | 'shop_purchases'
  | 'loot_inventory'
  | 'settings'

export interface SyncStatus {
  inProgress: boolean
  lastSyncedAt: number | null
  error: string | null
}

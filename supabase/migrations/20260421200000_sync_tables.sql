CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cue TEXT,
  obstacle_plan TEXT,
  tiny_mode BIGINT,
  tiny_started_at BIGINT,
  tiny_graduated_at BIGINT,
  category TEXT,
  frequency TEXT,
  custom_days TEXT,
  color TEXT,
  icon TEXT,
  created_at BIGINT,
  archived_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL,
  completed_at BIGINT NOT NULL,
  note TEXT,
  xp_awarded BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_micro_checkins (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL,
  completed_at BIGINT NOT NULL,
  difficulty BIGINT NOT NULL,
  focus_effort BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_lapse_reflections (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lapse_date BIGINT NOT NULL,
  reason_code TEXT NOT NULL,
  note TEXT,
  suggested_action TEXT,
  created_at BIGINT NOT NULL,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  priority BIGINT,
  estimated_mins BIGINT,
  due_date BIGINT,
  completed_at BIGINT,
  created_at BIGINT,
  habit_id TEXT,
  temptation_bundle TEXT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT,
  label TEXT,
  started_at BIGINT,
  ended_at BIGINT,
  duration_mins BIGINT,
  break_mins BIGINT,
  endless_mode BIGINT,
  loop_completed BIGINT,
  completed BIGINT,
  interruptions BIGINT,
  xp_awarded BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pomodoro_presets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  work_mins BIGINT,
  break_mins BIGINT,
  user_created BIGINT,
  created_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  date BIGINT,
  intentions TEXT,
  wins TEXT,
  gratitude TEXT,
  energy_level BIGINT,
  mood_emoji TEXT,
  reflection TEXT,
  tomorrow_prep TEXT,
  created_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS energy_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at BIGINT,
  energy BIGINT,
  mood BIGINT,
  note TEXT,
  context TEXT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_log (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT,
  source_id TEXT,
  amount BIGINT,
  logged_at BIGINT,
  base_amount BIGINT,
  multiplier DOUBLE PRECISION,
  class_id_applied TEXT,
  evolution_tier BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT,
  unlocked_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS boss_battles (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  week_start BIGINT,
  max_hp BIGINT,
  current_hp BIGINT,
  defeated BIGINT,
  loot_tier TEXT,
  loot_claimed BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_quests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date BIGINT,
  quest_type TEXT,
  description TEXT,
  target BIGINT,
  progress BIGINT,
  completed BIGINT,
  xp_reward BIGINT,
  egg_reward_tier TEXT,
  status TEXT,
  time_window_type TEXT,
  enrolled_at BIGINT,
  started_at BIGINT,
  deadline_at BIGINT,
  completed_at BIGINT,
  failed_at BIGINT,
  abandoned_at BIGINT,
  milestones_awarded BIGINT,
  reward_xp_awarded BIGINT,
  sanction_xp BIGINT,
  focus_reward BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS quest_enrollments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT,
  status TEXT,
  time_window_type TEXT,
  enrolled_at BIGINT,
  started_at BIGINT,
  deadline_at BIGINT,
  completed_at BIGINT,
  failed_at BIGINT,
  abandoned_at BIGINT,
  last_progress_at BIGINT,
  created_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS quest_outcomes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT,
  outcome_type TEXT,
  milestone_index BIGINT,
  xp_delta BIGINT,
  recorded_at BIGINT,
  metadata TEXT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_enrollments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  definition_id TEXT,
  status TEXT,
  progress BIGINT,
  milestones_awarded BIGINT,
  reward_xp_awarded BIGINT,
  sanction_xp BIGINT,
  enrolled_at BIGINT,
  deadline_at BIGINT,
  completed_at BIGINT,
  failed_at BIGINT,
  abandoned_at BIGINT,
  last_progress_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  definition_id TEXT,
  egg_id TEXT,
  name TEXT,
  total_xp BIGINT,
  level BIGINT,
  obtained_at BIGINT,
  equipped BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_eggs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT,
  source_quest_id TEXT,
  earned_at BIGINT,
  hatched_at BIGINT,
  pet_id TEXT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_xp_log (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id TEXT,
  source TEXT,
  source_xp BIGINT,
  pet_xp_gain BIGINT,
  logged_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_log (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  source TEXT,
  source_id TEXT,
  amount BIGINT,
  balance BIGINT,
  logged_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS shop_purchases (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_seed TEXT,
  item_id TEXT,
  item_type TEXT,
  focus_cost BIGINT,
  purchased_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS loot_inventory (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  tier TEXT,
  payload TEXT,
  earned_at BIGINT,
  used_at BIGINT,
  deleted_at BIGINT,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(user_id, key)
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_micro_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_lapse_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_eggs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_habits ON habits FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_habit_completions ON habit_completions FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_habit_micro_checkins ON habit_micro_checkins FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_habit_lapse_reflections ON habit_lapse_reflections FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_tasks ON tasks FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_pomodoro_sessions ON pomodoro_sessions FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_pomodoro_presets ON pomodoro_presets FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_journal_entries ON journal_entries FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_energy_logs ON energy_logs FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_xp_log ON xp_log FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_badges ON badges FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_boss_battles ON boss_battles FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_daily_quests ON daily_quests FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_quest_enrollments ON quest_enrollments FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_quest_outcomes ON quest_outcomes FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_catalog_enrollments ON catalog_enrollments FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_pets ON pets FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_pet_eggs ON pet_eggs FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_pet_xp_log ON pet_xp_log FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_focus_log ON focus_log FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_shop_purchases ON shop_purchases FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_loot_inventory ON loot_inventory FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY users_own_settings ON settings FOR ALL USING (auth.uid()::text = user_id::text);

CREATE INDEX IF NOT EXISTS idx_habits_user_updated ON habits(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_updated ON habit_completions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_habit_micro_checkins_user_updated ON habit_micro_checkins(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_habit_lapse_reflections_user_updated ON habit_lapse_reflections(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON tasks(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_updated ON pomodoro_sessions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_presets_user_updated ON pomodoro_presets(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_updated ON journal_entries(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_energy_logs_user_updated ON energy_logs(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_xp_log_user_updated ON xp_log(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_badges_user_updated ON badges(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_boss_battles_user_updated ON boss_battles(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_updated ON daily_quests(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_quest_enrollments_user_updated ON quest_enrollments(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_quest_outcomes_user_updated ON quest_outcomes(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_catalog_enrollments_user_updated ON catalog_enrollments(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pets_user_updated ON pets(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pet_eggs_user_updated ON pet_eggs(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pet_xp_log_user_updated ON pet_xp_log(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_focus_log_user_updated ON focus_log(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_user_updated ON shop_purchases(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_loot_inventory_user_updated ON loot_inventory(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_user_updated ON settings(user_id, updated_at);

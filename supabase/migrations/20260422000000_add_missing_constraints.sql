-- Adds unique indexes that exist in local SQLite but were absent from the initial migration.
-- All statements are idempotent (IF NOT EXISTS).

-- One active enrollment per quest per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_enrollments_user_quest
  ON quest_enrollments(user_id, quest_id);

-- No duplicate shop purchases for same item+date per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_purchases_user_date_item
  ON shop_purchases(user_id, date_seed, item_id);

-- No duplicate quest outcome entries per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_outcomes_user_unique
  ON quest_outcomes(user_id, quest_id, outcome_type, milestone_index);

-- One badge code per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_user_code
  ON badges(user_id, code);

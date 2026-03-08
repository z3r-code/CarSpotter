-- Migration: Daily Quests journalières rotatives
-- Crée la table daily_quests et configure le RLS

CREATE TABLE IF NOT EXISTS daily_quests (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_key     TEXT         NOT NULL,
  progress      INT          NOT NULL DEFAULT 0,
  goal          INT          NOT NULL,
  xp_reward     INT          NOT NULL DEFAULT 0,
  coins_reward  INT          NOT NULL DEFAULT 0,
  assigned_date DATE         NOT NULL,
  completed_at  TIMESTAMPTZ,
  rewarded_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ  NOT NULL,

  -- Un utilisateur ne peut avoir qu'une seule instance d'une quête par jour
  CONSTRAINT uq_user_quest_date UNIQUE (user_id, quest_key, assigned_date)
);

-- Index pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date
  ON daily_quests (user_id, assigned_date);

-- Row Level Security
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;

-- Policy: lecture uniquement de ses propres quêtes
DROP POLICY IF EXISTS "Users can read own daily quests" ON daily_quests;
CREATE POLICY "Users can read own daily quests"
  ON daily_quests FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: insérer ses propres quêtes
DROP POLICY IF EXISTS "Users can insert own daily quests" ON daily_quests;
CREATE POLICY "Users can insert own daily quests"
  ON daily_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: mettre à jour la progression / claim de ses propres quêtes
DROP POLICY IF EXISTS "Users can update own daily quests" ON daily_quests;
CREATE POLICY "Users can update own daily quests"
  ON daily_quests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

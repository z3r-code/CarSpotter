-- Migration: Push Tokens pour les notifications Expo

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id    UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  platform   TEXT,                        -- 'ios' | 'android'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push token" ON push_tokens;
CREATE POLICY "Users manage own push token"
  ON push_tokens FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Les Edge Functions (service_role) peuvent lire tous les tokens pour envoyer des notifs
DROP POLICY IF EXISTS "Service role read all tokens" ON push_tokens;
CREATE POLICY "Service role read all tokens"
  ON push_tokens FOR SELECT
  USING (current_setting('role') = 'service_role');

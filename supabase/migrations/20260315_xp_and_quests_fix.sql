-- ============================================================
-- FIX: XP + levels sur profiles + RPC increment_xp
-- + s'assure que daily_quests existe bien
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Ajoute xp et level sur profiles si absent
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. RPC increment_xp
-- Signature exacte attendue par le client : (user_id uuid, amount int)
CREATE OR REPLACE FUNCTION public.increment_xp(
  user_id UUID,
  amount  INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_xp    INTEGER;
  new_level INTEGER;
  thresholds INTEGER[] := ARRAY[0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];
  i         INTEGER;
BEGIN
  UPDATE profiles
  SET xp = xp + amount
  WHERE id = user_id
  RETURNING xp INTO new_xp;

  -- Calcul du level
  new_level := 1;
  FOR i IN 1..array_length(thresholds, 1) LOOP
    IF new_xp >= thresholds[i] THEN
      new_level := i;
    END IF;
  END LOOP;

  UPDATE profiles
  SET level = new_level
  WHERE id = user_id;
END;
$$;

-- Révoque l'accès anon, accorde aux users authentifiés uniquement
REVOKE ALL ON FUNCTION public.increment_xp(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_xp(UUID, INTEGER) TO authenticated;

-- 3. Assure que daily_quests existe (idempotent)
CREATE TABLE IF NOT EXISTS public.daily_quests (
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
  CONSTRAINT uq_user_quest_date UNIQUE (user_id, quest_key, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date
  ON public.daily_quests (user_id, assigned_date);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own daily quests"   ON public.daily_quests;
DROP POLICY IF EXISTS "Users can insert own daily quests" ON public.daily_quests;
DROP POLICY IF EXISTS "Users can update own daily quests" ON public.daily_quests;

CREATE POLICY "Users can read own daily quests"
  ON public.daily_quests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily quests"
  ON public.daily_quests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests"
  ON public.daily_quests FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Refresh schema cache (force PostgREST à recharger)
NOTIFY pgrst, 'reload schema';

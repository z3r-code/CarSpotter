-- Migration: Daily Streak
-- Ajoute les colonnes de streak sur la table profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_count    INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_longest  INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date DATE DEFAULT NULL;

-- Index pour les requêtes de streak (lookup par user_id déjà couvert par PK)
-- Aucun index supplémentaire nécessaire

-- RLS : les colonnes héritent automatiquement des policies existantes sur profiles
-- Vérifier que la policy UPDATE autorise bien le user à modifier ses propres colonnes :
--
-- CREATE POLICY "Users can update own profile" ON profiles
--   FOR UPDATE USING (auth.uid() = id);
--
-- Si la policy n'existe pas encore :
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id)
    ';
  END IF;
END;
$$;

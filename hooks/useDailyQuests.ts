import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import {
  DailyQuestWithDef,
  claimDailyQuestReward,
  getOrAssignDailyQuests,
} from '../services/dailyQuestService';

interface UseDailyQuestsReturn {
  quests:      DailyQuestWithDef[];
  isLoading:   boolean;
  claimReward: (questId: string) => Promise<{ xp: number; coins: number } | null>;
  refresh:     () => void;
}

export function useDailyQuests(): UseDailyQuestsReturn {
  const [quests,    setQuests]    = useState<DailyQuestWithDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getOrAssignDailyQuests(user.id);
      setQuests(data);
    } catch (e) {
      console.error('[useDailyQuests] load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const claimReward = useCallback(async (questId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const result = await claimDailyQuestReward(user.id, questId);
      load();
      return { xp: result.xpRewarded, coins: result.coinsRewarded };
    } catch (e) {
      console.error('[useDailyQuests] claimReward error:', e);
      return null;
    }
  }, [load]);

  return { quests, isLoading, claimReward, refresh: load };
}

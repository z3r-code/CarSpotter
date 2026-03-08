import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import {
  StreakStatus,
  claimDailyStreak,
  getStreakStatus,
} from '../services/streakService';

interface UseStreakReturn {
  streakStatus: StreakStatus | null;
  showModal:    boolean;
  isClaiming:   boolean;
  claimStreak:  () => Promise<void>;
  dismissModal: () => void;
}

export function useStreak(): UseStreakReturn {
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [isClaiming,   setIsClaiming]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const status = await getStreakStatus(user.id).catch(() => null);
      if (!status || cancelled) return;

      setStreakStatus(status);
      if (!status.claimedToday) setShowModal(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const claimStreak = useCallback(async () => {
    if (isClaiming) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsClaiming(true);
    try {
      const { newStreak, reward } = await claimDailyStreak(user.id);
      setStreakStatus(prev =>
        prev
          ? { ...prev, streakCount: newStreak, claimedToday: true, nextReward: reward }
          : null,
      );
    } catch (e) {
      console.error('[useStreak] claimDailyStreak error:', e);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming]);

  const dismissModal = useCallback(() => setShowModal(false), []);

  return { streakStatus, showModal, isClaiming, claimStreak, dismissModal };
}

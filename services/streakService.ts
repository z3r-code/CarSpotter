import { supabase } from '../supabase';

export type StreakRewardType = 'coins' | 'mystery_box' | 'avatar';

export interface StreakReward {
  type: StreakRewardType;
  amount?: number;
  label: string;
  emoji: string;
}

export interface StreakStatus {
  streakCount: number;
  longestStreak: number;
  lastStreakDate: string | null;
  claimedToday: boolean;
  nextReward: StreakReward;
}

/** Calcule la récompense pour un streak donné (avant claim) */
export function getStreakReward(currentStreak: number): StreakReward {
  const day = currentStreak + 1; // ce qu'on va obtenir
  if (day >= 30) return { type: 'avatar',      label: 'Avatar Streak Legend', emoji: '🎭' };
  if (day >= 14) return { type: 'mystery_box', label: 'Mystery Box Epic',     emoji: '📦✨', amount: 1 };
  if (day >= 7)  return { type: 'mystery_box', label: 'Mystery Box',          emoji: '📦',   amount: 1 };
  if (day >= 4) {
    const coins = ([150, 200, 250] as const)[day - 4] ?? 250;
    return { type: 'coins', amount: coins, label: `${coins} Coins`, emoji: '🪙🪙' };
  }
  const coins = ([50, 75, 100] as const)[day - 1] ?? 50;
  return { type: 'coins', amount: coins, label: `${coins} Coins`, emoji: '🪙' };
}

export async function getStreakStatus(userId: string): Promise<StreakStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('streak_count, streak_longest, last_streak_date')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return {
      streakCount:     0,
      longestStreak:   0,
      lastStreakDate:  null,
      claimedToday:   false,
      nextReward:     getStreakReward(0),
    };
  }

  const today        = new Date().toISOString().split('T')[0];
  const claimedToday = data.last_streak_date === today;

  return {
    streakCount:    data.streak_count    ?? 0,
    longestStreak:  data.streak_longest  ?? 0,
    lastStreakDate: data.last_streak_date ?? null,
    claimedToday,
    nextReward:     getStreakReward(data.streak_count ?? 0),
  };
}

export async function claimDailyStreak(
  userId: string,
): Promise<{ newStreak: number; reward: StreakReward }> {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('streak_count, streak_longest, last_streak_date, coins')
    .eq('id', userId)
    .single();

  if (error || !profile) throw new Error('Profile not found');
  if (profile.last_streak_date === today) throw new Error('Already claimed today');

  const isConsecutive = profile.last_streak_date === yesterday;
  const newStreak     = isConsecutive ? (profile.streak_count ?? 0) + 1 : 1;
  const newLongest    = Math.max(newStreak, profile.streak_longest ?? 0);
  const reward        = getStreakReward(profile.streak_count ?? 0);

  let newCoins = profile.coins ?? 0;
  if (reward.type === 'coins' && reward.amount) {
    newCoins += reward.amount;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      streak_count:    newStreak,
      streak_longest:  newLongest,
      last_streak_date: today,
      coins:           newCoins,
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  return { newStreak, reward };
}

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { SHOP_ITEMS } from '../constants/shopItems';
import { C } from '../constants/colors';

// ─── Types ────────────────────────────────────────────────────
export interface RarityStats {
  platine:    number;
  legendaire: number;
  epique:     number;
  rare:       number;
  commun:     number;
}

export interface RecentSpot {
  id:         string;
  make:       string;
  model:      string;
  rarity:     string;
  photo_url:  string | null;
  spotted_at: string;
}

export interface LevelSummary {
  level:    number;
  name:     string;
  color:    string;
  progress: number;
  nextXp:   number;
  totalXp:  number;
}

export interface PublicProfileData {
  userId:               string;
  username:             string;
  avatarEmoji:          string;
  avatarBg:             string;
  level:                LevelSummary;
  totalSpots:           number;
  rarityStats:          RarityStats;
  recentSpots:          RecentSpot[];
  completedQuestsCount: number;
  streakCount:          number;
  isMe:                 boolean;
}

// ─── Level helpers (inline pour éviter les dépendances) ───────
const XP_THRESHOLDS = [0, 10, 25, 50, 100];
const LEVEL_NAMES   = ['', 'Novice', 'Observateur', 'Chasseur', 'Expert', 'L\u00e9gende'];
const LEVEL_COLORS  = ['', '#888888', C.rare, C.epic, C.legendary, C.cyan];

const XP_FOR_RARITY: Record<string, number> = {
  platine:    20,
  legendaire: 15,
  epique:     10,
  rare:        5,
  commun:      1,
};

function computeLevel(xp: number): LevelSummary {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const isMax    = level >= XP_THRESHOLDS.length;
  const from     = XP_THRESHOLDS[level - 1];
  const to       = isMax ? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] : XP_THRESHOLDS[level];
  const progress = isMax ? 1 : (xp - from) / (to - from);
  return {
    level,
    name:     LEVEL_NAMES[level]  ?? 'L\u00e9gende',
    color:    LEVEL_COLORS[level] ?? C.cyan,
    progress: Math.min(1, Math.max(0, progress)),
    nextXp:   to,
    totalXp:  xp,
  };
}

// ─── Hook ─────────────────────────────────────────────────────
export function usePublicProfile(userId: string) {
  const [data,      setData]      = useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user: me } } = await supabase.auth.getUser();

        const [
          { data: userRow },
          { data: profileRow },
          { data: spots },
        ] = await Promise.all([
          supabase.from('users').select('username').eq('id', userId).single(),
          supabase
            .from('profiles')
            .select('active_avatar, completed_quests, streak_count')
            .eq('id', userId)
            .single(),
          supabase
            .from('spots')
            .select('id, make, model, rarity, photo_url, spotted_at')
            .eq('user_id', userId)
            .order('spotted_at', { ascending: false }),
        ]);

        const allSpots = spots ?? [];
        const totalXp  = allSpots.reduce(
          (sum, s) => sum + (XP_FOR_RARITY[s.rarity] ?? 1), 0,
        );

        const rarityStats: RarityStats = {
          platine: 0, legendaire: 0, epique: 0, rare: 0, commun: 0,
        };
        for (const s of allSpots) {
          if (s.rarity in rarityStats) {
            (rarityStats as Record<string, number>)[s.rarity]++;
          }
        }

        // Avatar
        const avatarItem  = SHOP_ITEMS.find(i => i.id === profileRow?.active_avatar);
        const avatarEmoji = avatarItem?.emoji   ?? '\uD83D\uDE97';
        const avatarBg    = avatarItem?.bgColor ?? C.surfaceHigh;

        if (!mounted) return;
        setData({
          userId,
          username:             userRow?.username ?? 'Spotter',
          avatarEmoji,
          avatarBg,
          level:                computeLevel(totalXp),
          totalSpots:           allSpots.length,
          rarityStats,
          recentSpots:          allSpots.slice(0, 8),
          completedQuestsCount: profileRow?.completed_quests?.length ?? 0,
          streakCount:          profileRow?.streak_count ?? 0,
          isMe:                 me?.id === userId,
        });
      } catch (e) {
        if (mounted) setError('Profil introuvable');
        console.error('[usePublicProfile]', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [userId]);

  return { data, isLoading, error };
}

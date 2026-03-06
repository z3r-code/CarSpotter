export const MAX_LEVEL = 99;

/** Total XP needed to REACH this level (cumulative from level 1) */
export function getXpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return 100 * n + 5 * n * n;
}

export interface LevelInfo {
  level: number;
  title: string;
  color: string;
  progress: number;   // 0..1 toward next level
  currentXp: number;  // total XP
  nextLevelXp: number; // XP needed for next level
  xpInCurrentLevel: number; // XP earned within this level
  xpNeededInLevel: number;  // total XP span of this level
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (totalXp >= getXpForLevel(l)) { level = l; break; }
  }
  const tier = getTierForLevel(level);
  const isMax = level >= MAX_LEVEL;
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = isMax ? getXpForLevel(MAX_LEVEL) : getXpForLevel(level + 1);
  const xpInCurrentLevel = totalXp - currentLevelXp;
  const xpNeededInLevel = nextLevelXp - currentLevelXp;
  const progress = isMax ? 1 : xpInCurrentLevel / xpNeededInLevel;
  return {
    level,
    title: tier.title,
    color: tier.color,
    progress,
    currentXp: totalXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededInLevel,
  };
}

export function getXpForRarity(rarity: string): number {
  switch (rarity) {
    case 'platine':    return 100;
    case 'legendaire': return 50;
    case 'epique':     return 25;
    case 'rare':       return 10;
    default:           return 3; // commun
  }
}

export interface TierInfo {
  minLevel: number;
  title: string;
  color: string;
  trophyEmoji: string;
  trophyLabel: string | null;
}

export const TIERS: TierInfo[] = [
  { minLevel: 1,  title: 'Novice',           color: '#888888', trophyEmoji: '',   trophyLabel: null  },
  { minLevel: 10, title: 'Observateur',      color: '#CD7F32', trophyEmoji: 'B',  trophyLabel: '#10' },
  { minLevel: 20, title: 'Chasseur',         color: '#C0C0C0', trophyEmoji: 'S',  trophyLabel: '#20' },
  { minLevel: 30, title: 'Pisteur',          color: '#FFD700', trophyEmoji: 'G',  trophyLabel: '#30' },
  { minLevel: 40, title: 'Collectionneur',   color: '#00FFFF', trophyEmoji: 'P',  trophyLabel: '#40' },
  { minLevel: 50, title: 'Expert',           color: '#00BFFF', trophyEmoji: 'D',  trophyLabel: '#50' },
  { minLevel: 60, title: 'Elite',            color: '#FF6B35', trophyEmoji: 'E',  trophyLabel: '#60' },
  { minLevel: 70, title: 'Maitre',           color: '#FF69B4', trophyEmoji: 'M',  trophyLabel: '#70' },
  { minLevel: 80, title: 'Grand Maitre',     color: '#FF1493', trophyEmoji: 'GM', trophyLabel: '#80' },
  { minLevel: 90, title: 'Legende',          color: '#FF4500', trophyEmoji: 'L',  trophyLabel: '#90' },
  { minLevel: 99, title: 'CarSpotter Elite', color: '#00FF00', trophyEmoji: 'X',  trophyLabel: '#99' },
];

export function getTierForLevel(level: number): TierInfo {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (level >= t.minLevel) tier = t;
    else break;
  }
  return tier;
}

export function isMilestoneLevel(level: number): boolean {
  return level === 99 || (level > 1 && level % 10 === 0);
}

/** XP values displayed in UI */
export const RARITY_XP_TABLE = [
  { rarity: 'commun',    xp: 3,   color: '#888888' },
  { rarity: 'rare',      xp: 10,  color: '#3498DB' },
  { rarity: 'epique',    xp: 25,  color: '#9B59B6' },
  { rarity: 'legendaire',xp: 50,  color: '#FFD700' },
  { rarity: 'platine',   xp: 100, color: '#00FFFF' },
];

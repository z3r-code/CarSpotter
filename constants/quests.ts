import { C } from './colors';

export interface QuestSpot {
  rarity: string;
  make: string;
  latitude: number | null;
  longitude: number | null;
  spotted_at: string;
}

export interface QuestDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
  xpReward: number;
  category: string;
  categoryColor: string;
  maxProgress: number;
  getProgress: (spots: QuestSpot[], totalXp: number) => number;
}

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const QUESTS: QuestDef[] = [
  {
    id: 'first_spot',
    emoji: '\uD83D\uDD30',
    name: 'Premier Spot',
    description: 'Spotte ta toute 1\u00e8re voiture',
    xpReward: 15,
    category: 'D\u00e9buts',
    categoryColor: C.cyan,
    maxProgress: 1,
    getProgress: (spots) => Math.min(spots.length, 1),
  },
  {
    id: 'collector',
    emoji: '\uD83D\uDCE6',
    name: 'Collectionneur',
    description: 'Spotte 10 voitures au total',
    xpReward: 30,
    category: 'Collection',
    categoryColor: C.rare,
    maxProgress: 10,
    getProgress: (spots) => Math.min(spots.length, 10),
  },
  {
    id: 'legendary',
    emoji: '\uD83D\uDC9B',
    name: 'Flotte L\u00e9gendaire',
    description: 'Spotte 1 voiture L\u00e9gendaire',
    xpReward: 50,
    category: 'Raret\u00e9',
    categoryColor: C.legendary,
    maxProgress: 1,
    getProgress: (spots) =>
      Math.min(spots.filter(s => s.rarity === 'legendaire').length, 1),
  },
  {
    id: 'platinum',
    emoji: '\uD83E\uDEE6',
    name: 'Le Graal',
    description: 'Spotte 1 voiture Platine',
    xpReward: 100,
    category: 'Raret\u00e9',
    categoryColor: C.platinum,
    maxProgress: 1,
    getProgress: (spots) =>
      Math.min(spots.filter(s => s.rarity === 'platine').length, 1),
  },
  {
    id: 'explorer',
    emoji: '\uD83C\uDFAF',
    name: 'Explorateur',
    description: 'Spotte 5 marques diff\u00e9rentes',
    xpReward: 40,
    category: 'Collection',
    categoryColor: C.rare,
    maxProgress: 5,
    getProgress: (spots) =>
      Math.min(new Set(spots.map(s => s.make.toLowerCase())).size, 5),
  },
  {
    id: 'sprint',
    emoji: '\u26A1',
    name: 'Sprint',
    description: 'Spotte 3 voitures en moins de 24h',
    xpReward: 35,
    category: 'Challenge',
    categoryColor: '#F59E0B',
    maxProgress: 3,
    getProgress: (spots) => {
      if (spots.length === 0) return 0;
      const times = spots
        .map(s => new Date(s.spotted_at).getTime())
        .sort((a, b) => a - b);
      let best = 1;
      for (let i = 0; i < times.length; i++) {
        let count = 1;
        for (let j = i + 1; j < times.length; j++) {
          if (times[j] - times[i] <= 24 * 3600 * 1000) count++;
          else break;
        }
        if (count > best) best = count;
      }
      return Math.min(best, 3);
    },
  },
  {
    id: 'globetrotter',
    emoji: '\uD83C\uDF0D',
    name: 'Globe-Trotter',
    description: 'Spotte dans 3 zones diff\u00e9rentes (>50 km)',
    xpReward: 45,
    category: 'Exploration',
    categoryColor: C.cyan,
    maxProgress: 3,
    getProgress: (spots) => {
      const geo = spots.filter(s => s.latitude != null && s.longitude != null);
      if (geo.length === 0) return 0;
      const zones: { lat: number; lon: number }[] = [];
      for (const s of geo) {
        const lat = s.latitude!;
        const lon = s.longitude!;
        const inside = zones.some(z => haversineKm(z.lat, z.lon, lat, lon) < 50);
        if (!inside) zones.push({ lat, lon });
      }
      return Math.min(zones.length, 3);
    },
  },
  {
    id: 'hunter',
    emoji: '\uD83C\uDFF9',
    name: 'Chasseur Fou',
    description: 'Spotte 5 voitures le m\u00eame jour',
    xpReward: 55,
    category: 'Challenge',
    categoryColor: '#F59E0B',
    maxProgress: 5,
    getProgress: (spots) => {
      const byDay: Record<string, number> = {};
      for (const s of spots) {
        const day = s.spotted_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      const vals = Object.values(byDay);
      return Math.min(vals.length > 0 ? Math.max(...vals) : 0, 5);
    },
  },
  {
    id: 'epic_trio',
    emoji: '\uD83D\uDC9C',
    name: 'Trio \u00c9pique',
    description: 'Accumule 3 voitures \u00c9piques',
    xpReward: 60,
    category: 'Raret\u00e9',
    categoryColor: C.epic,
    maxProgress: 3,
    getProgress: (spots) =>
      Math.min(spots.filter(s => s.rarity === 'epique').length, 3),
  },
  {
    id: 'legend',
    emoji: '\uD83C\uDFC6',
    name: 'L\u00e9gende Vivante',
    description: 'Atteins le Niveau 5',
    xpReward: 25,
    category: 'Progression',
    categoryColor: C.legendary,
    maxProgress: 5,
    getProgress: (_spots, totalXp) => {
      const thresholds = [0, 10, 25, 50, 100];
      let level = 1;
      for (let i = 1; i < thresholds.length; i++) {
        if (totalXp >= thresholds[i]) level = i + 1;
        else break;
      }
      return Math.min(level, 5);
    },
  },
];

export type DailyQuestTrigger =
  | 'scan_any'
  | 'scan_rarity_min'
  | 'scan_new_brand';

export interface DailyQuestDef {
  key:            string;
  emoji:          string;
  title:          string;
  description:    string;
  goal:           number;
  xpReward:       number;
  coinsReward:    number;
  trigger:        DailyQuestTrigger;
  /** Index minimal dans RARITY_ORDER pour scan_rarity_min */
  rarityMinIndex?: number;
  difficulty:     'easy' | 'medium' | 'hard';
}

/** Ordre croissant de rareté — utilisé pour les comparaisons */
export const RARITY_ORDER = ['commun', 'rare', 'epique', 'legendaire', 'platine'] as const;

export const DAILY_QUEST_POOL: DailyQuestDef[] = [
  {
    key:         'scan_1_car',
    emoji:       '\uD83D\uDC41\uFE0F',
    title:       'Premier regard',
    description: 'Scanne au moins 1 voiture',
    goal:        1,
    xpReward:    30,
    coinsReward: 15,
    trigger:     'scan_any',
    difficulty:  'easy',
  },
  {
    key:         'scan_2_cars',
    emoji:       '\uD83D\uDCF8',
    title:       'Chasseur du jour',
    description: 'Scanne 2 voitures aujourd\'hui',
    goal:        2,
    xpReward:    50,
    coinsReward: 25,
    trigger:     'scan_any',
    difficulty:  'easy',
  },
  {
    key:         'scan_3_cars',
    emoji:       '\uD83D\uDD25',
    title:       'Triple menace',
    description: 'Scanne 3 voitures aujourd\'hui',
    goal:        3,
    xpReward:    75,
    coinsReward: 35,
    trigger:     'scan_any',
    difficulty:  'medium',
  },
  {
    key:            'find_rare',
    emoji:          '\u2B50',
    title:          '\u0152il de lynx',
    description:    'Trouve une voiture Rare ou plus',
    goal:           1,
    xpReward:       80,
    coinsReward:    40,
    trigger:        'scan_rarity_min',
    rarityMinIndex: 1,
    difficulty:     'medium',
  },
  {
    key:            'find_epic',
    emoji:          '\uD83D\uDC9C',
    title:          'Chasseur d\'\u00e9lite',
    description:    'Trouve une voiture \u00c9pique ou plus',
    goal:           1,
    xpReward:       120,
    coinsReward:    60,
    trigger:        'scan_rarity_min',
    rarityMinIndex: 2,
    difficulty:     'hard',
  },
  {
    key:         'scan_new_brand',
    emoji:       '\uD83D\uDD0D',
    title:       'D\u00e9couvreur',
    description: 'Scanne une marque encore inconnue',
    goal:        1,
    xpReward:    100,
    coinsReward: 50,
    trigger:     'scan_new_brand',
    difficulty:  'hard',
  },
  {
    key:            'find_legendary',
    emoji:          '\uD83C\uDFC6',
    title:          'L\u00e9gende',
    description:    'Trouve une voiture L\u00e9gendaire ou Platine',
    goal:           1,
    xpReward:       150,
    coinsReward:    75,
    trigger:        'scan_rarity_min',
    rarityMinIndex: 3,
    difficulty:     'hard',
  },
];

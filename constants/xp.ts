import { RarityLevel } from '../types/car.types';

/** XP gagné par scan selon la rareté */
export const XP_PER_RARITY: Record<RarityLevel, number> = {
  commun:      10,
  rare:        25,
  epique:      50,
  legendaire: 100,
  platine:    200,
};

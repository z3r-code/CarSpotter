export type ShopItemType = 'avatar';

export interface ShopItem {
  id:          string;
  name:        string;
  description: string;
  price:       number;       // en pièces
  type:        ShopItemType;
  imageUrl:    string;
  emoji:       string;       // fallback si image fail
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id:          'avatar_turbo',
    name:        'Turbo',
    description: 'Le souffle d\'un moteur de course',
    price:       5,
    type:        'avatar',
    imageUrl:    'https://source.unsplash.com/SLCIHzu6Z-Y/400x400',
    emoji:       '\u2699\uFE0F',
  },
  {
    id:          'avatar_drift',
    name:        'Drift King',
    description: 'Un burnout qui laisse des traces',
    price:       5,
    type:        'avatar',
    imageUrl:    'https://source.unsplash.com/pTCkw9g7wUU/400x400',
    emoji:       '\uD83D\uDCA8',
  },
  {
    id:          'avatar_nos',
    name:        'N.O.S',
    description: 'La bouteille qui change tout',
    price:       5,
    type:        'avatar',
    imageUrl:    'https://source.unsplash.com/400x400/?nitrous,cylinder,blue',
    emoji:       '\uD83D\uDCA1',
  },
];

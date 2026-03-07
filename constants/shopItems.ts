export type ShopItemType = 'avatar';

export interface ShopItem {
  id:          string;
  name:        string;
  description: string;
  price:       number;
  type:        ShopItemType;
  emoji:       string;
  bgColor:     string;
  borderColor: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id:          'avatar_turbo',
    name:        'Turbo',
    description: 'Le souffle d\'un moteur de course',
    price:       5,
    type:        'avatar',
    emoji:       '⚙️',
    bgColor:     '#1C1C1E',
    borderColor: '#888888',
  },
  {
    id:          'avatar_drift',
    name:        'Drift King',
    description: 'Un burnout qui laisse des traces',
    price:       5,
    type:        'avatar',
    emoji:       '💨',
    bgColor:     '#111111',
    borderColor: '#555555',
  },
  {
    id:          'avatar_nos',
    name:        'N.O.S',
    description: 'La bouteille qui change tout',
    price:       5,
    type:        'avatar',
    emoji:       '🔵',
    bgColor:     '#0A1520',
    borderColor: '#1E90FF',
  },
];

export type RarityLevel = 'commun' | 'rare' | 'épique' | 'légendaire' | 'platine';

export interface CarIdentification {
  make: string;
  model: string;
  year: number | null;
  engine: string;
  horsepower: number;
  rarity: RarityLevel;
  confidence: number;
}

export interface ScanResult extends CarIdentification {
  photo_url: string | null;
}

export interface QuotaStatus {
  scansToday: number;
  maxFreeScans: number;
  canScan: boolean;
}

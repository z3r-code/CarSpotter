import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';

export interface ModelEntry {
  model:      string;
  rarity:     string;
  photo_url:  string | null;
  spotted_at: string;
}

export interface BrandEntry {
  brand:   string;
  scanned: number;       // modèles uniques de l'utilisateur
  total:   number;       // modèles uniques communauté
  pct:     number;       // 0–1
  models:  ModelEntry[];
}

interface UsePokedexReturn {
  brands:       BrandEntry[];
  isLoading:    boolean;
  totalScanned: number;
  totalKnown:   number;
  refresh:      () => Promise<void>;
}

export function usePokedex(): UsePokedexReturn {
  const [brands,    setBrands]    = useState<BrandEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Spots de l'utilisateur
      const { data: userSpots, error: uErr } = await supabase
        .from('spots')
        .select('make, model, rarity, photo_url, spotted_at')
        .eq('user_id', user.id);
      if (uErr) throw uErr;

      // Totaux communautaires (toutes marques + modèles)
      const { data: allSpots, error: aErr } = await supabase
        .from('spots')
        .select('make, model');
      if (aErr) throw aErr;

      // Communauté : brand → Set<modelKey>
      const communityMap = new Map<string, Set<string>>();
      for (const s of allSpots ?? []) {
        const b = normBrand(s.make);
        if (!communityMap.has(b)) communityMap.set(b, new Set());
        communityMap.get(b)!.add(normModel(s.model));
      }

      // Utilisateur : brand → Map<modelKey, ModelEntry>
      const userMap = new Map<string, Map<string, ModelEntry>>();
      for (const s of userSpots ?? []) {
        const b = normBrand(s.make);
        const mk = normModel(s.model);
        if (!userMap.has(b)) userMap.set(b, new Map());
        if (!userMap.get(b)!.has(mk)) {
          userMap.get(b)!.set(mk, {
            model:      s.model,
            rarity:     s.rarity,
            photo_url:  s.photo_url,
            spotted_at: s.spotted_at,
          });
        }
      }

      // Fusion
      const result: BrandEntry[] = [];
      for (const [brand, modelsMap] of userMap.entries()) {
        const total   = communityMap.get(brand)?.size ?? modelsMap.size;
        const scanned = modelsMap.size;
        result.push({
          brand,
          scanned,
          total,
          pct: total > 0 ? scanned / total : 0,
          models: Array.from(modelsMap.values()).sort(
            (a, b) => new Date(b.spotted_at).getTime() - new Date(a.spotted_at).getTime(),
          ),
        });
      }

      // Tri : complet en premier, puis alphabétique
      result.sort((a, b) => b.pct - a.pct || a.brand.localeCompare(b.brand));

      setBrands(result);
    } catch (e) {
      console.error('[usePokedex] error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalScanned = brands.reduce((s, b) => s + b.scanned, 0);
  const totalKnown   = brands.reduce((s, b) => s + b.total,   0);

  return { brands, isLoading, totalScanned, totalKnown, refresh: load };
}

function normBrand(make: string): string {
  return make.trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normModel(model: string): string {
  return model.trim().toLowerCase();
}

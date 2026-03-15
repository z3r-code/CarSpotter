import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';

export interface PokedexModel {
  id:         string;
  name:       string;
  rarity:     string;
  is_boss:    boolean;
  isUnlocked: boolean;
  spottedAt?: string;
}

export interface PokedexFamily {
  id:      string;
  name:    string;
  models:  PokedexModel[];
  unlocked: number;
  total:    number;
}

export interface PokedexBrand {
  id:             string;
  name:           string;
  tier:           'commun' | 'rare' | 'legendaire';
  families:       PokedexFamily[];
  totalModels:    number;
  unlockedModels: number;
  progress:       number;
  isMaster:       boolean;
}

const TIER_ORDER: Record<string, number> = { legendaire: 0, rare: 1, commun: 2 };

function sortBrands(a: PokedexBrand, b: PokedexBrand): number {
  if (b.unlockedModels > 0 && a.unlockedModels === 0) return  1;
  if (a.unlockedModels > 0 && b.unlockedModels === 0) return -1;
  const dp = b.progress - a.progress;
  if (Math.abs(dp) > 0.001) return dp;
  const dt = (TIER_ORDER[a.tier] ?? 3) - (TIER_ORDER[b.tier] ?? 3);
  if (dt !== 0) return dt;
  return a.name.localeCompare(b.name);
}

export function usePokedex() {
  const [brands,     setBrands]     = useState<PokedexBrand[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPokedex = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { data: brandsRaw },
        { data: familiesRaw },
        { data: modelsRaw },
        { data: spotsRaw },
      ] = await Promise.all([
        supabase.from('pokedex_brands').select('id, name, tier').order('name'),
        supabase.from('pokedex_families').select('id, brand_id, name, sort_order').order('sort_order'),
        supabase.from('pokedex_models').select('id, family_id, name, rarity, is_boss'),
        // ✅ La colonne s'appelle created_at dans spots, PAS spotted_at
        supabase
          .from('spots')
          .select('pokedex_model_id, created_at')
          .eq('user_id', user.id)
          .not('pokedex_model_id', 'is', null),
      ]);

      // Map model_id → date du premier spot
      const spotMap = new Map<string, string>();
      (spotsRaw ?? []).forEach((s: any) => {
        if (s.pokedex_model_id && !spotMap.has(s.pokedex_model_id)) {
          spotMap.set(s.pokedex_model_id, s.created_at);
        }
      });

      const result: PokedexBrand[] = (brandsRaw ?? []).map(brand => {
        const families: PokedexFamily[] = (familiesRaw ?? [])
          .filter(f => f.brand_id === brand.id)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(family => {
            const models: PokedexModel[] = (modelsRaw ?? [])
              .filter(m => m.family_id === family.id)
              .map(m => ({
                id:         m.id,
                name:       m.name,
                rarity:     m.rarity,
                is_boss:    m.is_boss,
                isUnlocked: spotMap.has(m.id),
                spottedAt:  spotMap.get(m.id),
              }));
            const unlocked = models.filter(m => m.isUnlocked).length;
            return { id: family.id, name: family.name, models, unlocked, total: models.length };
          });

        const totalModels    = families.reduce((s, f) => s + f.total,    0);
        const unlockedModels = families.reduce((s, f) => s + f.unlocked, 0);
        const progress       = totalModels > 0 ? unlockedModels / totalModels : 0;

        return {
          id:   brand.id,
          name: brand.name,
          tier: brand.tier as PokedexBrand['tier'],
          families,
          totalModels,
          unlockedModels,
          progress,
          isMaster: totalModels > 0 && unlockedModels === totalModels,
        };
      });

      setBrands(result.sort(sortBrands));
    } catch (e) {
      console.error('[usePokedex]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPokedex(); }, [fetchPokedex]);

  const onRefresh = useCallback(() => fetchPokedex(true), [fetchPokedex]);

  return { brands, loading, refreshing, onRefresh };
}

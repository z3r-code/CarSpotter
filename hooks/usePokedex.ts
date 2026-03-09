import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';

// ─── Types (miroir du schéma DB) ─────────────────────────────────────

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
  /** Nb de modèles débloqués / total */
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
  /** 0..1 */
  progress:       number;
  /** true si toutes les familles sont complètes */
  isMaster:       boolean;
}

// ─── Tri ─────────────────────────────────────────────────────────
const TIER_ORDER: Record<string, number> = { legendaire: 0, rare: 1, commun: 2 };

function sortBrands(a: PokedexBrand, b: PokedexBrand): number {
  // En tête : marques avec progression > 0
  if (b.unlockedModels > 0 && a.unlockedModels === 0) return  1;
  if (a.unlockedModels > 0 && b.unlockedModels === 0) return -1;
  // Puis par progression décroissante
  const dp = b.progress - a.progress;
  if (Math.abs(dp) > 0.001) return dp;
  // Puis par tier (legendaire > rare > commun)
  const dt = (TIER_ORDER[a.tier] ?? 3) - (TIER_ORDER[b.tier] ?? 3);
  if (dt !== 0) return dt;
  // Enfin alphabétique
  return a.name.localeCompare(b.name);
}

// ─── Hook ─────────────────────────────────────────────────────────

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

      // Tout en parallèle — catalogue + spots user
      const [
        { data: brandsRaw },
        { data: familiesRaw },
        { data: modelsRaw },
        { data: spotsRaw },
      ] = await Promise.all([
        supabase
          .from('pokedex_brands')
          .select('id, name, tier')
          .order('name'),
        supabase
          .from('pokedex_families')
          .select('id, brand_id, name, sort_order')
          .order('sort_order'),
        supabase
          .from('pokedex_models')
          .select('id, family_id, name, rarity, is_boss'),
        supabase
          .from('spots')
          .select('pokedex_model_id, spotted_at')
          .eq('user_id', user.id)
          .not('pokedex_model_id', 'is', null),
      ]);

      // Map model_id → date de premier spot
      const spotMap = new Map<string, string>();
      spotsRaw?.forEach(s => {
        if (s.pokedex_model_id && !spotMap.has(s.pokedex_model_id)) {
          spotMap.set(s.pokedex_model_id, s.spotted_at);
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
            return {
              id:       family.id,
              name:     family.name,
              models,
              unlocked,
              total:    models.length,
            };
          });

        const totalModels    = families.reduce((s, f) => s + f.total, 0);
        const unlockedModels = families.reduce((s, f) => s + f.unlocked, 0);
        const progress       = totalModels > 0 ? unlockedModels / totalModels : 0;

        return {
          id:             brand.id,
          name:           brand.name,
          tier:           brand.tier as PokedexBrand['tier'],
          families,
          totalModels,
          unlockedModels,
          progress,
          isMaster:       totalModels > 0 && unlockedModels === totalModels,
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

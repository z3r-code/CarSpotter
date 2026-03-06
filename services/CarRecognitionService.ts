import { supabase } from '../supabase';
import { CarIdentification, RarityLevel } from '../types/car.types';

export const MAX_FREE_SCANS_PER_DAY = 3;

function getRarityFromCar(make: string, horsepower: number): RarityLevel {
  const m = make.toLowerCase();
  const hypercarBrands = ['bugatti', 'koenigsegg', 'pagani', 'rimac', 'hennessey'];
  if (hypercarBrands.some((b) => m.includes(b)) || horsepower >= 900) return 'platine';
  if (horsepower >= 550) return 'legendaire';
  if (horsepower >= 300) return 'epique';
  if (horsepower >= 130) return 'rare';
  return 'commun';
}

export async function checkScanQuota(
  userId: string
): Promise<{ canScan: boolean; scansToday: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('spots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

  if (error) throw new Error(error.message);

  const scansToday = count ?? 0;
  return { canScan: scansToday < MAX_FREE_SCANS_PER_DAY, scansToday };
}

export async function recognizeCar(base64Image: string): Promise<CarIdentification> {
  const { data, error } = await supabase.functions.invoke('identify-car', {
    body: { image: base64Image },
  });

  if (error) {
    // FunctionsHttpError stores the real info in error.context (the Response object)
    let errorMsg = error.message || '';
    try {
      // @ts-ignore
      const ctx = error.context;
      if (ctx && typeof ctx.text === 'function') {
        const body = await ctx.text();
        errorMsg = `HTTP ${ctx.status ?? '?'}: ${body}`;
      }
    } catch (_) {}

    errorMsg = errorMsg || error.constructor?.name || JSON.stringify(error) || 'Unknown error';
    console.error('Functions invoke error:', errorMsg);
    throw new Error(`Edge Function: ${errorMsg}`);
  }

  if (!data) throw new Error('Edge Function returned null data');

  console.log('AI response:', JSON.stringify(data));

  if (data.error) throw new Error(data.error);

  const rarity = getRarityFromCar(data.make ?? '', data.horsepower ?? 0);

  return {
    make: data.make ?? 'Inconnu',
    model: data.model ?? 'Inconnu',
    year: data.year ?? null,
    engine: data.engine ?? 'N/A',
    horsepower: data.horsepower ?? 0,
    rarity,
    confidence: data.confidence ?? 70,
  };
}

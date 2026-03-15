import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { brandIdFromMake, matchModel } from '../_shared/pokedexMatcher.ts';

const OPENAI_API_KEY            = Deno.env.get('OPENAI_API_KEY')            ?? '';
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert automotive AI. Analyze the car in the image and respond ONLY with a raw JSON object (no markdown, no code block) with these exact fields:
{
  "make": "Brand name (e.g. Ferrari)",
  "model": "Model name (e.g. 488 GTB)",
  "year": <number or null>,
  "engine": "Engine description (e.g. V8 3.9L Twin-Turbo)",
  "horsepower": <number>,
  "confidence": <number 0-100>
}
If no car is clearly visible, respond with: {"error": "no_car_detected"}`;

function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status:  200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * Matche make+model GPT contre le catalogue Pokédex.
 * Stratégie robuste en 2 étapes :
 * 1. Trouver le brand_id via brandIdFromMake
 * 2. Charger tous les modèles de ce brand via les families
 */
async function resolvePokedexModelId(
  make: string,
  model: string,
): Promise<string | null> {
  try {
    const brandId = brandIdFromMake(make);

    // Étape 1 : récupère les family IDs de cette marque
    const { data: families, error: famErr } = await supabaseAdmin
      .from('pokedex_families')
      .select('id')
      .eq('brand_id', brandId);

    if (famErr || !families?.length) {
      console.log(`[pokedex] No families for brand_id="${brandId}" (make="${make}"`);
      return null;
    }

    const familyIds = families.map(f => f.id);

    // Étape 2 : récupère tous les modèles de ces families
    const { data: models, error: modErr } = await supabaseAdmin
      .from('pokedex_models')
      .select('id, name, aliases')
      .in('family_id', familyIds);

    if (modErr || !models?.length) {
      console.log(`[pokedex] No models for brand_id="${brandId}"`);
      return null;
    }

    const matched = matchModel(model, models);
    console.log(`[pokedex] make="${make}" model="${model}" brand_id="${brandId}" -> "${matched}"`);
    return matched;
  } catch (e) {
    console.error('[resolvePokedexModelId]', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { image } = await req.json();
    if (!image) return ok({ error: 'no_image_provided' });

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:      'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type:      'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'low' },
              },
            ],
          },
        ],
      }),
    });

    const openaiText = await openaiRes.text();

    if (!openaiRes.ok) {
      try {
        const p = JSON.parse(openaiText);
        return ok({ error: p.error?.message ?? openaiText });
      } catch {
        return ok({ error: openaiText });
      }
    }

    let openaiData: Record<string, unknown>;
    try   { openaiData = JSON.parse(openaiText); }
    catch { return ok({ error: 'Failed to parse OpenAI response' }); }

    const content = (openaiData.choices as any)?.[0]?.message?.content ?? '{"error":"empty_response"}';

    let parsed: Record<string, unknown>;
    try   { parsed = JSON.parse(content); }
    catch { return ok({ error: `AI returned non-JSON: ${content}` }); }

    if (!parsed.error && parsed.make && parsed.model) {
      parsed.pokedex_model_id = await resolvePokedexModelId(
        String(parsed.make),
        String(parsed.model),
      );
    } else {
      parsed.pokedex_model_id = null;
    }

    return ok(parsed);

  } catch (err) {
    console.error('Edge function crash:', err);
    return ok({ error: String(err) });
  }
});

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

// ✅ Prompt beaucoup plus strict : interdit les deductions, exige la précision
const SYSTEM_PROMPT = `You are a precise automotive identification expert. Your task is to identify the EXACT car model visible in the image.

Rules:
- Be SPECIFIC: do not confuse similar models (e.g. F12 TDF ≠ LaFerrari, GT3 RS ≠ GT3, M4 CSL ≠ M4 Competition)
- Report ONLY what you can clearly see. Do NOT guess or hallucinate a model if you are not sure.
- If the image shows a toy, scale model or miniature car, still identify the real car it represents.
- Set "confidence" honestly: use <70 if the model is ambiguous, unclear or partially visible.
- For limited editions and special variants, use their FULL official name (e.g. "F12 TDF", "GT3 RS", "M4 CSL", "Aventador SVJ").

Respond ONLY with a raw JSON object (no markdown, no code block):
{
  "make": "Exact brand name (e.g. Ferrari)",
  "model": "Exact model name including variant (e.g. F12 TDF)",
  "year": <number or null>,
  "engine": "Engine description (e.g. V12 6.3L)",
  "horsepower": <number>,
  "confidence": <number 0-100>
}
If no car is clearly visible: {"error": "no_car_detected"}`;

function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status:  200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function resolvePokedexModelId(
  make: string,
  model: string,
): Promise<string | null> {
  try {
    const brandId = brandIdFromMake(make);
    const { data: families, error: famErr } = await supabaseAdmin
      .from('pokedex_families')
      .select('id')
      .eq('brand_id', brandId);

    if (famErr || !families?.length) {
      console.log(`[pokedex] No families for brand_id="${brandId}"`);
      return null;
    }

    const { data: models, error: modErr } = await supabaseAdmin
      .from('pokedex_models')
      .select('id, name, aliases')
      .in('family_id', families.map(f => f.id));

    if (modErr || !models?.length) return null;

    const matched = matchModel(model, models);
    console.log(`[pokedex] "${make} ${model}" -> "${matched}"`);
    return matched;
  } catch (e) {
    console.error('[resolvePokedexModelId]', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { image } = await req.json();
    if (!image) return ok({ error: 'no_image_provided' });

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // ✅ gpt-4o (pas mini) pour les voitures rares/spéciales — meilleure précision
        model:      'gpt-4o',
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type:      'image_url',
                // ✅ detail: 'high' pour les variantes visuellement proches
                image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'high' },
              },
            ],
          },
        ],
      }),
    });

    const openaiText = await openaiRes.text();
    if (!openaiRes.ok) {
      try { return ok({ error: (JSON.parse(openaiText) as any).error?.message ?? openaiText }); }
      catch { return ok({ error: openaiText }); }
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

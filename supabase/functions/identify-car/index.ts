import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
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

// Always return HTTP 200 — errors go in the JSON body as { error: "..." }
// This way supabase.functions.invoke puts everything in `data`, never in `error`
function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { image } = await req.json();
    if (!image) return ok({ error: 'no_image_provided' });

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
      }),
    });

    const openaiText = await openaiRes.text();

    if (!openaiRes.ok) {
      console.error('OpenAI error:', openaiText);
      // Parse OpenAI error for a cleaner message
      try {
        const parsed = JSON.parse(openaiText);
        return ok({ error: parsed.error?.message ?? openaiText });
      } catch {
        return ok({ error: openaiText });
      }
    }

    let openaiData: Record<string, unknown>;
    try {
      openaiData = JSON.parse(openaiText);
    } catch {
      return ok({ error: 'Failed to parse OpenAI response' });
    }

    const content = (openaiData.choices as any)?.[0]?.message?.content ?? '{"error":"empty_response"}';

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return ok({ error: `AI returned non-JSON: ${content}` });
    }

    return ok(parsed);
  } catch (err) {
    console.error('Edge function crash:', err);
    return ok({ error: String(err) });
  }
});

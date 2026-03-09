/**
 * Utilitaires de matching Pokédex — partagés entre Edge Functions
 */

/** Normalise une chaîne pour comparaison insensible à la casse / accents */
export function norm(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Convertit le nom de marque GPT en brand_id canonique
 * ex: 'Mercedes-Benz' -> 'mercedes', 'Volkswagen' -> 'volkswagen'
 */
export function brandIdFromMake(make: string): string {
  return norm(make)
    .replace('mercedes benz', 'mercedes')
    .replace('mercedes-benz', 'mercedes')
    .replace(/\bvw\b/, 'volkswagen')
    .replace('land rover', 'land_rover')
    .replace('rolls royce', 'rolls_royce')
    .replace('aston martin', 'aston_martin')
    .replace('ds automobiles', 'ds')
    .replace(/\s+/g, '_');
}

type ModelRow = { id: string; name: string; aliases: string[] };

/**
 * Matche le nom de modèle GPT contre les rows pokedex_models
 * Priorité : exact name > exact alias > partial name > partial alias
 */
export function matchModel(
  aiModel: string,
  rows: ModelRow[],
): string | null {
  if (!rows?.length) return null;
  const target = norm(aiModel);

  // 1. Exact match sur name
  for (const r of rows) {
    if (norm(r.name) === target) return r.id;
  }

  // 2. Exact match sur un alias
  for (const r of rows) {
    for (const a of r.aliases ?? []) {
      if (norm(a) === target) return r.id;
    }
  }

  // 3. Target contient le name (ex: 'rs3 sportback' contient 'rs3')
  for (const r of rows) {
    const n = norm(r.name);
    if (target.includes(n) || n.includes(target)) return r.id;
  }

  // 4. Target contient un alias
  for (const r of rows) {
    for (const a of r.aliases ?? []) {
      const na = norm(a);
      if (target.includes(na) || na.includes(target)) return r.id;
    }
  }

  return null;
}

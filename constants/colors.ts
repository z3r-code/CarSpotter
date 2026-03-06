/**
 * CarSpotter — Brand Identity Palette
 * Noir profond + Gris Nardo + Bleu Cyan
 */
export const C = {
  // ── Backgrounds ──────────────────────────────
  bg:          '#0C0C0F', // Fond principal (noir profond)
  surface:     '#14141A', // Cards, modals
  surfaceHigh: '#1C1C25', // Cards élevées
  surfaceTop:  '#22222E', // Items actifs

  // ── Borders ──────────────────────────────────
  border:      '#252530', // Bordures subtiles
  borderStrong:'#2E2E3E', // Bordures visibles

  // ── Brand Cyan ───────────────────────────────
  cyan:        '#00C8FF', // Couleur principale
  cyanSoft:    '#00C8FF18', // Fond transparent cyan
  cyanMid:     '#00C8FF55', // Semi-transparent
  cyanBright:  '#33D8FF', // Highlight

  // ── Text ─────────────────────────────────────
  textPrimary:   '#F0F0F5', // Blanc cassé
  textSecondary: '#6B6B80', // Gris Nardo clair
  textTertiary:  '#38384A', // Très estompé

  // ── Rarity ───────────────────────────────────
  platinum:  '#00C8FF', // Cyan — identité brand
  legendary: '#FFD700', // Or
  epic:      '#A855F7', // Violet
  rare:      '#3B82F6', // Bleu
  common:    '#4A4A5A', // Gris

  // ── Status ───────────────────────────────────
  success: '#22C55E',
  error:   '#EF4444',
} as const;

export type BrandColor = typeof C[keyof typeof C];

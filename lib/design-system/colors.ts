/**
 * PANEL PROFITS DESIGN SYSTEM — CANONICAL COLOR PALETTES
 * 
 * TWO INDEPENDENT COLOR SYSTEMS:
 * 
 * ERA = Environmental Context (mineral/historical tones)
 *   - Saturation: 25-45% (NEVER neon, never glowing fills)
 *   - Lightness: 28-42%
 *   - Used for: rim lights on hover, era indicator squares, contextual framing
 *   - Feel: ink, metal, aged paper, stone, museum labels
 * 
 * SCARCITY = Specimen Identity (jewel/biological tones)
 *   - Saturation: 55-75% (deeper with rarity, not brighter)
 *   - Lightness: 18-35%
 *   - Used for: card body fills, badges, price emphasis, rarity signaling
 */

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba')) {
    return color.replace(/[\d\.]+\)$/, `${alpha})`);
  }
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  let c = color.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// =============================================================================
// ERA COLOR PALETTE — Environmental Context (Mineral/Historical Tones)
// =============================================================================
export const ERA_COLORS = {
  platinum: {
    label: 'Platinum Age',
    range: 'Pre-1938',
    fullLabel: 'Platinum Age (Pre-1938)',
    rangeStart: '#8A7A6A',
    rangeEnd: '#C4B8A8',
    primary: '#A89880',
    bg: 'rgba(168, 152, 128, 0.30)',
    bgHover: 'rgba(196, 184, 168, 0.45)',
    border: '#BEB0A0',
    glow: '0 0 16px rgba(190, 176, 160, 0.50)',
    texture: 'Aged newsprint, museum-quality. Pre-superhero. Faded ivory.'
  },
  golden: {
    label: 'Golden Age',
    range: '1938-1945',
    fullLabel: 'Golden Age (1938-1945)',
    rangeStart: '#8A6A1F',
    rangeEnd: '#C9A227',
    primary: '#A57E2F',
    bg: 'rgba(138, 106, 31, 0.40)',
    bgHover: 'rgba(165, 126, 47, 0.55)',
    border: '#C9A227',
    glow: '0 0 16px rgba(201, 162, 39, 0.55)',
    texture: 'Warm matte metallic antique gold.'
  },
  atomic: {
    label: 'Atomic Age',
    range: '1946-1955',
    fullLabel: 'Atomic Age (1946-1955)',
    rangeStart: '#5A6A2A',
    rangeEnd: '#8B9B3A',
    primary: '#6E803A',
    bg: 'rgba(90, 106, 42, 0.38)',
    bgHover: 'rgba(110, 128, 58, 0.52)',
    border: '#8A9B3A',
    glow: '0 0 16px rgba(138, 155, 58, 0.50)',
    texture: 'Military surplus. Cold War paranoia. Olive drab.'
  },
  silver: {
    label: 'Silver Age',
    range: '1956-1970',
    fullLabel: 'Silver Age (1956-1970)',
    rangeStart: '#6A7A8A',
    rangeEnd: '#8A9A9C',
    primary: '#7A8A90',
    bg: 'rgba(106, 122, 138, 0.35)',
    bgHover: 'rgba(138, 154, 156, 0.50)',
    border: '#8A9A9C',
    glow: '0 0 16px rgba(138, 154, 156, 0.50)',
    texture: 'Cool pale steel, analytical, space age blue-gray.'
  },
  bronze: {
    label: 'Bronze Age',
    range: '1970-1985',
    fullLabel: 'Bronze Age (1970-1985)',
    rangeStart: '#5A3F2A',
    rangeEnd: '#8B6914',
    primary: '#724A31',
    bg: 'rgba(90, 63, 42, 0.45)',
    bgHover: 'rgba(114, 74, 49, 0.55)',
    border: '#8B6914',
    glow: '0 0 16px rgba(139, 105, 20, 0.50)',
    texture: 'Earthy burnt umber, gritty street realism.'
  },
  copper: {
    label: 'Copper Age',
    range: '1985-1992',
    fullLabel: 'Copper Age (1985-1992)',
    rangeStart: '#7A4528',
    rangeEnd: '#9A6233',
    primary: '#8A5430',
    bg: 'rgba(122, 69, 40, 0.40)',
    bgHover: 'rgba(154, 98, 51, 0.55)',
    border: '#9A6233',
    glow: '0 0 16px rgba(154, 98, 51, 0.50)',
    texture: 'Oxidized copper, direct market birth.'
  },
  modern: {
    label: 'Modern Age',
    range: '1992-2011',
    fullLabel: 'Modern Age (1992-2011)',
    rangeStart: '#2A4A5A',
    rangeEnd: '#5A7A6A',
    primary: '#3A5A60',
    bg: 'rgba(42, 74, 90, 0.40)',
    bgHover: 'rgba(58, 90, 96, 0.55)',
    border: '#5A7A6A',
    glow: '0 0 16px rgba(90, 122, 106, 0.50)',
    texture: 'Grounded dark steel teal, speculation boom.'
  },
  independent: {
    label: 'Independent',
    range: 'Various',
    fullLabel: 'Independent Era',
    rangeStart: '#3A5A3A',
    rangeEnd: '#7A4A6A',
    primary: '#556E41',
    bg: 'rgba(58, 90, 58, 0.40)',
    bgHover: 'rgba(85, 110, 65, 0.55)',
    border: '#7A4A6A',
    glow: '0 0 16px rgba(122, 74, 106, 0.50)',
    texture: 'Organic moss green and underground violet.'
  },
  postmodern: {
    label: 'Postmodern Age',
    range: '2000-present',
    fullLabel: 'Postmodern Age (2000-present)',
    rangeStart: '#7c3aed',
    rangeEnd: '#a855f7',
    primary: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.25)',
    bgHover: 'rgba(168, 85, 247, 0.45)',
    border: '#a855f7',
    glow: '0 0 16px rgba(168, 85, 247, 0.60)',
    texture: 'Vivid electric purple and violet, cinematic saturation.'
  }
} as const;

export const ERA_LOOKUP: Record<string, typeof ERA_COLORS[keyof typeof ERA_COLORS]> = {
  'platinum': ERA_COLORS.platinum,
  'platinum age': ERA_COLORS.platinum,
  'platinum_age': ERA_COLORS.platinum,
  'golden': ERA_COLORS.golden,
  'golden age': ERA_COLORS.golden,
  'golden_age': ERA_COLORS.golden,
  'atomic': ERA_COLORS.atomic,
  'atomic age': ERA_COLORS.atomic,
  'atomic_age': ERA_COLORS.atomic,
  'silver': ERA_COLORS.silver,
  'silver age': ERA_COLORS.silver,
  'silver_age': ERA_COLORS.silver,
  'bronze': ERA_COLORS.bronze,
  'bronze age': ERA_COLORS.bronze,
  'bronze_age': ERA_COLORS.bronze,
  'copper': ERA_COLORS.copper,
  'copper age': ERA_COLORS.copper,
  'copper_age': ERA_COLORS.copper,
  'modern': ERA_COLORS.modern,
  'modern age': ERA_COLORS.modern,
  'modern_age': ERA_COLORS.modern,
  'independent': ERA_COLORS.independent,
  'postmodern': ERA_COLORS.postmodern,
  'postmodern age': ERA_COLORS.postmodern,
  'postmodern_age': ERA_COLORS.postmodern
};

// =============================================================================
// SCARCITY COLOR PALETTE — Specimen Identity (Jewel/Biological Tones)
// =============================================================================
export const SCARCITY_COLORS = {
  mythic: {
    label: 'Mythic',
    primary: '#3A1755',
    bg: 'rgba(43, 15, 63, 0.88)',
    bgHover: 'rgba(58, 23, 85, 0.94)',
    border: '#5A2A8A',
    text: '#E8E0F0',
    feel: 'Singular and dangerous. Deep violet.'
  },
  legendary: {
    label: 'Legendary',
    primary: '#AD6C24',
    bg: 'rgba(122, 74, 26, 0.88)',
    bgHover: 'rgba(173, 108, 36, 0.94)',
    border: '#D18A2A',
    text: '#F0E8D8',
    feel: 'Warm, heavy, famous amber.'
  },
  epic: {
    label: 'Epic',
    primary: '#7A1C37',
    bg: 'rgba(90, 15, 31, 0.88)',
    bgHover: 'rgba(122, 28, 55, 0.94)',
    border: '#9A2A4F',
    text: '#F0E0E8',
    feel: 'Deep crimson and magenta.'
  },
  rare: {
    label: 'Rare',
    primary: '#173C7A',
    bg: 'rgba(15, 42, 90, 0.88)',
    bgHover: 'rgba(23, 60, 122, 0.94)',
    border: '#2A5A8A',
    text: '#E0E8F0',
    feel: 'Sapphire and deep cobalt.'
  },
  uncommon: {
    label: 'Uncommon',
    primary: '#1C6C52',
    bg: 'rgba(15, 74, 58, 0.88)',
    bgHover: 'rgba(28, 108, 82, 0.94)',
    border: '#4A7A5A',
    text: '#E0F0E8',
    feel: 'Forest green and deep jade.'
  },
  common: {
    label: 'Common',
    primary: '#FFFFFF',
    bg: 'rgba(255, 255, 255, 0.18)',
    bgHover: 'rgba(255, 255, 255, 0.30)',
    border: '#FFFFFF',
    text: '#FFFFFF',
    feel: 'Pure luminous white.'
  }
} as const;

export type ScarcityTier = keyof typeof SCARCITY_COLORS;
export type EraTier = keyof typeof ERA_COLORS;

// =============================================================================
// PUBLISHER COLOR ACCENTS
// =============================================================================
export const PUBLISHER_COLORS: Record<string, string> = {
  'marvel': '#B22222',
  'marvel comics': '#B22222',
  'dc': '#1B4FA8',
  'dc comics': '#1B4FA8',
  'image': '#C49A0A',
  'image comics': '#C49A0A',
  'idw': '#C05A18',
  'idw publishing': '#C05A18',
  'dark horse': '#8B2A2A',
  'dark horse comics': '#8B2A2A',
  'vertigo': '#5A3A8A',
  'boom': '#A03030',
  'boom! studios': '#A03030',
  'fantagraphics': '#2A6A6A',
  'drawn & quarterly': '#3A4A7A',
  'valiant': '#1A5A4A',
  'dynamite': '#8A5A1A',
  'archie': '#9A2020',
  'dell': '#7A5A18',
  'gold key': '#7A5A18',
  'ec': '#5A6A2A',
  'ec comics': '#5A6A2A',
  'charlton': '#3A4A5A',
  'fawcett': '#7A2A3A',
};

export function getPublisherColor(publisher: string | null | undefined): string {
  if (!publisher) return 'rgba(255,255,255,0.18)';
  const key = publisher.toLowerCase().trim();
  if (PUBLISHER_COLORS[key]) return PUBLISHER_COLORS[key];
  const stripped = key.replace(/\s+comics$/i, '').trim();
  if (PUBLISHER_COLORS[stripped]) return PUBLISHER_COLORS[stripped];
  return 'rgba(255,255,255,0.18)';
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
export function getEraColors(era: string | null | undefined) {
  if (!era) return ERA_COLORS.modern;
  const normalized = era.toLowerCase().replace(/_/g, ' ').replace(/\s+age$/, '').trim();
  return ERA_LOOKUP[normalized] || ERA_LOOKUP[era.toLowerCase()] || ERA_COLORS.modern;
}

export function getScarcityColors(scarcity: string | null | undefined) {
  if (!scarcity) return SCARCITY_COLORS.common;
  const normalized = scarcity.toLowerCase() as ScarcityTier;
  return SCARCITY_COLORS[normalized] || SCARCITY_COLORS.common;
}

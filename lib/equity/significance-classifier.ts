import { LANDMARK_MARVEL_DEBUTS } from "@/lib/wiki/entity-extractor";
import { resolveIssueDebuts } from "@/lib/wiki/debut-resolver";
import type { ScarcityTier } from "@/lib/design-system/colors";
import { resolveFloatScarcityTier } from "@/lib/equity/scarcity-float";

/**
 * Resolves the primary historical milestone badge for any comic issue
 * (e.g. "1st App. Spider-Man", "1st App. Wolverine", "Series Premiere #1", "Centennial #100").
 */
export function resolveHistoricalKeyBadge(
  seriesName?: string | null,
  issueNumber?: string | null
): string | null {
  if (!seriesName || !issueNumber) return null;

  const cleanSeries = seriesName.toLowerCase().replace(/^(the|a)\s+/, "").trim();
  const cleanIssue = issueNumber.replace(/^#/, "").trim();
  const key = `${cleanSeries} #${cleanIssue}`;

  // 1. Curated Landmark Milestones & Character Genesis
  if (LANDMARK_MARVEL_DEBUTS[key]) {
    const chars = LANDMARK_MARVEL_DEBUTS[key].characters;
    if (chars && chars.length > 0) {
      const topChar = chars[0].replace(/\s*\([^)]*\)/, "").trim();
      return `1st App. ${topChar}`;
    }
  }

  // 2. Comprehensive First Appearance Database
  const deb = resolveIssueDebuts(seriesName, issueNumber);
  if (deb && deb.characters && deb.characters.length > 0) {
    const cleanChars = deb.characters.filter(
      (c) => !c.startsWith("|") && !c.startsWith("*") && c.length < 32 && !c.includes("Vol ")
    );
    if (cleanChars.length > 0) {
      const topChar = cleanChars[0].replace(/\s*\([^)]*\)/, "").trim();
      return `1st App. ${topChar}`;
    }
  }

  // 3. Issue #1 Premiere
  if (cleanIssue === "1") {
    return "Premiere Issue";
  }

  // 4. Centenary Publication Milestones
  const num = parseInt(cleanIssue, 10);
  if (num > 0 && num % 100 === 0) {
    return `Centennial #${num}`;
  }

  return null;
}

/**
 * Scarcity tier from float mechanics (lib/equity/scarcity-float.ts): the issue's age
 * (era of its own publication year) → assumed print run × survival × 9.0+ share →
 * estimated census → canon tier cutoffs. Price, key status and variants never move it
 * (Price Firewall; modifiers never change scarcity). Only a proven CE70 Sovereign seat
 * is pinned mythic.
 */
export function resolveHistoricalScarcityTier(params: {
  year?: number | null;
  era?: string | null;
  keyBadge?: string | null;
  isSovereign?: boolean | null;
  variant?: string | null;
  /** Real CGC census (copies graded, all grades) for this book, when matched; overrides the era estimate. */
  cgcTotalGraded?: number | null;
}): ScarcityTier {
  if (params.isSovereign) return "mythic";
  return resolveFloatScarcityTier(params.era, params.year, params.cgcTotalGraded);
}

/**
 * Assigns Market Security Class based on Canonical System Map & Asset Ontology:
 * - SOV: Direct universal bluelabel 9.8 comic.
 * - PREMIUM: 45.00 to infinity (or landmark key issues).
 * - STD: Standard issues (18.00 to 44.99).
 * - OTC: Over-the-counter issues (less than 17.99).
 */
export function resolveHistoricalMarketClass(params: {
  isSovereign: boolean;
  fmv?: number | null;
  price?: number | null;
  keyBadge?: string | null;
  year?: number | null;
  era?: string | null;
  variant?: string | null;
}): "SOV" | "PREMIUM" | "STD" | "OTC" {
  const { isSovereign, fmv, price, keyBadge, year, era, variant } = params;

  if (isSovereign) {
    return "SOV";
  }

  // Exact Price Thresholds:
  // - otc is less than 17.99
  // - standard is 18.00 to 44.99
  // - premium is 45.00 to infinity
  const priceVal = price ?? fmv;
  if (priceVal != null && !isNaN(Number(priceVal)) && Number(priceVal) > 0) {
    const p = Number(priceVal);
    if (p < 17.99) return "OTC";
    if (p <= 44.99) return "STD";
    return "PREMIUM";
  }

  const eraNormalized = (era || "").toLowerCase().trim();

  // Historical Keys, Character Debuts, Golden/Atomic/Silver landmark issues are PREMIUM
  if (
    (keyBadge && (keyBadge.startsWith("1st App.") || keyBadge === "Premiere Issue")) ||
    (year && year <= 1969) ||
    eraNormalized === "golden" ||
    eraNormalized === "atomic" ||
    eraNormalized === "silver" ||
    Boolean(variant)
  ) {
    return "PREMIUM";
  }

  return "STD";
}

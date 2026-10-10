import type { ScarcityTier } from "@/lib/design-system/colors";

/**
 * SCARCITY FROM FLOAT MECHANICS (Panel Profits canon engine, canonEngine.ts)
 *
 *   survivors      = ASSUMED_PRINT_RUN[era] × ERA_SURVIVAL_RATE[era]
 *   census (≥ 9.0) = round(survivors × 0.10 × GRADE_9_PLUS_FRACTION_OF_SURVIVORS[era])
 *   tier           = classifyScarcityTier(census)   ≤5 mythic · ≤25 legendary · ≤100 rare · ≤500 uncommon · else common
 *
 * Inputs are the issue's age (era of its own publication year) and the assumed
 * print/survival distribution for that age. Nothing here reads price, key
 * status, variant status or any score: modifiers never change scarcity.
 *
 * The canon engine defines six eras. The repo's ten age buckets map onto them:
 *   platinum, golden, atomic → golden   (oldest canon bucket; no separate constants exist)
 *   silver → silver · bronze → bronze · copper → copper
 *   modern, independent → modern · postmodern → post_modern
 */

type CanonEra = "golden" | "silver" | "bronze" | "copper" | "modern" | "post_modern";

const ASSUMED_PRINT_RUN: Record<CanonEra, number> = {
  golden: 100_000,
  silver: 300_000,
  bronze: 200_000,
  copper: 150_000,
  modern: 100_000,
  post_modern: 60_000,
};

const ERA_SURVIVAL_RATES: Record<CanonEra, number> = {
  golden: 0.02,
  silver: 0.08,
  bronze: 0.15,
  copper: 0.25,
  modern: 0.45,
  post_modern: 0.7,
};

const GRADE_9_PLUS_FRACTION_OF_SURVIVORS: Record<CanonEra, number> = {
  golden: 0.03,
  silver: 0.06,
  bronze: 0.12,
  copper: 0.2,
  modern: 0.55,
  post_modern: 0.65,
};

const GRADED_FRACTION = 0.1;

const AGE_TO_CANON: Record<string, CanonEra> = {
  platinum: "golden",
  golden: "golden",
  atomic: "golden",
  silver: "silver",
  bronze: "bronze",
  copper: "copper",
  modern: "modern",
  independent: "modern",
  postmodern: "post_modern",
};

/** Same cutoffs as resolveProductionAge / pp_era. */
function ageFromYear(year: number): string {
  if (year < 1938) return "platinum";
  if (year <= 1945) return "golden";
  if (year <= 1955) return "atomic";
  if (year <= 1969) return "silver";
  if (year <= 1983) return "bronze";
  if (year <= 1991) return "copper";
  if (year <= 2003) return "modern";
  if (year <= 2016) return "independent";
  return "postmodern";
}

function normalizeAge(age?: string | null): string | null {
  const a = (age || "").toLowerCase().replace(/[\s_-]+/g, "").replace(/age$/, "");
  return a in AGE_TO_CANON ? a : null;
}

export function estimateCensusAt9Plus(age?: string | null, year?: number | null): number | null {
  const key = normalizeAge(age) ?? (year ? ageFromYear(year) : null);
  if (!key) return null;
  const era = AGE_TO_CANON[key];
  return Math.round(
    ASSUMED_PRINT_RUN[era] * ERA_SURVIVAL_RATES[era] * GRADED_FRACTION * GRADE_9_PLUS_FRACTION_OF_SURVIVORS[era]
  );
}

export function classifyScarcityTier(censusAt9Plus: number | null): ScarcityTier {
  if (censusAt9Plus === null) return "common";
  if (censusAt9Plus <= 5) return "mythic";
  if (censusAt9Plus <= 25) return "legendary";
  if (censusAt9Plus <= 100) return "rare";
  if (censusAt9Plus <= 500) return "uncommon";
  return "common";
}

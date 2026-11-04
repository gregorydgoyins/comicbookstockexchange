/**
 * pc-nomenclature.ts
 * ==================
 * Single translation layer: PriceCharting (PC) nomenclature → Panel Profits (PP) wording.
 *
 * PriceCharting re-uses its video-game vocabulary for comics ("loose", "cib", "box-only",
 * "manual-only", "grade-seventeen" …). Every PC name has exactly one comic grade, taken from
 * the labels PriceCharting prints on its own comic pages (column headers and the
 * "Sold Listings" grade dropdown). Nothing here is inferred.
 *
 * Three PC vocabularies map onto the same grade:
 *   1. API / CSV price fields   e.g. "manual-only-price"
 *   2. Chart history tracks     e.g. "manualonly"            (VGPC.chart_data)
 *   3. Sold-listing tables      e.g. "completed-auctions-manual-only"
 *
 * Then each grade carries its PP wording: CGC label, standard abbreviation and name,
 * and the PP tier role (9.8 = SOVEREIGN, 9.6 = ANCHOR, RAW = UNGRADED).
 */

export type PpGrade =
  | "RAW" | "0.5" | "1.0" | "1.5" | "1.8" | "2.0" | "2.5" | "3.0" | "3.5" | "4.0" | "4.5"
  | "5.0" | "5.5" | "6.0" | "6.5" | "7.0" | "7.5" | "8.0" | "8.5" | "9.0" | "9.2" | "9.4"
  | "9.6" | "9.8" | "9.9" | "10.0";

export type PpTierRole = "SOVEREIGN" | "ANCHOR" | "UNGRADED" | null;

export interface PpGradeWording {
  grade: PpGrade;
  /** e.g. "CGC 9.8" or "Raw" */
  label: string;
  /** Standard CGC abbreviation, e.g. "NM/M" */
  abbr: string;
  /** Standard CGC grade name, e.g. "Near Mint/Mint" */
  name: string;
  /** Panel Profits role for this grade */
  tier: PpTierRole;
}

/** 1. PC API / CSV price fields → grade (matches PriceCharting comic column headers). */
export const PC_PRICE_FIELD_TO_GRADE: Record<string, PpGrade> = {
  "loose-price": "RAW",
  "condition-9-price": "2.0",
  "condition-13-price": "3.0",
  "cib-price": "4.0",
  "condition-14-price": "5.0",
  "new-price": "6.0",
  "condition-15-price": "7.0",
  "graded-price": "8.0",
  "condition-16-price": "9.0",
  "box-only-price": "9.2",
  "condition-17-price": "9.4",
  "condition-10-price": "9.6",
  "manual-only-price": "9.8",
  "bgs-10-price": "10.0",
};

/** 2. PC chart_data history tracks → grade. */
export const PC_CHART_TRACK_TO_GRADE: Record<string, PpGrade> = {
  used: "RAW",
  cib: "4.0",
  new: "6.0",
  graded: "8.0",
  boxonly: "9.2",
  manualonly: "9.8",
};

/**
 * 3. PC sold-listing table slugs → grade, as labelled in PriceCharting's own
 * "Sold Listings" dropdown on comic pages (verified 2026-11-02 on product 2335151).
 */
export const PC_SOLD_TABLE_TO_GRADE: Record<string, PpGrade> = {
  "used": "RAW",
  "loose-and-manual": "2.0",
  "grade-three": "3.0",
  "cib": "4.0",
  "grade-four": "5.0",
  "new": "6.0",
  "grade-five": "7.0",
  "graded": "8.0",
  "grade-six": "9.0",
  "box-only": "9.2",
  "grade-seventeen": "9.4",
  "box-and-manual": "9.6",
  "manual-only": "9.8",
  "loose-and-box": "10.0",
};

/** Standard CGC grade names + Panel Profits tier roles. */
export const PP_GRADE_WORDING: Record<PpGrade, PpGradeWording> = {
  "RAW":  { grade: "RAW",  label: "Raw",      abbr: "RAW",   name: "Ungraded",          tier: "UNGRADED" },
  "0.5":  { grade: "0.5",  label: "CGC 0.5",  abbr: "PR",    name: "Poor",              tier: null },
  "1.0":  { grade: "1.0",  label: "CGC 1.0",  abbr: "FR",    name: "Fair",              tier: null },
  "1.5":  { grade: "1.5",  label: "CGC 1.5",  abbr: "FR/G",  name: "Fair/Good",         tier: null },
  "1.8":  { grade: "1.8",  label: "CGC 1.8",  abbr: "G-",    name: "Good-",             tier: null },
  "2.0":  { grade: "2.0",  label: "CGC 2.0",  abbr: "G",     name: "Good",              tier: null },
  "2.5":  { grade: "2.5",  label: "CGC 2.5",  abbr: "G+",    name: "Good+",             tier: null },
  "3.0":  { grade: "3.0",  label: "CGC 3.0",  abbr: "G/VG",  name: "Good/Very Good",    tier: null },
  "3.5":  { grade: "3.5",  label: "CGC 3.5",  abbr: "VG-",   name: "Very Good-",        tier: null },
  "4.0":  { grade: "4.0",  label: "CGC 4.0",  abbr: "VG",    name: "Very Good",         tier: null },
  "4.5":  { grade: "4.5",  label: "CGC 4.5",  abbr: "VG+",   name: "Very Good+",        tier: null },
  "5.0":  { grade: "5.0",  label: "CGC 5.0",  abbr: "VG/F",  name: "Very Good/Fine",    tier: null },
  "5.5":  { grade: "5.5",  label: "CGC 5.5",  abbr: "F-",    name: "Fine-",             tier: null },
  "6.0":  { grade: "6.0",  label: "CGC 6.0",  abbr: "F",     name: "Fine",              tier: null },
  "6.5":  { grade: "6.5",  label: "CGC 6.5",  abbr: "F+",    name: "Fine+",             tier: null },
  "7.0":  { grade: "7.0",  label: "CGC 7.0",  abbr: "F/VF",  name: "Fine/Very Fine",    tier: null },
  "7.5":  { grade: "7.5",  label: "CGC 7.5",  abbr: "VF-",   name: "Very Fine-",        tier: null },
  "8.0":  { grade: "8.0",  label: "CGC 8.0",  abbr: "VF",    name: "Very Fine",         tier: null },
  "8.5":  { grade: "8.5",  label: "CGC 8.5",  abbr: "VF+",   name: "Very Fine+",        tier: null },
  "9.0":  { grade: "9.0",  label: "CGC 9.0",  abbr: "VF/NM", name: "Very Fine/Near Mint", tier: null },
  "9.2":  { grade: "9.2",  label: "CGC 9.2",  abbr: "NM-",   name: "Near Mint-",        tier: null },
  "9.4":  { grade: "9.4",  label: "CGC 9.4",  abbr: "NM",    name: "Near Mint",         tier: null },
  "9.6":  { grade: "9.6",  label: "CGC 9.6",  abbr: "NM+",   name: "Near Mint+",        tier: "ANCHOR" },
  "9.8":  { grade: "9.8",  label: "CGC 9.8",  abbr: "NM/M",  name: "Near Mint/Mint",    tier: "SOVEREIGN" },
  "9.9":  { grade: "9.9",  label: "CGC 9.9",  abbr: "M",     name: "Mint",              tier: null },
  "10.0": { grade: "10.0", label: "CGC 10.0", abbr: "GM",    name: "Gem Mint",          tier: null },
};

export const PP_SOVEREIGN_GRADE: PpGrade = "9.8";
export const PP_ANCHOR_GRADE: PpGrade = "9.6";

/** Translate any PC name (price field, chart track, or sold-table slug) to a PP grade. null if unknown. */
export function pcToPpGrade(pcName: string): PpGrade | null {
  const key = pcName.trim().toLowerCase().replace(/^completed-auctions-/, "");
  return PC_PRICE_FIELD_TO_GRADE[key] ?? PC_CHART_TRACK_TO_GRADE[key] ?? PC_SOLD_TABLE_TO_GRADE[key] ?? null;
}

/** Full PP wording for a PC name. null if the PC name has no known grade. */
export function pcToPpWording(pcName: string): PpGradeWording | null {
  const g = pcToPpGrade(pcName);
  return g ? PP_GRADE_WORDING[g] : null;
}

/** PP wording for a grade string like "9.8", "RAW", "Ungraded". */
export function ppWording(grade: string): PpGradeWording | null {
  const g = grade.trim().toUpperCase() === "UNGRADED" ? "RAW" : grade.trim().toUpperCase();
  return (PP_GRADE_WORDING as Record<string, PpGradeWording>)[g] ?? null;
}

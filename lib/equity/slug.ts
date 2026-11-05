// lib/equity/slug.ts
// Delimited, unambiguous slug generation, parsing, and series/volume resolution.

export interface ParsedComicSlug {
  ticker: string;
  volume: number;
  issue: string;
  year?: number | null;
  raw: string;
  isDelimited: boolean;
}

/**
 * Maps common ticker roots to canonical series names.
 */
export const TICKER_TO_SERIES_MAP: Record<string, string> = {
  XMN: "X-Men",
  ASM: "Amazing Spider-Man",
  ACT: "Action Comics",
  DET: "Detective Comics",
  BAT: "Batman",
  SUP: "Superman",
  FF: "Fantastic Four",
  AVG: "Avengers",
  HLK: "Incredible Hulk",
  TOS: "Tales of Suspense",
  JIM: "Journey into Mystery",
  ST: "Strange Tales",
  DD: "Daredevil",
  IRM: "Iron Man",
  CAP: "Captain America",
  ASC: "All Star Comics",
  TH: "Thor",
  WW: "Wonder Woman",
  SS: "Silver Surfer",
  GL: "Green Lantern",
  AQM: "Aquaman",
  SPW: "Spawn",
  GSX: "Giant-Size X-Men",
  SW: "Secret Wars",
  TOD: "Tomb of Dracula",
  WCH: "Watchmen",
  DKR: "The Dark Knight Returns",
  NM: "New Mutants",
  UF: "Ultimate Fallout",
  TMNT: "Teenage Mutant Ninja Turtles",
  AXM: "Astonishing X-Men",
  UXM: "Ultimate X-Men",
  WXM: "Weapon X-Men",
  NXM: "New X-Men",
  ANX: "All-New X-Men",
  XFC: "X-Force",
  XFT: "X-Factor",
  SSM: "Spectacular Spider-Man",
  USM: "Ultimate Spider-Man",
  WOS: "Web of Spider-Man",
};

/**
 * Volume publication year boundaries for major flagship titles.
 * Used to prevent modern reprints and volume restarts from contaminating vintage apex issues.
 */
export const SERIES_VOLUME_YEAR_RANGES: Record<string, Record<number, { minYear: number; maxYear: number }>> = {
  "x-men": {
    1: { minYear: 1963, maxYear: 1981 }, // Uncanny X-Men Vol 1
    2: { minYear: 1991, maxYear: 2001 }, // X-Men Vol 2 (Jim Lee / Fabian Nicieza)
    3: { minYear: 2010, maxYear: 2013 },
    4: { minYear: 2013, maxYear: 2015 },
    5: { minYear: 2019, maxYear: 2021 }, // Hickman Era
    6: { minYear: 2021, maxYear: 2024 },
  },
  "amazing spider-man": {
    1: { minYear: 1963, maxYear: 1998 },
    2: { minYear: 1999, maxYear: 2003 },
    3: { minYear: 2014, maxYear: 2015 },
    4: { minYear: 2015, maxYear: 2018 },
    5: { minYear: 2018, maxYear: 2022 },
    6: { minYear: 2022, maxYear: 2026 },
  },
  "batman": {
    1: { minYear: 1940, maxYear: 2011 },
    2: { minYear: 2011, maxYear: 2016 }, // New 52
    3: { minYear: 2016, maxYear: 2026 }, // Rebirth
  },
  "action comics": {
    1: { minYear: 1938, maxYear: 2011 },
    2: { minYear: 2011, maxYear: 2016 },
    3: { minYear: 2016, maxYear: 2026 },
  },
  "detective comics": {
    1: { minYear: 1937, maxYear: 2011 },
    2: { minYear: 2011, maxYear: 2016 },
    3: { minYear: 2016, maxYear: 2026 },
  },
  "avengers": {
    1: { minYear: 1963, maxYear: 1996 },
    2: { minYear: 1996, maxYear: 1997 },
    3: { minYear: 1998, maxYear: 2004 },
  },
  "fantastic four": {
    1: { minYear: 1961, maxYear: 1996 },
    2: { minYear: 1996, maxYear: 1997 },
    3: { minYear: 1998, maxYear: 2012 },
  },
};

/**
 * Generates an unambiguous delimited slug for a comic.
 * Replaces naive concatenation with a strict delimiter to prevent collisions.
 * e.g., generateComicSlug("XMN", 1, 1) -> "XMN-V1-1"
 *       generateComicSlug("XMN", 1, 11) -> "XMN-V1-11"
 */
export function generateComicSlug(ticker: string, volume: number | string = 1, issue: string | number = "1"): string {
  const cleanTicker = ticker.trim().toUpperCase().replace(/^\$/, "");
  const cleanVol = String(volume || 1).trim();
  const cleanIssue = String(issue ?? "1").trim();
  return `${cleanTicker}-V${cleanVol}-${cleanIssue}`;
}

/**
 * Slug Parser to safely extract ticker, volume, and issue parameters from the URL.
 * Safely parses:
 *   - "XMN-V1-1" -> { ticker: "XMN", volume: 1, issue: "1", isDelimited: true }
 *   - "XMN-V1-11" -> { ticker: "XMN", volume: 1, issue: "11", isDelimited: true }
 *   - "XMN-1-1" -> { ticker: "XMN", volume: 1, issue: "1", isDelimited: true }
 *   - "XMN01" -> { ticker: "XMN", volume: 1, issue: "1", isDelimited: false }
 *   - "XMN11" -> { ticker: "XMN", volume: 1, issue: "11", isDelimited: false }
 */
export function parseComicSlug(slug: string): ParsedComicSlug | null {
  if (!slug || typeof slug !== "string") return null;
  const clean = slug.trim().toUpperCase().replace(/^\$/, "");

  // 1. Strict delimited with explicit V: e.g. "XMN-V1-1" or "XMN-V1-11" or "XMN-V1-1-1963"
  const vMatch = clean.match(/^([A-Z0-9]+)-V(\d+)-(\d+[A-Za-z0-9.]*)(?:-(\d{4}))?$/i);
  if (vMatch) {
    return {
      ticker: vMatch[1].toUpperCase(),
      volume: parseInt(vMatch[2], 10),
      issue: vMatch[3],
      year: vMatch[4] ? parseInt(vMatch[4], 10) : undefined,
      raw: clean,
      isDelimited: true,
    };
  }

  // 2. Delimited format with hyphens: e.g. "XMN-1-1" or "XMN-11"
  const hyphenParts = clean.split("-");
  if (hyphenParts.length === 3 && /^\d+$/.test(hyphenParts[1])) {
    return {
      ticker: hyphenParts[0].toUpperCase(),
      volume: parseInt(hyphenParts[1], 10) || 1,
      issue: hyphenParts[2],
      raw: clean,
      isDelimited: true,
    };
  } else if (hyphenParts.length === 2 && /^\d+$/.test(hyphenParts[1])) {
    return {
      ticker: hyphenParts[0].toUpperCase(),
      volume: 1,
      issue: hyphenParts[1],
      raw: clean,
      isDelimited: true,
    };
  }

  // 3. Fallback for legacy non-delimited slugs/tickers (e.g. XMN01, XMN11, ASM300, etc.)
  const match = clean.match(/^([A-Z]+)(\d+)$/i);
  if (match) {
    const ticker = match[1].toUpperCase();
    const numPart = match[2];

    // Disambiguation:
    // Leading zero indicates padded issue number (e.g. XMN01 -> Issue 1)
    if (numPart.startsWith("0")) {
      return {
        ticker,
        volume: 1,
        issue: String(parseInt(numPart, 10)),
        raw: clean,
        isDelimited: false,
      };
    }

    // Unpadded digits (e.g. XMN11):
    // Defaults to issue = numPart (Issue 11), volume = 1
    return {
      ticker,
      volume: 1,
      issue: numPart,
      raw: clean,
      isDelimited: false,
    };
  }

  return null;
}

/**
 * Resolves the canonical series title from a ticker root symbol.
 */
export function getSeriesFromTicker(ticker: string): string | null {
  const clean = ticker.trim().toUpperCase();
  return TICKER_TO_SERIES_MAP[clean] ?? null;
}

/**
 * Resolves year constraints based on series and volume.
 */
export function getVolumeYearFilter(series: string, volume: number): { minYear: number; maxYear: number } | null {
  const norm = series.trim().toLowerCase();
  return SERIES_VOLUME_YEAR_RANGES[norm]?.[volume] ?? null;
}

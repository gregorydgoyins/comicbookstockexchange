import fs from "fs";
import path from "path";
import { createRequire } from "node:module";
import { createPublicReadOnlyClient, createAdminServerClient } from "@/lib/supabase/admin";
import { 
  translateToEnglishSeries, 
  translateToEnglishPublisher, 
  translateToEnglishDate 
} from "@/lib/comics/translation-utils";

const requireModule = createRequire(import.meta.url);

export interface GcdVariantItem {
  id: number;
  issueNumber: string;
  variantName: string;
  price: string;
  barcode: string;
  publicationDate: string;
  coverUrl?: string;
  catalogId?: string;
  coverArtist?: string;
}

export interface GcdForeignEditionItem {
  reprintId: number;
  targetIssueId: number;
  seriesName: string;
  country: string;
  language: string;
  publicationDate: string;
  issueNumber: string;
  publisherName?: string;
  notes?: string;
  isDomesticSpecial?: boolean;
  catalogId?: string;
  coverUrl?: string;
}

export interface GcdCreatorCredit {
  role: string;
  name: string;
}

export interface GcdStoryItem {
  id: number;
  title: string;
  sequenceNumber: number;
  pageCount: number;
  characters: string;
  synopsis: string;
  credits: GcdCreatorCredit[];
}

export interface GcdRelationalData {
  baseIssueId: number;
  seriesName: string;
  issueNumber: string;
  publicationDate: string;
  variants: GcdVariantItem[];
  foreignEditions: GcdForeignEditionItem[];
  stories: GcdStoryItem[];
  issueCredits: GcdCreatorCredit[];
  allWriters: string[];
  allPencilers: string[];
  allInkers: string[];
  allColorists: string[];
  allLetterers: string[];
  allEditors: string[];
  allCoverArtists: string[];
}

const GCD_DB_PATH = "/Users/macuser/Downloads/gcd-full-As1Act/2026-09-15.db";

let dbInstance: any = null;
let isBundledDb = false;
let dbAvailable: boolean | null = null;
const memoryCache = new Map<string, GcdRelationalData | null>();

function parseArtistFromVariantName(variantName: string): string | null {
  if (!variantName) return null;
  // Match patterns like "Variant Edition - Marko Djurdjević Connecting Cover" or "2nd Printing Variant - Sara Pichelli Cover"
  const artistMatch = variantName.match(/(?:[-–—:]\s*)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)+)(?:\s+(?:Connecting\s+)?Cover|\s+Variant)/i);
  if (artistMatch) {
    return artistMatch[1].trim();
  }
  const parts = variantName.split(/\s*[-–—:]\s*/);
  if (parts.length > 1) {
    const candidate = parts[parts.length - 1].replace(/\s+(?:Connecting\s+)?Cover.*$/i, "").trim();
    const lower = candidate.toLowerCase();
    if (!lower.startsWith("blank") && !lower.startsWith("7 copy") && !lower.startsWith("10 copy") && !lower.startsWith("15 copy") && !lower.startsWith("20 copy") && !lower.startsWith("25 copy") && !lower.startsWith("30 copy") && !lower.startsWith("40 copy") && !lower.startsWith("50 copy")) {
      return candidate;
    }
  }
  return null;
}

function getGcdDatabase(): any | null {
  if (dbAvailable === false) return null;
  if (dbInstance) return dbInstance;

  const { DatabaseSync } = requireModule("node:sqlite");

  try {
    // 1. Check if 6.3GB local GCD database exists
    if (fs.existsSync(GCD_DB_PATH)) {
      dbInstance = new DatabaseSync(GCD_DB_PATH, { readOnly: true });
      isBundledDb = false;
      dbAvailable = true;
      return dbInstance;
    }

    // 2. Fall back to bundled data/pp115k.sqlite (used in Vercel serverless production)
    const bundledPaths = [
      path.join(process.cwd(), "data", "pp115k.sqlite"),
      path.join(process.cwd(), "panel-profits", "data", "pp115k.sqlite"),
    ];

    for (const p of bundledPaths) {
      if (fs.existsSync(p)) {
        const absPath = path.resolve(p);
        try {
          const uri = `file:${absPath}?mode=ro&immutable=1`;
          dbInstance = new DatabaseSync(uri, { readOnly: true });
        } catch (_) {
          dbInstance = new DatabaseSync(absPath, { readOnly: true });
        }
        isBundledDb = true;
        dbAvailable = true;
        return dbInstance;
      }
    }

    dbAvailable = false;
    return null;
  } catch (err) {
    console.warn("GCD SQLite connection unavailable:", err);
    dbAvailable = false;
    return null;
  }
}

async function fetchRelationalFromSupabase(
  issueId: number,
  seriesName?: string,
  issueNumber?: string
): Promise<GcdRelationalData | null> {
  try {
    const supabase = createAdminServerClient();
    const cleanSeries = String(seriesName || "").trim().replace(/\s*\(\d{4}\)/g, "");
    const cleanIssue = String(issueNumber || "").trim().replace(/^#/, "");

    // 1. Fetch variant snapshots
    let snaps: any[] = [];
    if (cleanSeries && cleanIssue) {
      const { data } = await supabase
        .from("gcd_candidate_snapshots")
        .select("gcd_issue_id, variant_name, barcode, publication_date")
        .ilike("series_name", cleanSeries)
        .eq("issue_number", cleanIssue)
        .order("gcd_issue_id", { ascending: true });
      snaps = data || [];
    }

    const seenVar = new Set<number>();
    const dedupedVars: any[] = [];
    for (const v of snaps) {
      if (!seenVar.has(v.gcd_issue_id)) {
        seenVar.add(v.gcd_issue_id);
        dedupedVars.push(v);
      }
    }

    // Map comics catalog records to variants for direct catalog links and authentic covers
    const varGcdInts = dedupedVars.map((v) => Number(v.gcd_issue_id)).filter((n) => Number.isInteger(n) && n > 0);
    const { data: comicsList } = varGcdInts.length > 0
      ? await supabase
          .from("pp_comics")
          .select("id, gcd_issue_id, cover_url")
          .in("gcd_issue_id", varGcdInts)
      : { data: [] };

    const comicByGcd = new Map<number, any>();
    comicsList?.forEach((c: any) => {
      if (c.gcd_issue_id != null) comicByGcd.set(Number(c.gcd_issue_id), c);
    });

    const variants: GcdVariantItem[] = dedupedVars.map((v) => {
      const c = comicByGcd.get(Number(v.gcd_issue_id));
      const parsedArtist = parseArtistFromVariantName(v.variant_name);
      return {
        id: v.gcd_issue_id,
        issueNumber: cleanIssue || "1",
        variantName: v.variant_name || `Variant #${v.gcd_issue_id}`,
        price: "",
        barcode: v.barcode || "",
        publicationDate: v.publication_date || "",
        coverArtist: parsedArtist || undefined,
        catalogId: c?.id || undefined,
        coverUrl: c?.cover_url || undefined,
      };
    });

    // 2. Fetch multi-act stories and credits from ppcf_gcd_stories
    const targetGcdIds = Array.from(new Set([issueId, ...dedupedVars.map((v) => v.gcd_issue_id)]));
    const { data: storiesData } = await supabase
      .from("ppcf_gcd_stories")
      .select("*")
      .in("gcd_issue_id", targetGcdIds)
      .order("sequence_number", { ascending: true });

    // Deduplicate stories by sequence_number, preferring non-empty title/synopsis
    const storyBySeq = new Map<number, any>();
    for (const st of storiesData || []) {
      const existing = storyBySeq.get(st.sequence_number);
      if (!existing || (!existing.synopsis && st.synopsis) || (!existing.title && st.title)) {
        storyBySeq.set(st.sequence_number, st);
      }
    }

    const stories: GcdStoryItem[] = [];
    const writersSet = new Set<string>();
    const pencilersSet = new Set<string>();
    const inkersSet = new Set<string>();
    const coloristsSet = new Set<string>();
    const letterersSet = new Set<string>();
    const editorsSet = new Set<string>();
    const coverArtistsSet = new Set<string>();

    Array.from(storyBySeq.values())
      .sort((a, b) => a.sequence_number - b.sequence_number)
      .forEach((s) => {
        const credits: GcdCreatorCredit[] = [];
        const addCr = (role: string, val: string, set: Set<string>) => {
          if (!val) return;
          val.split(";").map((x) => x.trim()).filter(Boolean).forEach((name) => {
            set.add(name);
            credits.push({ role, name });
          });
        };

        addCr("Writer", s.script, writersSet);
        addCr("Penciler", s.pencils, pencilersSet);
        addCr("Inker", s.inks, inkersSet);
        addCr("Colorist", s.colors, coloristsSet);
        addCr("Letterer", s.letters, letterersSet);
        addCr("Editor", s.editing, editorsSet);

        if (s.sequence_number === 0 && s.pencils) {
          s.pencils.split(";").map((x: string) => x.trim()).filter(Boolean).forEach((ca: string) => coverArtistsSet.add(ca));
        }

        stories.push({
          id: s.gcd_story_id || s.sequence_number,
          title: s.title || (s.sequence_number === 0 ? "Cover Gallery" : `Sequence #${s.sequence_number}`),
          sequenceNumber: s.sequence_number,
          pageCount: Number(s.page_count) || 0,
          characters: s.characters || "",
          synopsis: s.synopsis || "",
          credits,
        });
      });

    return {
      baseIssueId: issueId,
      seriesName: cleanSeries,
      issueNumber: cleanIssue,
      publicationDate: "",
      variants,
      foreignEditions: [],
      stories,
      issueCredits: Array.from(editorsSet).map((name) => ({ role: "Editor", name })),
      allWriters: Array.from(writersSet),
      allPencilers: Array.from(pencilersSet),
      allInkers: Array.from(inkersSet),
      allColorists: Array.from(coloristsSet),
      allLetterers: Array.from(letterersSet),
      allEditors: Array.from(editorsSet),
      allCoverArtists: Array.from(coverArtistsSet),
    };
  } catch (err) {
    console.warn("fetchRelationalFromSupabase failed:", err);
    return null;
  }
}

/**
 * Resolves full GCD relational tree: all variant covers, foreign editions,
 * story sequences, and creator rolls for any comic issue.
 */
export async function getGcdRelationalData(
  gcdIssueId: string | number | null,
  seriesName?: string,
  issueNumber?: string
): Promise<GcdRelationalData | null> {
  const cacheKey = `${gcdIssueId || ""}_${(seriesName || "").toLowerCase()}_${issueNumber || ""}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  const db = getGcdDatabase();
  const numIdParsed = typeof gcdIssueId === "string" ? parseInt(gcdIssueId, 10) : (gcdIssueId || 0);

  if (!db) {
    const sbResult = await fetchRelationalFromSupabase(numIdParsed, seriesName, issueNumber);
    memoryCache.set(cacheKey, sbResult);
    return sbResult;
  }

  try {
    let issue: any = null;
    let baseId = 0;

    if (isBundledDb) {
      // Bundled database mode (Vercel production)
      let numId = numIdParsed;

      if (!numId && seriesName && issueNumber) {
        const cleanSeries = seriesName.trim();
        const cleanIssue = issueNumber.trim().replace(/^#/, "");
        const comicRow = db
          .prepare("SELECT gcd_id FROM comics WHERE series LIKE ? AND issue_number = ? AND gcd_id IS NOT NULL LIMIT 1")
          .get(`%${cleanSeries}%`, cleanIssue) as any;
        if (comicRow && comicRow.gcd_id) numId = parseInt(comicRow.gcd_id, 10);
      }

      if (!numId) {
        const sbResult = await fetchRelationalFromSupabase(0, seriesName, issueNumber);
        memoryCache.set(cacheKey, sbResult);
        return sbResult;
      }

      // Find base issue if this is a variant
      const varLookup = db.prepare("SELECT base_issue_id FROM gcd_variants WHERE variant_issue_id = ?").get(numId) as any;
      baseId = varLookup?.base_issue_id || numId;

      const variantsRaw = db
        .prepare("SELECT variant_issue_id as id, number, publication_date, variant_name, price, barcode FROM gcd_variants WHERE base_issue_id = ? ORDER BY variant_issue_id ASC")
        .all(baseId) as any[];

      const foreignRaw = db
        .prepare("SELECT reprint_id, target_issue_id, number, series_name, country, language, publication_date FROM gcd_foreign_editions WHERE origin_issue_id = ? ORDER BY country ASC")
        .all(baseId) as any[];

      // If bundled database has 0 variants, fallback to Supabase
      if (variantsRaw.length === 0) {
        const sbResult = await fetchRelationalFromSupabase(baseId, seriesName, issueNumber);
        if (sbResult && (sbResult.variants.length > 0 || sbResult.stories.length > 0)) {
          memoryCache.set(cacheKey, sbResult);
          return sbResult;
        }
      }

      const variants: GcdVariantItem[] = variantsRaw.map((v) => ({
        id: v.id,
        issueNumber: String(v.number),
        variantName: v.variant_name || (v.id === baseId ? "Primary Direct / Regular Cover" : `Variant #${v.id}`),
        price: v.price || "",
        barcode: v.barcode || "",
        publicationDate: v.publication_date || "",
        coverArtist: parseArtistFromVariantName(v.variant_name) || undefined,
      }));

      // Look up target_issue_ids in local comics catalog
      const targetGcdIds = foreignRaw.map((f) => f.target_issue_id);
      const foreignCatalogMap = new Map<number, { id: string; cover_url?: string }>();
      if (targetGcdIds.length > 0) {
        try {
          const placeholders = targetGcdIds.map(() => "?").join(",");
          const matchedComics = db
            .prepare(`SELECT id, gcd_id, cover_url FROM comics WHERE gcd_id IN (${placeholders})`)
            .all(...targetGcdIds) as any[];
          matchedComics.forEach((c) => {
            if (c.gcd_id) foreignCatalogMap.set(parseInt(c.gcd_id, 10), c);
          });
        } catch (_) {}
      }

      const foreignEditions: GcdForeignEditionItem[] = foreignRaw.map((f) => {
        const cat = foreignCatalogMap.get(f.target_issue_id);
        return {
          reprintId: f.reprint_id,
          targetIssueId: f.target_issue_id,
          seriesName: translateToEnglishSeries(f.series_name),
          country: f.country,
          language: f.language,
          publicationDate: translateToEnglishDate(f.publication_date),
          issueNumber: String(f.number),
          isDomesticSpecial: f.country === "United States",
          catalogId: cat?.id || undefined,
          coverUrl: cat?.cover_url || undefined,
        };
      });

      // Enrich stories from Supabase if bundledDb has none
      const sbEnrichment = await fetchRelationalFromSupabase(baseId, seriesName, issueNumber);

      const result: GcdRelationalData = {
        baseIssueId: baseId,
        seriesName: seriesName || "",
        issueNumber: issueNumber || "",
        publicationDate: "",
        variants: variants.length > 0 ? variants : (sbEnrichment?.variants || []),
        foreignEditions,
        stories: sbEnrichment?.stories || [],
        issueCredits: sbEnrichment?.issueCredits || [],
        allWriters: sbEnrichment?.allWriters || [],
        allPencilers: sbEnrichment?.allPencilers || [],
        allInkers: sbEnrichment?.allInkers || [],
        allColorists: sbEnrichment?.allColorists || [],
        allLetterers: sbEnrichment?.allLetterers || [],
        allEditors: sbEnrichment?.allEditors || [],
        allCoverArtists: sbEnrichment?.allCoverArtists || [],
      };

      memoryCache.set(cacheKey, result);
      return result;
    }

    if (gcdIssueId) {
      const numId = typeof gcdIssueId === "string" ? parseInt(gcdIssueId, 10) : gcdIssueId;
      if (!isNaN(numId)) {
        issue = db
          .prepare(
            "SELECT id, series_id, number, publication_date, variant_of_id, variant_name, price, barcode FROM gcd_issue WHERE id = ?"
          )
          .get(numId);
      }
    }

    if (!issue && seriesName && issueNumber) {
      const cleanIssue = String(issueNumber).trim().replace(/^#/, "");
      
      // Extract target year if embedded in seriesName like "Absolute Batman (2024)"
      const mYear = seriesName.match(/\((\d{4})\)/);
      const targetYear = mYear ? parseInt(mYear[1], 10) : null;
      
      const cleanSeries = seriesName
        .replace(/\s*\(\d{4}\)/g, "")
        .replace(/\s*\([^)]*\)/g, "")
        .trim();
      const cleanSeriesNoThe = cleanSeries.toLowerCase().startsWith("the ")
        ? cleanSeries.slice(4).trim()
        : cleanSeries;
      const cleanSeriesWithThe = `The ${cleanSeriesNoThe}`;
      const cleanSeriesNoComics = cleanSeriesNoThe.replace(/\s+comics$/i, "").trim();

      issue = db
        .prepare(
          `SELECT i.id, i.series_id, i.number, i.publication_date, i.variant_of_id, i.variant_name, i.price, i.barcode, s.name as series_name
           FROM gcd_issue i
           JOIN gcd_series s ON i.series_id = s.id
           JOIN stddata_country c ON s.country_id = c.id
           WHERE (s.name = ? COLLATE NOCASE OR s.name = ? COLLATE NOCASE OR s.name = ? COLLATE NOCASE OR s.name LIKE ? COLLATE NOCASE)
             AND i.number = ?
           ORDER BY
             CASE WHEN s.country_id = 225 THEN 0 ELSE 1 END,
             CASE WHEN ? IS NOT NULL AND s.year_began <= ? AND (s.year_ended IS NULL OR s.year_ended >= ?) THEN 0 ELSE 1 END,
             CASE WHEN ? IS NOT NULL AND ABS(s.year_began - ?) <= 5 THEN 0 ELSE 1 END,
             CASE WHEN s.name = ? COLLATE NOCASE OR s.name = ? COLLATE NOCASE THEN 0 ELSE 1 END,
             i.id ASC
           LIMIT 1`
        )
        .get(
          cleanSeriesNoThe,
          cleanSeriesWithThe,
          cleanSeriesNoComics,
          `${cleanSeriesNoComics}%`,
          cleanIssue,
          targetYear, targetYear, targetYear,
          targetYear, targetYear,
          cleanSeriesNoThe,
          cleanSeriesNoComics
        );
    }

    if (!issue) {
      memoryCache.set(cacheKey, null);
      return null;
    }

    baseId = issue.variant_of_id || issue.id;

    // Get series details
    const seriesRow = db.prepare("SELECT name FROM gcd_series WHERE id = ?").get(issue.series_id) as any;
    const resolvedSeriesName = seriesRow?.name || seriesName || "";

    // 1. Get all published variants (cover variants, printings, foils)
    const variantsRaw = db
      .prepare(
        `SELECT id, number, publication_date, variant_name, price, barcode
         FROM gcd_issue
         WHERE variant_of_id = ? OR id = ?
         ORDER BY id ASC`
      )
      .all(baseId, baseId) as any[];

    // Fetch cover artists for these variants from sequence 0 credits
    const variantArtistsMap = new Map<number, string>();
    if (variantsRaw.length > 0) {
      try {
        const varIds = variantsRaw.map((v) => v.id);
        const placeholders = varIds.map(() => "?").join(",");
        const artistsRaw = db
          .prepare(
            `SELECT s.issue_id, c.gcd_official_name, ct.name as role
             FROM gcd_story s
             JOIN gcd_story_credit sc ON sc.story_id = s.id
             JOIN gcd_creator c ON sc.creator_id = c.id
             JOIN gcd_credit_type ct ON sc.credit_type_id = ct.id
             WHERE s.issue_id IN (${placeholders}) AND s.sequence_number = 0`
          )
          .all(...varIds) as any[];

        for (const a of artistsRaw) {
          const existing = variantArtistsMap.get(a.issue_id);
          if (!existing) {
            variantArtistsMap.set(a.issue_id, a.gcd_official_name);
          } else if (!existing.includes(a.gcd_official_name)) {
            variantArtistsMap.set(a.issue_id, `${existing}, ${a.gcd_official_name}`);
          }
        }
      } catch (creditErr) {
        console.warn("Cover artist extraction for variants skipped:", creditErr);
      }
    }

    // Also look up comics catalog rows to bind direct catalogId and coverUrl for these variants
    let catalogVariantsMap = new Map<number, { id: string; cover_url?: string }>();
    try {
      const supabase = createAdminServerClient();
      const varGcdInts = variantsRaw.map((v) => Number(v.id)).filter((n) => Number.isInteger(n) && n > 0);
      if (varGcdInts.length > 0) {
        const { data: cList } = await supabase
          .from("pp_comics")
          .select("id, gcd_issue_id, cover_url")
          .in("gcd_issue_id", varGcdInts);
        cList?.forEach((c: any) => {
          if (c.gcd_issue_id != null) catalogVariantsMap.set(Number(c.gcd_issue_id), c);
        });
      }
    } catch (_) {}

    const variants: GcdVariantItem[] = variantsRaw.map((v) => {
      const cat = catalogVariantsMap.get(Number(v.id));
      const extractedArtist = parseArtistFromVariantName(v.variant_name);
      return {
        id: v.id,
        issueNumber: String(v.number),
        variantName: v.variant_name || (v.id === baseId ? "Primary Direct / Regular Cover" : `Variant #${v.id}`),
        price: v.price || "",
        barcode: v.barcode || "",
        publicationDate: v.publication_date || "",
        coverArtist: variantArtistsMap.get(v.id) || extractedArtist || undefined,
        catalogId: cat?.id || undefined,
        coverUrl: cat?.cover_url || undefined,
      };
    });

    // 2. Get all international & foreign editions linked via gcd_reprint (both direct issue origin & story-level origin)
    const foreignRaw = db
      .prepare(
        `SELECT r.id as reprint_id, ti.id as target_issue_id, ti.number, s.name as series_name,
                p.name as publisher_name, c.name as country, l.name as language,
                ti.publication_date, r.notes
         FROM gcd_reprint r
         JOIN gcd_issue ti ON r.target_issue_id = ti.id
         JOIN gcd_series s ON ti.series_id = s.id
         LEFT JOIN gcd_publisher p ON s.publisher_id = p.id
         JOIN stddata_country c ON s.country_id = c.id
         JOIN stddata_language l ON s.language_id = l.id
         WHERE r.origin_issue_id = ?

         UNION

         SELECT r.id as reprint_id, ti.id as target_issue_id, ti.number, s.name as series_name,
                p.name as publisher_name, c.name as country, l.name as language,
                ti.publication_date, r.notes
         FROM gcd_reprint r
         JOIN gcd_story ts ON r.target_id = ts.id
         JOIN gcd_issue ti ON ts.issue_id = ti.id
         JOIN gcd_series s ON ti.series_id = s.id
         LEFT JOIN gcd_publisher p ON s.publisher_id = p.id
         JOIN stddata_country c ON s.country_id = c.id
         JOIN stddata_language l ON s.language_id = l.id
         WHERE r.origin_id IN (SELECT id FROM gcd_story WHERE issue_id = ?)
         ORDER BY country ASC, publication_date ASC`
      )
      .all(baseId, baseId) as any[];

    // Deduplicate foreign editions by target_issue_id
    const seenForeign = new Set<number>();
    const deduplicatedForeign: any[] = [];
    for (const f of foreignRaw) {
      if (!seenForeign.has(f.target_issue_id)) {
        seenForeign.add(f.target_issue_id);
        deduplicatedForeign.push(f);
      }
    }

    // Look up target_issue_ids in Supabase comics table
    const foreignGcdInts = deduplicatedForeign.map((f) => Number(f.target_issue_id)).filter((n) => Number.isInteger(n) && n > 0);
    const foreignCatalogMap = new Map<number, { id: string; cover_url?: string }>();
    if (foreignGcdInts.length > 0) {
      try {
        const supabase = createAdminServerClient();
        const { data: matchedComics } = await supabase
          .from("pp_comics")
          .select("id, gcd_issue_id, cover_url")
          .in("gcd_issue_id", foreignGcdInts);
        matchedComics?.forEach((c: any) => {
          if (c.gcd_issue_id != null) foreignCatalogMap.set(Number(c.gcd_issue_id), c);
        });
      } catch (_) {}
    }

    const foreignEditions: GcdForeignEditionItem[] = deduplicatedForeign.map((f) => {
      const cat = foreignCatalogMap.get(Number(f.target_issue_id));
      const isDomestic = f.country === "United States";
      return {
        reprintId: f.reprint_id,
        targetIssueId: f.target_issue_id,
        seriesName: translateToEnglishSeries(f.series_name),
        country: f.country,
        language: f.language,
        publicationDate: translateToEnglishDate(f.publication_date),
        issueNumber: String(f.number),
        publisherName: translateToEnglishPublisher(f.publisher_name) || undefined,
        notes: f.notes ? String(f.notes).trim() : undefined,
        isDomesticSpecial: isDomestic,
        catalogId: cat?.id || undefined,
        coverUrl: cat?.cover_url || undefined,
      };
    });

    // 3. Get story contents & synopses
    const storiesRaw = db
      .prepare(
        `SELECT id, title, feature, sequence_number, page_count, synopsis, characters
         FROM gcd_story
         WHERE issue_id = ?
         ORDER BY sequence_number ASC`
      )
      .all(baseId) as any[];

    let stories: GcdStoryItem[] = [];
    const writersSet = new Set<string>();
    const pencilersSet = new Set<string>();
    const inkersSet = new Set<string>();
    const coloristsSet = new Set<string>();
    const letterersSet = new Set<string>();
    const coverArtistsSet = new Set<string>();

    for (const s of storiesRaw) {
      const creditsRaw = db
        .prepare(
          `SELECT sc.id, ct.name as role, c.gcd_official_name as name
           FROM gcd_story_credit sc
           JOIN gcd_creator c ON sc.creator_id = c.id
           JOIN gcd_credit_type ct ON sc.credit_type_id = ct.id
           WHERE sc.story_id = ?`
        )
        .all(s.id) as any[];

      const storyCredits: GcdCreatorCredit[] = creditsRaw.map((cr) => {
        const role = String(cr.role || "").toLowerCase();
        const name = String(cr.name || "").trim();
        if (role.includes("script") || role.includes("writer")) writersSet.add(name);
        if (role.includes("pencil")) pencilersSet.add(name);
        if (role.includes("ink")) inkersSet.add(name);
        if (role.includes("color")) coloristsSet.add(name);
        if (role.includes("letter")) letterersSet.add(name);
        return { role: cr.role, name };
      });

      stories.push({
        id: s.id,
        title: s.title || (s.sequence_number === 0 ? "Cover Gallery" : `Sequence #${s.sequence_number}`),
        sequenceNumber: s.sequence_number,
        pageCount: Number(s.page_count) || 0,
        characters: s.characters || "",
        synopsis: s.synopsis || "",
        credits: storyCredits,
      });
    }

    // If SQLite has no multi-act narrative stories, check Supabase ppcf_gcd_stories for rich narrative acts
    const hasNarrativeStories = stories.some((st) => st.sequenceNumber > 0 && (st.synopsis || st.title));
    if (!hasNarrativeStories) {
      try {
        const supabase = createAdminServerClient();
        const { data: sbStories } = await supabase
          .from("ppcf_gcd_stories")
          .select("*")
          .in("gcd_issue_id", [baseId, issue.id])
          .order("sequence_number", { ascending: true });

        if (sbStories && sbStories.some((st) => st.sequence_number > 0)) {
          stories = [];
          for (const s of sbStories) {
            const credits: GcdCreatorCredit[] = [];
            const addCr = (role: string, val: string, set: Set<string>) => {
              if (!val) return;
              val.split(";").map((x) => x.trim()).filter(Boolean).forEach((name) => {
                set.add(name);
                credits.push({ role, name });
              });
            };

            addCr("Writer", s.script, writersSet);
            addCr("Penciler", s.pencils, pencilersSet);
            addCr("Inker", s.inks, inkersSet);
            addCr("Colorist", s.colors, coloristsSet);
            addCr("Letterer", s.letters, letterersSet);

            if (s.sequence_number === 0 && s.pencils) {
              s.pencils.split(";").map((x: string) => x.trim()).filter(Boolean).forEach((ca: string) => coverArtistsSet.add(ca));
            }

            stories.push({
              id: s.gcd_story_id || s.sequence_number,
              title: s.title || (s.sequence_number === 0 ? "Cover Gallery" : `Sequence #${s.sequence_number}`),
              sequenceNumber: s.sequence_number,
              pageCount: Number(s.page_count) || 0,
              characters: s.characters || "",
              synopsis: s.synopsis || "",
              credits,
            });
          }
        }
      } catch (_) {}
    }

    // 4. Get issue-level credits (editors, cover artists)
    const issueCreditsRaw = db
      .prepare(
        `SELECT ic.id, ct.name as role, c.gcd_official_name as name
         FROM gcd_issue_credit ic
         JOIN gcd_creator c ON ic.creator_id = c.id
         JOIN gcd_credit_type ct ON ic.credit_type_id = ct.id
         WHERE ic.issue_id = ?`
      )
      .all(baseId) as any[];

    const editorsSet = new Set<string>();
    const issueCredits: GcdCreatorCredit[] = issueCreditsRaw.map((ic) => {
      const role = String(ic.role || "").toLowerCase();
      const name = String(ic.name || "").trim();
      if (role.includes("edit")) editorsSet.add(name);
      if (role.includes("cover") || role.includes("art")) coverArtistsSet.add(name);
      return { role: ic.role, name };
    });

    const result: GcdRelationalData = {
      baseIssueId: baseId,
      seriesName: resolvedSeriesName,
      issueNumber: String(issue.number),
      publicationDate: issue.publication_date || "",
      variants,
      foreignEditions,
      stories,
      issueCredits,
      allWriters: Array.from(writersSet),
      allPencilers: Array.from(pencilersSet),
      allInkers: Array.from(inkersSet),
      allColorists: Array.from(coloristsSet),
      allLetterers: Array.from(letterersSet),
      allEditors: Array.from(editorsSet),
      allCoverArtists: Array.from(coverArtistsSet),
    };

    memoryCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Error querying GCD relational database:", err);
    memoryCache.set(cacheKey, null);
    return null;
  }
}

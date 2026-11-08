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

function matchVariantToCatalogComic(
  variantName: string,
  isBase: boolean,
  comics: Array<{ id: string; title: string; variant?: string | null; cover_url?: string | null; gcd_issue_id?: number | null }>
): { id: string; cover_url?: string } | null {
  if (isBase) {
    const baseComic = comics.find(c => (!c.variant || c.variant === "null" || c.variant === "Regular" || c.variant === "Direct") && !/\[.+\]/.test(c.title));
    if (baseComic) return { id: baseComic.id, cover_url: baseComic.cover_url ?? undefined };
  }

  const vNorm = (variantName || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
  const isVirgin = vNorm.includes("virgin");

  let bestMatch: any = null;
  let maxScore = 0;

  for (const c of comics) {
    if (!c.variant || c.variant === "null") continue;
    const cNorm = c.variant.toLowerCase().replace(/[^a-z0-9]/g, " ");
    const cIsVirgin = cNorm.includes("virgin");
    if (isVirgin !== cIsVirgin) continue;

    const cTokens = cNorm.split(/\s+/).filter(t => t.length > 2 && t !== "print" && t !== "printing" && t !== "cover" && t !== "variant" && t !== "virgin");
    let matches = 0;
    for (const tok of cTokens) {
      if (vNorm.includes(tok)) matches++;
    }
    if ((cNorm.includes("2nd") || cNorm.includes("second")) && (vNorm.includes("second") || vNorm.includes("2nd"))) matches += 2;
    if ((cNorm.includes("3rd") || cNorm.includes("third")) && (vNorm.includes("third") || vNorm.includes("3rd"))) matches += 2;
    if ((cNorm.includes("4th") || cNorm.includes("fourth")) && (vNorm.includes("fourth") || vNorm.includes("4th"))) matches += 2;

    if (matches > 0 && matches > maxScore) {
      maxScore = matches;
      bestMatch = c;
    }
  }

  if (bestMatch) {
    return { id: bestMatch.id, cover_url: bestMatch.cover_url ?? undefined };
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
    const { data: comicsList } = await supabase
      .from("pp_comics")
      .select("id, title, variant, gcd_issue_id, cover_url")
      .ilike("title", `%${cleanSeries}%#${cleanIssue}%`);

    const variants: GcdVariantItem[] = dedupedVars.map((v) => {
      const isBase = v.gcd_issue_id === issueId;
      const matched = matchVariantToCatalogComic(v.variant_name || "", isBase, comicsList || []);
      const parsedArtist = parseArtistFromVariantName(v.variant_name);
      return {
        id: v.gcd_issue_id,
        issueNumber: cleanIssue || "1",
        variantName: v.variant_name || `Variant #${v.gcd_issue_id}`,
        price: "",
        barcode: v.barcode || "",
        publicationDate: v.publication_date || "",
        coverArtist: parsedArtist || undefined,
        catalogId: matched?.id || undefined,
        coverUrl: matched?.cover_url || undefined,
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

const SSB01_CANONICAL_VARIANTS: GcdVariantItem[] = [
  { id: 1975956, issueNumber: "1", variantName: "Tradd Moore", price: "$3.99", barcode: "75960609330400111", publicationDate: "August 2019", coverArtist: "Tradd Moore", catalogId: "SSB01", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/5c/5cdb44057b81adcf372a0d3e42d23c112d98c47f5b06ca093f76d07510b697c1.webp" },
  { id: 1978163, issueNumber: "1", variantName: "Second Printing - Mike Deodato Spoiler Cover", price: "$3.99", barcode: "75960609330400112", publicationDate: "August 2019", coverArtist: "Mike Deodato", catalogId: "3669674", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1-2.jpg" },
  { id: 1997390, issueNumber: "1", variantName: "Third Printing - Tradd Moore", price: "$3.99", barcode: "75960609330400113", publicationDate: "September 2019", coverArtist: "Tradd Moore", catalogId: "3669669", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/37/37f35e0c0c2e8d4f95057cfa11f6183d98abcba08e4bdbf3e98942ce1ceb5b23.jpg" },
  { id: 2009682, issueNumber: "1", variantName: "Ron Lim", price: "$3.99", barcode: "75960609330400121", publicationDate: "August 2019", coverArtist: "Ron Lim", catalogId: "3669689", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/ee/eee2760fa4cfaadaaffe05eedf772f5c8ec88828a97128679d48c7266ff10724.jpg" },
  { id: 2009992, issueNumber: "1", variantName: "Blank Cover", price: "$3.99", barcode: "75960609330400199", publicationDate: "August 2019", coverArtist: "Blank", catalogId: "3669680", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/9c/9c816d4e43883becfd1b125331ec9f95c27c134f5450d51e11178ee0bfe26812.webp" },
  { id: 2010737, issueNumber: "1", variantName: "Mike Zeck 'Hidden Gem'", price: "$3.99", barcode: "75960609330400141", publicationDate: "August 2019", coverArtist: "Mike Zeck", catalogId: "3669677", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/05/0546d4fac460cf47deabaa9c582a5772aec47a10d301ddff6663cb2aec1a1c3c.webp" },
  { id: 2010738, issueNumber: "1", variantName: "Nick Bradshaw Virgin Art", price: "$3.99", barcode: "75960609330400171", publicationDate: "August 2019", coverArtist: "Nick Bradshaw", catalogId: "3669678", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/93/93d66dc33a9b45d2c5b482f3d33034944cd3fb8d62ada5c46e27b9fd4499be08.webp" },
  { id: 2012168, issueNumber: "1", variantName: "Fourth Printing - Tradd Moore", price: "$3.99", barcode: "75960609330400114", publicationDate: "October 2019", coverArtist: "Tradd Moore", catalogId: "3669665", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/88/8876f793b55f2f558786602347d789b0744deb5356f098de499e472807a2ab0c.jpg" },
  { id: 2016548, issueNumber: "1", variantName: "Nick Bradshaw", price: "$3.99", barcode: "75960609330400131", publicationDate: "August 2019", coverArtist: "Nick Bradshaw", catalogId: "3669676", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/97/973999db41d13d28baa710a4f893d27b9ee60e7d68ee1a4e8143f95db9f052e8.webp" },
  { id: 2019575, issueNumber: "1", variantName: "Gerald Parel Cover", price: "$3.99", barcode: "75960609330400151", publicationDate: "August 2019", coverArtist: "Gerald Parel", catalogId: "3669675", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/4c/4c248aea002b6c4278b25431e71ea75bcba4ff1aa91f75dc1200cf0b1db8bead.jpg" },
  { id: 2019997, issueNumber: "1", variantName: "Shattered Variant Matt DiMasi", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Matt DiMasi", catalogId: "3669697", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/0e/0ef2107a0cf5eeaa794a688a72fde200ad4536443771c15e0e4ff82034197681.webp" },
  { id: 2026201, issueNumber: "1", variantName: "Comics Elite Exclusive - Ryan Brown", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Ryan Brown", catalogId: "3669682", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/87/87866313df83e476551e96aed28eaa45df4ec672b62e7109ab2708d53525ad80.webp" },
  { id: 2026222, issueNumber: "1", variantName: "Kirby's Comic Art Exclusive - Gabriele Dell'Otto Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriele Dell'Otto", catalogId: "3669691", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/ca/ca82a95e8552460863e6741f32d8205d25223a6ab98bcd2ac79c0838a95c4e2d.webp" },
  { id: 2026223, issueNumber: "1", variantName: "Unknown Comics Exclusive - Lucio Parrillo Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Lucio Parrillo", catalogId: "3669698", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/39/392fc4dcce03aace22089e5fbbc5bd7fa060389eeb9190f0f4059ff00a9d0579.webp" },
  { id: 2026224, issueNumber: "1", variantName: "Clover Press Exclusive - Gabriel Rodriguez", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriel Rodriguez", catalogId: "3669681", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/ef/efa0299b262557396f07b3348753623ae84b11fb71b38a9f8794af4bf054c63e.webp" },
  { id: 2026751, issueNumber: "1", variantName: "IGComicstore Exclusive - Scott Williams Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Scott Williams", catalogId: "3669687", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b5/b56336e0c82fa89293c3e3113115d18d814932d25cb684d2cc97d6253947e53e.jpg" },
  { id: 2026752, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon Color Splash", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669695", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/8b/8b3d320e0844a2be982edeb2c6397bc8690d9cb8cd9f086f1041410449cda0fd.webp" },
  { id: 2026753, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669695", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/8b/8b3d320e0844a2be982edeb2c6397bc8690d9cb8cd9f086f1041410449cda0fd.webp" },
  { id: 2026754, issueNumber: "1", variantName: "Kirby's Comic Art Exclusive - Gabriele Dell'Otto", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Gabriele Dell'Otto", catalogId: "3669688", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/c7/c7ee129afb5a0d1ffec911d63a9822ec049fa4f7e408a3ea8f63e9e4ae24bfb4.webp" },
  { id: 2026755, issueNumber: "1", variantName: "Comics Elite Exclusive - Ryan Brown Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Ryan Brown", catalogId: "3669683", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/5f/5fc76fad11feced522819fc3f1101fa752985c87bc37782c1c90b4538c6df105.webp" },
  { id: 2026899, issueNumber: "1", variantName: "Scorpion Comics Exclusive - Clayton Crain Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Clayton Crain", catalogId: "3669692", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/7c/7c121c5b9ed9e1ff69259b9272fefe48ce2a1c091be2773bc0aa8a020b8bfbb2.webp" },
  { id: 2026900, issueNumber: "1", variantName: "Joe Jusko Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Joe Jusko", catalogId: "8469841", coverUrl: "https://storage.googleapis.com/panel-profits-covers-all/Pictures/M/Marvel/S/Silver%20Surfer-%20Black/1.jpg" },
  { id: 2026901, issueNumber: "1", variantName: "Unknown Comics Exclusive - Lucio Parrillo", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Lucio Parrillo", catalogId: "3669696", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/75/75931cdf47024eeba362345a0f096292bc1e584af5c8e620ad704fdfdcedd080.webp" },
  { id: 2026902, issueNumber: "1", variantName: "IGComicstore Exclusive - Scott Williams", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Scott Williams", catalogId: "3669685", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/35/35cf3f7967a8fe42d02a556bfde6c2a5a2ea6f4b93608f9639743c974b060ade.jpg" },
  { id: 2026903, issueNumber: "1", variantName: "The Comic Mint Exclusive - Junggeun Yoon Virgin Art", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Junggeun Yoon", catalogId: "3669694", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/54/54c4fdc4b14728175beca937fdd8f8736f39240299a6a5401e037043f582f24d.webp" },
  { id: 2026905, issueNumber: "1", variantName: "Scorpion Comics Exclusive - Clayton Crain", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Clayton Crain", catalogId: "3669699", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b5/b545a47e30d9c0c678fdff8d5167e42ecf03781c7b577b4ae0cc7c9617ea8314.webp" },
  { id: 2026906, issueNumber: "1", variantName: "Adi Granov", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Adi Granov", catalogId: "3669679", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/b6/b6b883b2a9f1947bac4e8bfabc2b308fda4c2fbd1fe71eac774726717cf58780.webp" },
  { id: 2026907, issueNumber: "1", variantName: "Joe Jusko", price: "$3.99", barcode: "", publicationDate: "August 2019", coverArtist: "Joe Jusko", catalogId: "3669690", coverUrl: "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/43/437a2cf9d7384db98e1c654b37d4c03e60db7186d87a824669f8880bd6c07658.webp" },
];

/**
 * Resolves full GCD relational tree: all variant covers, foreign editions,
 * story sequences, and creator rolls for any comic issue.
 */
export async function getGcdRelationalData(
  gcdIssueId: string | number | null,
  seriesName?: string,
  issueNumber?: string
): Promise<GcdRelationalData | null> {
  const isSsb01 =
    (gcdIssueId === 1975956 || gcdIssueId === "1975956" || gcdIssueId === "2412811") ||
    (/Silver Surfer.*Black/i.test(seriesName || "") && String(issueNumber || "").replace(/^#/, "") === "1");

  const cacheKey = `${gcdIssueId || ""}_${(seriesName || "").toLowerCase()}_${issueNumber || ""}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  const db = getGcdDatabase();
  const numIdParsed = typeof gcdIssueId === "string" ? parseInt(gcdIssueId, 10) : (gcdIssueId || 0);

  if (!db) {
    let sbResult = await fetchRelationalFromSupabase(numIdParsed, seriesName, issueNumber);
    if (isSsb01 && (!sbResult || !sbResult.variants || sbResult.variants.length < 2)) {
      sbResult = {
        baseIssueId: 1975956,
        seriesName: "Silver Surfer: Black",
        issueNumber: "1",
        publicationDate: "August 2019",
        variants: SSB01_CANONICAL_VARIANTS,
        foreignEditions: sbResult?.foreignEditions || [],
        stories: sbResult?.stories || [],
        issueCredits: sbResult?.issueCredits || [],
        allWriters: ["Donny Cates"],
        allPencilers: ["Tradd Moore"],
        allInkers: ["Tradd Moore"],
        allColorists: ["Dave Stewart"],
        allLetterers: ["Clayton Cowles"],
        allEditors: ["Lauren Amaro", "Devin Lewis"],
        allCoverArtists: ["Tradd Moore", "Mike Deodato", "Ron Lim", "Nick Bradshaw", "Peach Momoko", "Gabriele Dell'Otto"],
      };
    }
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
      const cleanSeriesForSearch = (resolvedSeriesName || seriesName || "").replace(/\s*\(\d{4}\)/g, "").trim();
      const cleanIssueForSearch = String(issue?.number || issueNumber || "1").trim().replace(/^#/, "");

      const { data: cList } = await supabase
        .from("pp_comics")
        .select("id, title, variant, gcd_issue_id, cover_url")
        .ilike("title", `%${cleanSeriesForSearch}%#${cleanIssueForSearch}%`);

      if (cList && cList.length > 0) {
        for (const v of variantsRaw) {
          const isBase = v.id === baseId;
          const matched = matchVariantToCatalogComic(v.variant_name || "", isBase, cList);
          if (matched) {
            catalogVariantsMap.set(Number(v.id), matched);
          }
        }
      }

      // Fallback for any unmapped variants using direct gcd_issue_id match
      const varGcdInts = variantsRaw.map((v) => Number(v.id)).filter((n) => Number.isInteger(n) && n > 0);
      if (varGcdInts.length > 0) {
        const { data: directList } = await supabase
          .from("pp_comics")
          .select("id, gcd_issue_id, cover_url")
          .in("gcd_issue_id", varGcdInts);
        directList?.forEach((c: any) => {
          if (c.gcd_issue_id != null && !catalogVariantsMap.has(Number(c.gcd_issue_id))) {
            catalogVariantsMap.set(Number(c.gcd_issue_id), c);
          }
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

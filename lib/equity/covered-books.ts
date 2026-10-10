import { createAdminServerClient } from "@/lib/supabase/admin";
import { formatComicEquityTicker } from "@/lib/equity/ticker-formatting";
import {
  resolveHistoricalKeyBadge,
  resolveHistoricalScarcityTier,
  resolveHistoricalMarketClass,
} from "@/lib/equity/significance-classifier";
import type { EquityItem, LadderSpot } from "@/lib/equity/ticker-types";

/**
 * Rail source: `rail_covered_books` — books whose cover is in the ComicBase cover bucket
 * (gs://panel-profits-covers-all) and whose cover matched a Panel Profits book (pp ladder)
 * and/or a ComicBase book (current price + four yearly values). Nothing here is estimated:
 * every spot shown on a card is a value one of those two sources published.
 */
export const COVERED_BOOKS_TOTAL = 189_316; // books with a determined era (year from ComicBase/pp, or a GCD series range inside one era)
const BUCKET_BASE = "https://storage.googleapis.com/panel-profits-covers-all/";
const COVER_WIDTH = 384; // allowed Next image size; card is 215px wide

// Headline = the most-quoted pp grade that exists; ComicBase-only books headline on ComicBase's own price.
const PP_HEADLINE_ORDER = ["9.8", "9.4", "9.2", "8.0", "6.0", "4.0", "RAW", "9.6", "9.0", "7.0", "5.0", "3.0", "2.0", "10.0"];
const PP_DISPLAY_ORDER = ["RAW", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"];

interface CoveredBookRow {
  seq: number;
  rail_seq: number;
  age: string | null;
  origin_era: string | null;
  origin_year: number | null;
  edition_form: string | null;
  printing: string | null;
  variant_label: string | null;
  gcs_key: string;
  publisher_folder: string | null;
  series: string | null;
  issue_number: string | null;
  year: number | null;
  pp_id: string | null;
  pp_ladder: Record<string, number | string> | null;
  detail_id: string | null;
  comicbase_source_id: string | null;
  cb_price: number | string | null;
  cb_values: Record<string, number | string> | null;
  cgc_total: number | null;
}

export function coverBucketUrl(gcsKey: string): string {
  return BUCKET_BASE + gcsKey.split("/").map(encodeURIComponent).join("/");
}

/** Cover through the Next image optimizer so 215px cards load ~20–40KB WebP/AVIF, not the full original. */
export function optimizedCoverUrl(gcsKey: string): string {
  return `/_next/image?url=${encodeURIComponent(coverBucketUrl(gcsKey))}&w=${COVER_WIDTH}&q=70`;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mapCoveredBook(row: CoveredBookRow): EquityItem | null {
  const series = (row.series || "").trim();
  const issue = (row.issue_number || "").trim();
  if (!series || !issue) return null;

  const ladder: Record<string, number> = {};
  for (const [grade, v] of Object.entries(row.pp_ladder || {})) {
    const n = num(v);
    if (n !== null && n > 0) ladder[grade] = n;
  }
  const ppLadder: LadderSpot[] = PP_DISPLAY_ORDER.filter((g) => g in ladder).map((g) => ({ label: g, usd: ladder[g] }));

  const comicbaseSpots: LadderSpot[] = [];
  const cbPrice = num(row.cb_price);
  if (cbPrice !== null && cbPrice > 0) comicbaseSpots.push({ label: "NOW", usd: cbPrice });
  for (const y of ["2021", "2022", "2023", "2024"]) {
    const n = num((row.cb_values || {})[y]);
    if (n !== null && n > 0) comicbaseSpots.push({ label: `’${y.slice(2)}`, usd: n });
  }

  let headlineUsd: number | null = null;
  let headlineGrade: string | null = null;
  for (const g of PP_HEADLINE_ORDER) {
    if (g in ladder) {
      headlineUsd = ladder[g];
      headlineGrade = g;
      break;
    }
  }
  if (headlineUsd === null && cbPrice !== null && cbPrice > 0) {
    headlineUsd = cbPrice;
    headlineGrade = "NM";
  }
  if (headlineUsd === null) return null; // no published price from either source → not a rail book

  const era = row.age || "unknown"; // age = era of this issue's publication year; origin era = era of the series' issue #1
  const variant = (row.variant_label || "").trim() || null;
  const editionForm = row.edition_form || "DIRECT";
  const keyBadge = resolveHistoricalKeyBadge(series, issue);
  const tier = resolveHistoricalScarcityTier({ year: row.year ?? undefined, era, keyBadge, isSovereign: false, variant: variant ?? undefined, cgcTotalGraded: row.cgc_total });
  const marketClass = resolveHistoricalMarketClass({ isSovereign: false, fmv: headlineUsd, keyBadge, year: row.year ?? undefined, era, variant: variant ?? undefined });
  const ticker = formatComicEquityTicker(series, issue);

  return {
    entryId: `cb-${row.rail_seq}`,
    coverImageUrl: optimizedCoverUrl(row.gcs_key),
    ppLadder: ppLadder.length ? ppLadder : undefined,
    comicbaseSpots: comicbaseSpots.length ? comicbaseSpots : undefined,
    pricing: {
      fmv_usd: headlineUsd,
      grade: headlineGrade,
      delta_24: null,
      delta_30: null,
      delta_90: null,
      asset_class: marketClass,
    },
    identity: {
      assetId: ticker,
      productName: variant ? `${series} #${issue} [${variant}]` : `${series} #${issue}`,
      year: row.year ?? null,
      publisher: row.publisher_folder || null,
      variant,
      productionAge: era,
      originEra: row.origin_era,
      originYear: row.origin_year,
      scarcityTier: tier,
      detailUrl: row.detail_id ? `/comics/${encodeURIComponent(row.detail_id)}` : `/comics/${encodeURIComponent(ticker)}`,
      assetClass: marketClass as EquityItem["identity"]["assetClass"],
      marketPriceClass: marketClass,
      isSovereign: false,
      certificationState: "OBSERVED",
      editionForm,
      coverVerified: true,
      yearDivergence: false,
      coverSuppressReason: null,
      identityConfidence: null,
      quarantined: false,
      keyBadge,
    },
  };
}

export async function getCoveredBooksSlice(offset: number, limit: number): Promise<{ items: EquityItem[]; nextOffset: number; total: number }> {
  const total = COVERED_BOOKS_TOTAL;
  const start = ((Math.max(0, offset) % total) + total) % total;
  const supabase = createAdminServerClient();
  const cols = "rail_seq,seq,age,origin_era,origin_year,edition_form,printing,variant_label,gcs_key,publisher_folder,series,issue_number,year,pp_id,pp_ladder,detail_id,comicbase_source_id,cb_price,cb_values,cgc_total";

  const fetchRange = async (from: number, to: number): Promise<CoveredBookRow[]> => {
    const { data, error } = await supabase
      .from("rail_covered_books")
      .select(cols)
      .gte("rail_seq", from)
      .lte("rail_seq", to)
      .order("rail_seq", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CoveredBookRow[];
  };

  let rows = await fetchRange(start + 1, start + limit);
  if (rows.length < limit && start + limit > total) {
    rows = rows.concat(await fetchRange(1, start + limit - total));
  }
  const items = rows.map(mapCoveredBook).filter((i): i is EquityItem => i !== null);
  return { items, nextOffset: (start + limit) % total, total };
}

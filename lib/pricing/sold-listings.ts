/**
 * sold-listings.ts
 * ================
 * Grade prices computed from PriceCharting's individual dated sold listings
 * (data/pricecharting_sales.sqlite, collected by scripts/harvest_complete_web_payloads.py).
 *
 * Price per grade = median of that exact product's most recent sales in that grade
 * (up to RECENT_N within the last WINDOW_DAYS). Median, not mean, so one mislabelled
 * or reprint sale cannot drag the number. A grade with fewer than MIN_SALES recent
 * sales gets no sales price — nothing is inferred.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "node:module";

const requireModule = createRequire(import.meta.url);

export const SALES_RECENT_N = 10;
export const SALES_WINDOW_DAYS = 365;
/** If a grade has fewer than SALES_MIN_SALES genuine sales in the last year, look back this far. */
export const SALES_EXTENDED_WINDOW_DAYS = 730;
export const SALES_MIN_SALES = 3;

/**
 * PriceCharting files foreign editions, reprints and homages under the original product
 * (e.g. "Ultimate Fallout #4 Djurdjevic Turkish Edition … 2022" under the 2011 1:25 variant).
 * A sale is excluded when its listing title names a different edition, or carries a year
 * and none of its years match the product's publication year.
 */
const OTHER_EDITION_WORDS = [
  "turkish", "turkey", "russian", "panini", "france", "french", "hors serie", "italian", "italy",
  "spanish", "spain", "mexican", "mexico", "german", "brazil", "portuguese", "japanese", "korean",
  "foreign", "facsimile", "reprint", "homage", "trade", "paralel evren", "tpb",
];
const EDITION_WORDS_ALLOWED_BY_PRODUCT = ["virgin", "foil", "facsimile", "reprint", "trade"];

export function isOtherEditionSale(
  title: string | null | undefined,
  productYear: number | null | undefined,
  productName: string | null | undefined,
): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  const p = (productName ?? "").toLowerCase();
  for (const w of OTHER_EDITION_WORDS) {
    if (t.includes(w) && !p.includes(w)) return true;
  }
  for (const w of EDITION_WORDS_ALLOWED_BY_PRODUCT) {
    if (t.includes(w) && !p.includes(w) && (w === "virgin" || w === "foil")) return true;
  }
  if (productYear) {
    const years = t.match(/\b(19[3-9]\d|20[0-4]\d)\b/g);
    if (years && years.length > 0 && !years.includes(String(productYear))) return true;
  }
  return false;
}

export interface SalesFilterContext {
  productYear?: number | null;
  productName?: string | null;
}

export interface GradeSalesStat {
  grade: string;
  medianUsd: number;
  salesUsed: number;
  salesTotal: number;
  latestSaleDate: string;
  oldestUsedDate: string;
}

export interface SoldListing {
  grade: string | null;
  saleDate: string;
  priceUsd: number;
  title: string | null;
  venue: string | null;
}

const DB_PATH = path.resolve(process.cwd(), "..", "data", "pricecharting_sales.sqlite");
let db: any = null;
let dbAvailable: boolean | null = null;

function getDb(): any | null {
  if (dbAvailable === false) return null;
  if (db) return db;
  try {
    if (!fs.existsSync(DB_PATH)) {
      dbAvailable = false;
      return null;
    }
    const { DatabaseSync } = requireModule("node:sqlite");
    db = new DatabaseSync(DB_PATH, { readOnly: true });
    dbAvailable = true;
    return db;
  } catch (err) {
    console.warn("[sold-listings] sales database unavailable:", err);
    dbAvailable = false;
    return null;
  }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Number(((s[m - 1] + s[m]) / 2).toFixed(2));
}

/** Per-grade sales prices for one PriceCharting product id. Empty map if no data. */
export function getGradeSalesStats(
  productId: string | number | null | undefined,
  ctx: SalesFilterContext = {},
): Map<string, GradeSalesStat> {
  const out = new Map<string, GradeSalesStat>();
  if (productId == null || String(productId).trim() === "") return out;
  const conn = getDb();
  if (!conn) return out;

  const rows = (conn
    .prepare(
      `SELECT grade_label AS grade, sale_date AS d, price_usd AS p, title
         FROM pc_sold_listings
        WHERE product_id = ? AND grade_label IS NOT NULL AND price_usd > 0
        ORDER BY sale_date DESC`
    )
    .all(String(productId).trim()) as Array<{ grade: string; d: string; p: number; title: string | null }>)
    .filter((r) => !isOtherEditionSale(r.title, ctx.productYear, ctx.productName));

  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const cutoff = day(SALES_WINDOW_DAYS);
  const extendedCutoff = day(SALES_EXTENDED_WINDOW_DAYS);
  const byGrade = new Map<string, Array<{ d: string; p: number }>>();
  for (const r of rows) {
    const list = byGrade.get(r.grade) ?? [];
    list.push({ d: r.d, p: r.p });
    byGrade.set(r.grade, list);
  }

  for (const [grade, all] of byGrade) {
    // Outlier filter: a sale under 20% or over 5× the grade's all-history median is almost always
    // a different edition mis-filed under this product (e.g. a $12 standard copy under a 1:25 variant).
    const allMedian = median(all.map((x) => x.p));
    const list = all.filter((x) => x.p >= allMedian * 0.2 && x.p <= allMedian * 5);
    let recent = list.filter((x) => x.d >= cutoff).slice(0, SALES_RECENT_N);
    if (recent.length < SALES_MIN_SALES) recent = list.filter((x) => x.d >= extendedCutoff).slice(0, SALES_RECENT_N);
    if (recent.length < SALES_MIN_SALES) continue;
    out.set(grade, {
      grade,
      medianUsd: median(recent.map((x) => x.p)),
      salesUsed: recent.length,
      salesTotal: list.length,
      latestSaleDate: recent[0].d,
      oldestUsedDate: recent[recent.length - 1].d,
    });
  }
  return out;
}

/** Raw dated sales for one product (newest first), other-edition listings removed. */
export function getSoldListings(
  productId: string | number | null | undefined,
  limit = 500,
  ctx: SalesFilterContext = {},
): SoldListing[] {
  if (productId == null || String(productId).trim() === "") return [];
  const conn = getDb();
  if (!conn) return [];
  return (
    conn
      .prepare(
        `SELECT grade_label AS grade, sale_date AS saleDate, price_usd AS priceUsd, title, venue
           FROM pc_sold_listings WHERE product_id = ? ORDER BY sale_date DESC LIMIT ?`
      )
      .all(String(productId).trim(), limit) as SoldListing[]
  ).filter((s) => !isOtherEditionSale(s.title, ctx.productYear, ctx.productName));
}

/**
 * Verified sale counts per grade for one product: other-edition listings and price outliers
 * (same rules as getGradeSalesStats) removed. last12m = sales in the past 365 days.
 */
export function getVerifiedSaleCounts(
  productId: string | number | null | undefined,
  ctx: SalesFilterContext = {},
): Record<string, { last12m: number; total: number }> {
  const out: Record<string, { last12m: number; total: number }> = {};
  const byGrade = new Map<string, Array<{ d: string; p: number }>>();
  for (const s of getSoldListings(productId, 100000, ctx)) {
    if (!s.grade || !(s.priceUsd > 0)) continue;
    const list = byGrade.get(s.grade) ?? [];
    list.push({ d: s.saleDate, p: s.priceUsd });
    byGrade.set(s.grade, list);
  }
  const cutoff = new Date(Date.now() - SALES_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const [grade, all] of byGrade) {
    const m = median(all.map((x) => x.p));
    const kept = all.filter((x) => x.p >= m * 0.2 && x.p <= m * 5);
    out[grade] = { last12m: kept.filter((x) => x.d >= cutoff).length, total: kept.length };
  }
  return out;
}

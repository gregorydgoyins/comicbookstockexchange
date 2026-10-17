import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { parseAndFilterListing } from "@/lib/sniper/anti-bullshit";
import { resolveAuthoritativePublisher } from "@/lib/comics/publisher-authority";
import { dedupeSales, saleStats, seriesKey, type SaleObs } from "@/lib/sniper/candles";
import benchmarksData from "@/lib/pricing/pricecharting-cgc-benchmarks.json";

const requireModule = createRequire(import.meta.url);

export const gradeNum = (g: unknown): number | null => {
  const n = parseFloat(String(g ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

let benchmarkIndex: Map<string, any> | null = null;
function getBenchmarkIndex(): Map<string, any> {
  if (benchmarkIndex) return benchmarkIndex;
  benchmarkIndex = new Map<string, any>();
  for (const [k, v] of Object.entries(benchmarksData as Record<string, any>)) {
    if (!v) continue;
    const key = seriesKey(v.series || k.split(" #")[0], v.issueNumber || k.split(" #")[1] || "1");
    if (key && !benchmarkIndex.has(key)) benchmarkIndex.set(key, v);
  }
  return benchmarkIndex;
}

export function benchmarkSalesForBook(series: string, issue: string): SaleObs[] {
  const out: SaleObs[] = [];
  if (!series || series === "Unknown Series") return out;
  const cleanIssue = String(issue).replace(/^#/, "").trim();
  const candidates = [series, `The ${series}`, series.replace(/^the\s+/i, "")];
  let entry: any = null;
  for (const cand of candidates) {
    entry = (benchmarksData as Record<string, any>)[`${cand} #${cleanIssue}`];
    if (entry) break;
  }
  if (!entry) {
    entry = getBenchmarkIndex().get(seriesKey(series, cleanIssue)) ?? null;
  }
  if (!entry) return out;
  const derivedDates = new Set(
    (entry.allObservations ?? [])
      .filter((o: any) => o.type === "PRICECHARTING_GUIDE_OBSERVATION" || o.type === "PANEL_PROFITS_DERIVED_FMV")
      .map((o: any) => o.date)
  );
  for (const o of entry.allObservations ?? []) {
    if (o.type === "PRICECHARTING_GUIDE_OBSERVATION" || o.type === "PANEL_PROFITS_DERIVED_FMV") continue;
    const amt = Number(o.amount);
    const dt = o.date || o.observedAt;
    if (amt > 0 && dt) {
      out.push({
        date: String(dt).slice(0, 10),
        price: amt,
        grade: gradeNum(o.grade),
        venue: o.authority || o.type || "benchmark",
        source: `benchmark:${o.type ?? "obs"}`,
        confirmed: true,
      });
    }
  }
  for (const o of entry.cgc ?? []) {
    const dt = o.observedAt || o.date;
    if (dt && derivedDates.has(dt)) continue;
    const amt = Number(o.amount);
    if (amt > 0 && dt) {
      out.push({
        date: String(dt).slice(0, 10),
        price: amt,
        grade: gradeNum(o.grade),
        venue: o.venue || o.authority || "CGC",
        source: "benchmark:cgc",
        confirmed: true,
      });
    }
  }
  return out;
}

let ppDbInstance: any = null;
let ppDbChecked = false;
function getPpDb(): any | null {
  if (ppDbChecked) return ppDbInstance;
  ppDbChecked = true;
  const p = path.resolve(process.cwd(), "data", "pp115k.sqlite");
  if (fs.existsSync(p)) {
    try {
      const { DatabaseSync } = requireModule("node:sqlite");
      ppDbInstance = new DatabaseSync(p, { readOnly: true });
    } catch {}
  }
  return ppDbInstance;
}

let cbDbInstance: any = null;
let cbDbChecked = false;
function getCbDb(): any | null {
  if (cbDbChecked) return cbDbInstance;
  cbDbChecked = true;
  const p = path.resolve(process.cwd(), "data", "comicbase.sqlite");
  if (fs.existsSync(p)) {
    try {
      const { DatabaseSync } = requireModule("node:sqlite");
      cbDbInstance = new DatabaseSync(p, { readOnly: true });
    } catch {}
  }
  return cbDbInstance;
}

import { lookupComicBaseMetadata, lookupRealCensus } from "@/lib/comics/census-authority";
import type { ComicEra } from "@/lib/sniper/types";

const publisherCache = new Map<string, string | null>();

export function eraFromYear(year?: number | null, fallbackEra: ComicEra = "modern"): ComicEra {
  if (!year || !Number.isFinite(year)) return fallbackEra;
  if (year < 1938) return "platinum";
  if (year <= 1945) return "golden";
  if (year <= 1955) return "atomic";
  if (year <= 1969) return "silver";
  if (year <= 1983) return "bronze";
  if (year <= 1991) return "copper";
  if (year <= 2009) return "modern";
  return "postmodern";
}

export function resolveAuctionDbMetadata(
  title: string,
  rawGrade?: number,
  recordedSales?: SaleObs[]
): {
  fmv: number | null;
  publisher: string | null;
  year: number | null;
  era: ComicEra;
  censusTotal?: number;
  censusTopGrade?: string;
  historicalComps: Array<{ date: string; price: number; grade: number; venue: string }>;
  pricingSourceProvenance: string | null;
} {
  const parsed = parseAndFilterListing(title);
  const series = parsed.extractedSeries?.trim() || "";
  const issue = parsed.extractedIssue?.trim() || "1";
  const cleanSeries = series.toLowerCase();
  const grade = rawGrade ?? parsed.grade ?? null;

  let fmv: number | null = null;
  let publisher: string | null = null;
  let historicalComps: Array<{ date: string; price: number; grade: number; venue: string }> = [];
  let pricingSourceProvenance: string | null = null;

  // FMV comes strictly from recorded sales at the book's exact grade; otherwise null (unavailable).
  if (series && series !== "Unknown Series" && grade != null) {
    const combinedSales = [
      ...(recordedSales ?? []),
      ...benchmarkSalesForBook(series, issue),
    ];
    const atGrade = dedupeSales(combinedSales).filter((s) => s.grade === grade && s.confirmed);
    if (atGrade.length > 0) {
      const stats = saleStats(atGrade);
      fmv = stats.median90d ?? stats.median ?? null;
      historicalComps = atGrade
        .slice(-12)
        .map((s) => ({
          date: s.date.slice(0, 10),
          price: s.price,
          grade: s.grade ?? grade,
          venue: s.venue || "Auction Comp",
        }));
      const venues = Array.from(new Set(atGrade.map((s) => s.venue).filter(Boolean))).slice(0, 3).join(", ");
      pricingSourceProvenance = `Verified Realized Sales (${atGrade.length} exact Grade ${grade.toFixed(1)} comp${atGrade.length === 1 ? "" : "s"}${venues ? ` · ${venues}` : ""})`;
    }
  }

  const cbMeta = series && series !== "Unknown Series" ? lookupComicBaseMetadata(series, issue) : null;
  const realCensus = series && series !== "Unknown Series" ? lookupRealCensus(series, issue) : null;
  const resolvedYear = cbMeta?.year ?? realCensus?.year ?? parsed.extractedYear ?? null;
  const resolvedEra = eraFromYear(resolvedYear, parsed.extractedEra);

  const pubKey = `${cleanSeries}:${issue}`;
  if (publisherCache.has(pubKey)) {
    return {
      fmv,
      publisher: publisherCache.get(pubKey) ?? null,
      year: resolvedYear,
      era: resolvedEra,
      censusTotal: realCensus?.totalGraded,
      censusTopGrade: realCensus?.topGrade,
      historicalComps,
      pricingSourceProvenance,
    };
  }

  if (cbMeta?.publisher) {
    publisher = resolveAuthoritativePublisher(series, cbMeta.publisher, resolvedYear ?? undefined);
  }

  if (!publisher) {
    const cbDb = getCbDb();
    if (cbDb && series && series !== "Unknown Series") {
      try {
        const candidates = [cleanSeries, cleanSeries + ", the", "the " + cleanSeries];
        const stmt = cbDb.prepare("SELECT publisher, year FROM comicbase_items WHERE clean_series = ? AND issue_number = ? LIMIT 1");
        for (const cand of candidates) {
          const cb = stmt.get(cand, issue) as any;
          if (cb) {
            if (cb.publisher) {
              publisher = resolveAuthoritativePublisher(series, cb.publisher, cb.year ?? resolvedYear ?? undefined);
            }
            break;
          }
        }
      } catch {}
    }
  }

  if (!publisher && series && series !== "Unknown Series") {
    publisher = resolveAuthoritativePublisher(series, null, resolvedYear ?? undefined);
  }

  publisherCache.set(pubKey, publisher);
  return {
    fmv,
    publisher,
    year: resolvedYear,
    era: resolvedEra,
    censusTotal: realCensus?.totalGraded,
    censusTopGrade: realCensus?.topGrade,
    historicalComps,
    pricingSourceProvenance,
  };
}

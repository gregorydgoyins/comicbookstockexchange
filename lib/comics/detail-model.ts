/**
 * Detail-page view-model helpers. Every value here is derived from stored rows only; when the
 * underlying data is missing the helper returns null / an empty list. Nothing is estimated,
 * defaulted or assumed.
 */

export interface SaleRow {
  sale_price: number | string | null;
  sale_date: string | null;
  native_grade_text: string | null;
  venue: string | null;
  native_designation?: string | null;
}

export interface SaleListItem {
  grade: string;
  priceUsd: number;
  date: string;
  platform: string | null;
}

/** Sanitize venue strings so external raw vendor names like eBay or PriceCharting are never player-facing. */
export function sanitizeVenue(venue?: string | null): string {
  if (!venue) return "Certified Secondary Auction";
  const v = venue.toLowerCase();
  if (v.includes("heritage")) return "Heritage Auctions";
  if (v.includes("comicconnect")) return "ComicConnect";
  if (v.includes("comiclink")) return "ComicLink";
  if (v.includes("goldin")) return "Goldin Auctions";
  if (v.includes("metropolis")) return "Metropolis Collectibles";
  if (v.includes("gpa")) return "GPA Certified Ledger";
  if (v.includes("ebay") || v.includes("pricecharting")) {
    return "Certified Secondary Clearinghouse";
  }
  const cleaned = venue
    .replace(/pricecharting\s*[·\-\/]?\s*/gi, "")
    .replace(/ebay/gi, "Certified Secondary Clearinghouse")
    .trim();
  return cleaned || "Certified Secondary Clearinghouse";
}

/** Real dated sales, newest first. A sale with no price, date or grade label cannot be shown and is dropped. */
export function toSaleList(rows: SaleRow[] | null | undefined, limit = 20): SaleListItem[] {
  const out: SaleListItem[] = [];
  for (const r of rows ?? []) {
    const price = Number(r.sale_price);
    const grade = (r.native_grade_text ?? "").trim();
    if (!(price > 0) || !r.sale_date || !grade) continue;
    out.push({ grade, priceUsd: price, date: r.sale_date, platform: sanitizeVenue(r.venue) });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out.slice(0, limit);
}

export interface LastSale {
  priceUsd: number;
  date: string;
  grade: string;
  venue: string | null;
}

export function lastSale(rows: SaleRow[] | null | undefined): LastSale | null {
  const first = toSaleList(rows, 1)[0];
  return first ? { priceUsd: first.priceUsd, date: first.date, grade: first.grade, venue: sanitizeVenue(first.platform) } : null;
}

export function countSalesByGrade(rows: SaleRow[] | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) {
    const g = (r.native_grade_text ?? "").trim();
    if (g && r.sale_date && Number(r.sale_price) > 0) m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

export interface SnapshotObservation {
  amount: number;
  observed_at: string;
  grade_label: string;
}

export function latestSnapshotDate(obs: SnapshotObservation[]): string | null {
  let best: string | null = null;
  for (const o of obs) if (o.observed_at && (best === null || o.observed_at > best)) best = o.observed_at;
  return best;
}

function dayDiff(a: string, b: string): number {
  const ms = Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Percent change of a grade between its two most recent PriceCharting snapshots, only when those
 * snapshots are exactly one day apart (the "24h" label is then literally true). Otherwise null.
 */
export function delta24hPct(obs: SnapshotObservation[], grade: string): number | null {
  const pts = obs
    .filter((o) => o.grade_label === grade && o.amount > 0 && o.observed_at)
    .sort((a, b) => (a.observed_at < b.observed_at ? -1 : 1));
  if (pts.length < 2) return null;
  const prev = pts[pts.length - 2];
  const cur = pts[pts.length - 1];
  if (dayDiff(cur.observed_at, prev.observed_at) !== 1) return null;
  return Number((((cur.amount - prev.amount) / prev.amount) * 100).toFixed(2));
}

export interface SpreadAnchor {
  buy: number;
  sell: number;
  spread: number;
}

/** Stored PriceCharting buy/sell pairs, one per grade that has both sides. spread = (sell - buy) / sell. */
export function ppSpreadAnchors(spreads: unknown): Record<string, SpreadAnchor> {
  const out: Record<string, SpreadAnchor> = {};
  if (!spreads || typeof spreads !== "object") return out;
  for (const [grade, v] of Object.entries(spreads as Record<string, any>)) {
    const buy = Number(v?.buy);
    const sell = Number(v?.sell);
    if (buy > 0 && sell > 0 && sell >= buy) {
      out[grade] = { buy, sell, spread: Number(((sell - buy) / sell).toFixed(3)) };
    }
  }
  return out;
}

export interface CensusGradeRow {
  grade_numeric?: number | null;
  native_grade_text?: string | null;
  count_at_grade?: number | null;
}

/** Copies graded 9.0 or higher, from the census rows actually on file. null when there are none. */
export function censusNinePlus(grades: CensusGradeRow[] | null | undefined): number | null {
  if (!grades || grades.length === 0) return null;
  let total = 0;
  let any = false;
  for (const g of grades) {
    const n = g.grade_numeric ?? Number(g.native_grade_text);
    if (Number.isFinite(n) && (n as number) >= 9.0) {
      total += Number(g.count_at_grade || 0);
      any = true;
    }
  }
  return any ? total : null;
}

export interface CompletenessInput {
  cover: boolean;
  census: boolean;
  gradeLattice: boolean;
  priceHistory: boolean;
  recentSales: boolean;
  liquidity: boolean;
}

/** Share of the six data sections that have rows on file. */
export function buildCompleteness(sections: CompletenessInput) {
  const present = Object.values(sections).filter(Boolean).length;
  const score = Math.round((present / 6) * 100);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  return { sections, score, total: 100, grade };
}

export interface ProvenanceItem {
  id: string;
  title: string;
  value: string;
  source: string;
  asOf: string | null;
  derivation: string;
  rows: Array<{ provider: string; observation: string; date: string | null }>;
}

export interface LedgerInput {
  fmv98: number | null;
  ppSnapshotDate: string | null;
  ppSnapshotCount: number;
  ppSourceId: string | null;
  census: { total: number; snapshotDate: string | null } | null;
  sales: { count: number; first: string | null; last: string | null } | null;
  cover: { source: string | null; verifiedAt: string | null } | null;
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One ledger entry per stored fact. Entries exist only when their data does; no confidence scores. */
export function buildProvenanceLedger(i: LedgerInput): ProvenanceItem[] {
  const items: ProvenanceItem[] = [];
  if (i.fmv98 != null && i.fmv98 > 0) {
    items.push({
      id: "price-98",
      title: "9.8 price",
      value: usd(i.fmv98),
      source: "Exchange Benchmark Index",
      asOf: i.ppSnapshotDate,
      derivation: i.ppSnapshotDate
        ? `Stored Exchange Benchmark 9.8 price for product ${i.ppSourceId ?? "(id not on file)"}. ${i.ppSnapshotCount} dated nightly snapshot${i.ppSnapshotCount === 1 ? "" : "s"} on file for this book.`
        : `Stored Exchange Benchmark 9.8 price for product ${i.ppSourceId ?? "(id not on file)"}. No dated snapshot is on file for this book yet.`,
      rows: [{ provider: "Exchange Benchmark", observation: usd(i.fmv98), date: i.ppSnapshotDate }],
    });
  }
  if (i.census && i.census.total > 0) {
    items.push({
      id: "census",
      title: "CGC census",
      value: `${i.census.total.toLocaleString("en-US")} graded copies`,
      source: "CGC population report",
      asOf: i.census.snapshotDate,
      derivation: "Total graded population from the stored CGC census snapshot for this title and issue.",
      rows: [{ provider: "CGC census", observation: `Total graded = ${i.census.total.toLocaleString("en-US")}`, date: i.census.snapshotDate }],
    });
  }
  if (i.sales && i.sales.count > 0) {
    items.push({
      id: "sales",
      title: "Recorded sales",
      value: `${i.sales.count} sale${i.sales.count === 1 ? "" : "s"}`,
      source: "Graded sales observations",
      asOf: i.sales.last,
      derivation: `${i.sales.count} dated sale row${i.sales.count === 1 ? "" : "s"} stored for this title and issue${i.sales.first && i.sales.last ? `, from ${i.sales.first.slice(0, 10)} to ${i.sales.last.slice(0, 10)}` : ""}.`,
      rows: [{ provider: "Graded sales observations", observation: `${i.sales.count} rows`, date: i.sales.last }],
    });
  }
  if (i.cover && i.cover.source) {
    items.push({
      id: "cover",
      title: "Cover image",
      value: i.cover.source,
      source: i.cover.source,
      asOf: i.cover.verifiedAt,
      derivation: "Origin recorded for the cover image shown on this page.",
      rows: [{ provider: i.cover.source, observation: "Cover image source", date: i.cover.verifiedAt }],
    });
  }
  return items;
}

export interface ExecutionQuote {
  grade: string;
  fmvUsd: number | null;
  /** What PriceCharting lists dealers paying (buy) and retail asking (sell) at this grade, when stored. */
  buyUsd: number | null;
  sellUsd: number | null;
  asOf: string | null;
}

/** Quote for a grade straight from stored PriceCharting buy/sell. Both sides null when none is stored. */
export function buildQuote(
  grade: string,
  fmvUsd: number | null,
  anchors: Record<string, SpreadAnchor>,
  asOf: string | null,
): ExecutionQuote {
  const a = anchors[grade] ?? null;
  return { grade, fmvUsd: fmvUsd != null && fmvUsd > 0 ? fmvUsd : null, buyUsd: a?.buy ?? null, sellUsd: a?.sell ?? null, asOf };
}

const QUOTE_GRADE_PREFERENCE = ["9.8", "RAW", "9.6", "9.4", "9.2", "9.0", "8.0", "6.0", "4.0"];

/** Grade to quote: 9.8 if a stored buy/sell pair exists for it, else Raw, else the next grade that has one. null if none. */
export function pickQuoteGrade(anchors: Record<string, SpreadAnchor>): string | null {
  for (const g of QUOTE_GRADE_PREFERENCE) if (anchors[g]) return g;
  const rest = Object.keys(anchors);
  return rest.length > 0 ? rest[0] : null;
}

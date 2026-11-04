import type { ComicRecord } from "@/lib/comics/types";
import {
  cbcsGrades,
  cgcGrades,
  comicBaseGrades,
  comicBaseReference,
  ebayGrades,
  egsGrades,
  getHighestGradedPrice,
  goCollectCgcGrades,
  goCollectCbcsGrades,
  goCollectPsaGrades,
  GRADES,
  type Grade,
  panelProfitsGrades,
  panelProfitsSpreads,
  panelProfitsDelta,
  panelProfitsVolume,
  panelProfitsListings,
  pgxGrades,
  priceChartingGrades,
  psaGrades,
} from "@/lib/pricing/source-ladder";
import { formatCurrency } from "@/lib/utils";
import { getCleanPricingEvidence } from "@/lib/pricing/clean";
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Database } from "lucide-react";
import { EvidenceRegistryTable, type EvidenceRowData } from "./evidence-registry-table";

const PRIMARY_EXCHANGE_GRADES: Array<{
  grade: Grade;
  label: string;
  sublabel: string;
}> = [
  { grade: "RAW", label: "Ungraded", sublabel: "Loose / Raw" },
  { grade: "4.0", label: "4.0 / VG", sublabel: "Very Good" },
  { grade: "6.0", label: "6.0 / Fine", sublabel: "Fine" },
  { grade: "8.0", label: "8.0 / VF", sublabel: "Very Fine" },
  { grade: "9.2", label: "9.2 / NM-", sublabel: "Near Mint -" },
  { grade: "9.8", label: "9.8", sublabel: "Near Mint / Mint" },
];

export async function PricingDossier({
  comic,
  sales = [],
  athSale = null,
}: {
  comic: ComicRecord;
  sales?: Array<{
    grade?: string | null;
    priceUsd?: number | null;
    date?: string | null;
    platform?: string | null;
  }>;
  /** Highest single verified sale of this exact book (all grades), with its listing. */
  athSale?: {
    priceUsd: number;
    date: string;
    grade: string | null;
    venue: string | null;
    title: string | null;
  } | null;
}) {
  const cleanEvidence = await getCleanPricingEvidence(comic.id, comic.pp_source_id);
  const ppCurrent = panelProfitsGrades(comic);
  const pp = {
    ...cleanEvidence.grades,
    ...ppCurrent,
  };
  // Every grade is classified by the detail page (see top_grade_status):
  // market → price; sale → sale amount + date; estimate → PriceCharting value marked "est.";
  // absent → no price. When no classification exists (older callers), fall back to the ladder.
  const topGradeStatus = ((comic.panel_profits_data as any)?.top_grade_status ?? {}) as Record<
    string,
    { kind: "market" | "sale" | "estimate"; priceUsd: number; date: string | null }
  >;
  const hasGradeStatus = Object.keys(topGradeStatus).length > 0;
  if (hasGradeStatus) {
    for (const g of Object.keys(pp)) {
      if (!(topGradeStatus[g]?.priceUsd > 0)) delete (pp as any)[g];
    }
    for (const [g, st] of Object.entries(topGradeStatus)) (pp as any)[g] = st.priceUsd;
  }
  for (const g of ["9.9", "10.0"] as const) {
    if (!(topGradeStatus[g]?.priceUsd > 0)) delete (pp as any)[g];
  }

  // Dealer bid/ask quotes are PriceCharting retail estimates, not sales. Show one only when the
  // grade has a price backed by real sales and the quote sits within 0.5×–2× of it.
  const quoteFits = <T extends { buy?: number | null; sell?: number | null }>(grade: string, s: T): T => {
    const st = topGradeStatus[grade];
    if (hasGradeStatus && (!st || st.kind === "estimate")) return { ...s, buy: null, sell: null };
    const ref = st?.priceUsd ?? null;
    if (!ref) return s;
    const ok = (v?: number | null) => v != null && v >= ref * 0.5 * 0.5 && v <= ref * 2;
    return { ...s, buy: ok(s.buy) ? s.buy : null, sell: ok(s.sell) ? s.sell : null };
  };
  const pcGrades = priceChartingGrades(comic);
  const ebayLadder = ebayGrades(comic);
  const cbGrades = comicBaseGrades(comic);
  const cb = comicBaseReference(comic);
  const gcCgcGrades = goCollectCgcGrades(comic);
  const gcCbcsGrades = goCollectCbcsGrades(comic);
  const gcPsaGrades = goCollectPsaGrades(comic);
  const cgcGpaGrades = cgcGrades(comic);
  const cbcsLadder = cbcsGrades(comic);
  const psaLadder = psaGrades(comic);
  const pgxLadder = pgxGrades(comic);
  const egsLadder = egsGrades(comic);

  // Compute Verified Peak Historic Record from Actual Observation History
  const salesWithPrice = sales.filter((s) => s.priceUsd && s.priceUsd > 0);
  const highestSaleFromRecords = salesWithPrice.length > 0
    ? [...salesWithPrice].sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0))[0]
    : null;

  const highestFromLadder = getHighestGradedPrice({
    "Panel Profits": pp,
    "PriceCharting": pcGrades,
    "GoCollect - CGC": gcCgcGrades,
    "GoCollect - CBCS": gcCbcsGrades,
    "GoCollect - PSA": gcPsaGrades,
    "CGC · GPA sales": cgcGpaGrades,
    "CBCS": cbcsLadder,
    "PSA": psaLadder,
    "PGX": pgxLadder,
    "EGS / EGA": egsLadder,
    "eBay Sold Transactions": ebayLadder,
    "ComicBase": cbGrades,
  });

  // Strict verification: ATH must be a single real, dated transaction — never a book/guide value.
  // A grade ladder price (e.g. a PriceCharting 10.0 estimate) is not a sale and is never shown here.
  const verifiedAth = athSale
    ? {
        price: athSale.priceUsd,
        date: athSale.date,
        year: athSale.date ? new Date(athSale.date).getFullYear() : null,
        venue: athSale.venue || "Recorded sale",
        grade: athSale.grade,
        title: athSale.title,
        isVerifiedSale: true,
      }
    : highestSaleFromRecords
    ? {
        price: highestSaleFromRecords.priceUsd!,
        date: highestSaleFromRecords.date ?? null,
        year: highestSaleFromRecords.date ? new Date(highestSaleFromRecords.date).getFullYear() : null,
        venue: highestSaleFromRecords.platform || "Recorded sale",
        grade: highestSaleFromRecords.grade,
        title: null as string | null,
        isVerifiedSale: true,
      }
    : null;
  void highestFromLadder;

  // Basic Replacement Cost & Arbitrage Economics Engine
  const rawPrice = Number(pp["RAW"] ?? pcGrades["RAW"] ?? cbGrades["RAW"] ?? 0);
  const isPre1975 = (comic.publication_year ?? 1980) < 1975;
  const cgcGradingFee = isPre1975 ? 42 : 25; // Pre-1975 vintage tier vs Post-1975 modern tier
  const baseGradedValue = Number(pp["9.8"] ?? pcGrades["9.8"] ?? (rawPrice > 0 ? rawPrice * 4 : 100));
  // Insurance scaled to graded value ($10.00 min to $28.00 max)
  const insuranceFee = Math.max(10, Math.min(28, Math.round(baseGradedValue * 0.015)));
  const shippingRoundtrip = 30; // $15 each way
  const invoiceFee = 8; // Online invoicing fee
  const fixedGradingExpenses = cgcGradingFee + shippingRoundtrip + invoiceFee + insuranceFee;
  const baseReplacementCost = rawPrice > 0 ? rawPrice + fixedGradingExpenses : 0;

  // 3 Multi-Tier Comparative Benchmarks: 8.0, 9.4, 9.8
  const p80 = Number(pp["8.0"] ?? pcGrades["8.0"] ?? 0);
  const p94 = Number(pp["9.4"] ?? pcGrades["9.4"] ?? (pp["9.2"] ? Number(pp["9.2"]) * 1.15 : 0));
  const p98 = Number(pp["9.8"] ?? pcGrades["9.8"] ?? 0);

  // Return On Investment vs Replacement Cost
  const diff80 = p80 > 0 && baseReplacementCost > 0 ? p80 - baseReplacementCost : null;
  const roi80 = diff80 != null && baseReplacementCost > 0 ? (diff80 / baseReplacementCost) * 100 : null;

  const diff94 = p94 > 0 && baseReplacementCost > 0 ? p94 - baseReplacementCost : null;
  const roi94 = diff94 != null && baseReplacementCost > 0 ? (diff94 / baseReplacementCost) * 100 : null;

  const diff98 = p98 > 0 && baseReplacementCost > 0 ? p98 - baseReplacementCost : null;
  const roi98 = diff98 != null && baseReplacementCost > 0 ? (diff98 / baseReplacementCost) * 100 : null;

  // Build candidate rows and evaluate all 26 grades
  const buildRowValues = (
    evaluator: (grade: Grade) => { display: string; colorClass?: string }
  ): Record<Grade, { display: string; colorClass?: string }> => {
    const res: Record<string, { display: string; colorClass?: string }> = {};
    for (const g of GRADES) {
      res[g] = evaluator(g);
    }
    return res as Record<Grade, { display: string; colorClass?: string }>;
  };

  const allCandidateRows: Array<EvidenceRowData & { alwaysShow?: boolean }> = [
    // 1. PANEL PROFITS SUITE (FMV, BUY, SELL, VOLUME, LISTINGS)
    {
      id: "pp-fmv",
      source: "Panel Profits",
      badge: "Exchange FMV",
      badgeClass: "text-emerald-400/90",
      alwaysShow: true,
      values: buildRowValues((grade: Grade) => {
        const isTop = grade === "9.9" || grade === "10.0";
        const top = topGradeStatus[grade];
        // Classified grades never fall back to another source: evidence status decides.
        const p = hasGradeStatus || isTop ? (top?.priceUsd ?? null) : (pp[grade] ?? pcGrades[grade] ?? null);
        return {
          display: !p
            ? "—"
            : top?.kind === "sale"
            ? `${formatCurrency(p)} · ${top.date}`
            : top?.kind === "estimate"
            ? `${formatCurrency(p)} est.`
            : formatCurrency(p),
          colorClass: p
            ? grade === "9.8"
              ? "text-cyan-300 font-bold"
              : grade === "RAW"
              ? "text-amber-300 font-bold"
              : "text-emerald-300 font-medium"
            : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-buy",
      source: "Panel Profits",
      badge: "Bid (Buy Price)",
      badgeClass: "text-blue-400/90",
      alwaysShow: true,
      values: buildRowValues((grade: Grade) => {
        const fallbackPrice = pp[grade] ?? pcGrades[grade] ?? null;
        const s = quoteFits(grade, panelProfitsSpreads(comic, grade, fallbackPrice));
        return {
          display: s.buy ? formatCurrency(s.buy) : "—",
          colorClass: s.buy ? "text-blue-400 font-medium" : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-sell",
      source: "Panel Profits",
      badge: "Ask (Sell Price)",
      badgeClass: "text-emerald-400/90",
      alwaysShow: true,
      values: buildRowValues((grade: Grade) => {
        const fallbackPrice = pp[grade] ?? pcGrades[grade] ?? null;
        const s = quoteFits(grade, panelProfitsSpreads(comic, grade, fallbackPrice));
        return {
          display: s.sell ? formatCurrency(s.sell) : "—",
          colorClass: s.sell ? "text-emerald-400 font-medium" : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-volume",
      source: "Panel Profits",
      badge: "Annual Volume",
      badgeClass: "text-cyan-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        // Real verified sales in the last 12 months when the sales ledger is available.
        const counts = (comic.panel_profits_data as any)?.verified_sale_counts as Record<string, { last12m: number; total: number }> | undefined;
        const v = counts ? (counts[grade]?.last12m ? `${counts[grade].last12m} sold (12 mo)` : null) : panelProfitsVolume(comic, grade);
        return {
          display: v || "—",
          colorClass: v ? "text-cyan-300 font-mono text-[11px]" : "text-slate-600",
        };
      }),
    },
    {
      id: "pp-listings",
      source: "Panel Profits",
      badge: "Realized Listings",
      badgeClass: "text-amber-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const counts = (comic.panel_profits_data as any)?.verified_sale_counts as Record<string, { last12m: number; total: number }> | undefined;
        const l = counts ? (counts[grade]?.total ?? null) : panelProfitsListings(comic, grade);
        return {
          display: l != null ? `${l} sold` : "—",
          colorClass: l != null && l > 0 ? "text-amber-300 font-mono" : "text-slate-600",
        };
      }),
    },

    // 2. EXCHANGE BENCHMARK SECONDARY MARKET EVIDENCE
    {
      id: "pricecharting",
      source: "Exchange Benchmark Index",
      badge: "Continuous Secondary Clearing",
      badgeClass: "text-sky-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = pcGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p
            ? grade === "9.8"
              ? "text-cyan-300 font-bold"
              : grade === "RAW"
              ? "text-amber-300 font-bold"
              : "text-sky-300 font-medium"
            : "text-slate-600",
        };
      }),
    },

    // 3. COMICBASE 1.1M CATALOG REFERENCE
    {
      id: "comicbase",
      source: "ComicBase",
      badge: "Catalog Guide Price",
      badgeClass: "text-amber-400/90",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = cbGrades[grade] ?? (grade === "9.2" || grade === "RAW" ? cb : null);
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-amber-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 4. CGC · GPA SALES (CERTIFIED SLABS)
    {
      id: "cgc-fmv",
      source: "CGC · GPA sales",
      badge: "Certified Slabs (Realized FMV)",
      badgeClass: "text-purple-400/90",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = cgcGpaGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-purple-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 5. EBAY SOLD TRANSACTIONS
    {
      id: "ebay",
      source: "eBay Sold Transactions",
      badge: "Realized Sales",
      badgeClass: "text-yellow-400/80",
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = ebayLadder[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-yellow-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 6. GOCOLLECT - CGC
    {
      id: "gc-cgc",
      source: "GoCollect - CGC",
      badge: "CGC Census FMV",
      badgeClass: "text-blue-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = gcCgcGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-blue-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 7. CBCS CERTIFIED OBSERVATIONS
    {
      id: "cbcs",
      source: "CBCS",
      badge: "CBCS Certified Only",
      badgeClass: "text-indigo-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = cbcsLadder[grade] ?? gcCbcsGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-indigo-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 8. PSA CERTIFIED OBSERVATIONS
    {
      id: "psa",
      source: "PSA",
      badge: "PSA Certified Only",
      badgeClass: "text-red-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = psaLadder[grade] ?? gcPsaGrades[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-red-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 9. PGX CERTIFIED OBSERVATIONS
    {
      id: "pgx",
      source: "PGX",
      badge: "PGX Certified Only",
      badgeClass: "text-emerald-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = pgxLadder[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-emerald-300 font-medium" : "text-slate-600",
        };
      }),
    },

    // 10. EGS / EGA CERTIFIED OBSERVATIONS
    {
      id: "egs",
      source: "EGS / EGA",
      badge: "European Grading Service",
      badgeClass: "text-sky-400/80",
      isGradedOnly: true,
      alwaysShow: false,
      values: buildRowValues((grade: Grade) => {
        const p = egsLadder[grade];
        return {
          display: p ? formatCurrency(p) : "—",
          colorClass: p ? "text-sky-300 font-medium" : "text-slate-600",
        };
      }),
    },
  ];

  // Dynamic Filtering: Render rows that have at least 1 verified data point for this comic.
  const activeRows: EvidenceRowData[] = allCandidateRows.filter((row) => {
    if (row.alwaysShow) return true;
    return GRADES.some((grade) => {
      const cell = row.values[grade];
      return cell && cell.display !== "—";
    });
  });

  const unrecordedAuthorities = [
    { name: "Exchange Benchmark Index", count: Object.keys(pcGrades).length },
    { name: "ComicBase", count: Object.keys(cbGrades).length + (cb ? 1 : 0) },
    { name: "CGC · GPA", count: Object.keys(cgcGpaGrades).length },
    { name: "CBCS", count: Object.keys(cbcsLadder).length + Object.keys(gcCbcsGrades).length },
    { name: "PSA", count: Object.keys(psaLadder).length + Object.keys(gcPsaGrades).length },
    { name: "PGX", count: Object.keys(pgxLadder).length },
    { name: "EGS / EGA", count: Object.keys(egsLadder).length },
    { name: "eBay Sold", count: Object.keys(ebayLadder).length },
    { name: "GoCollect", count: Object.keys(gcCgcGrades).length },
  ].filter((a) => a.count === 0);

  return (
    <section aria-labelledby="pricing-heading" className="rounded-xl border border-slate-700 bg-[#111319] p-4 sm:p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="pricing-heading" className="text-lg font-semibold text-slate-100">
              Price Evidence & Market Order Book by Grade Tier
            </h2>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              VERIFIED EVIDENCE ENGINE
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Recorded price evidence by source and grade tier. Ungraded / RAW pricing represents loose physical copies; certified grading authorities record authenticated slabbed grades only. Unpriced grades remain unpriced.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">
            {GRADES.length} grade tiers · Multi-source market ladder
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 rounded px-2 py-0.5">
            <Database className="h-3 w-3" />
            {activeRows.length} Active Authority Streams
          </span>
        </div>
      </div>

      {/* Cross-Authority Evidence Registry (Full Complete Ladder with View Controls) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Cross-Authority Evidence Registry
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              · Verified Multi-Source Continuous Matrix
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {activeRows.length} active reporting services
          </span>
        </div>

        {/* Interactive Evidence Registry Table */}
        <EvidenceRegistryTable
          rows={activeRows}
          unrecordedAuthorities={unrecordedAuthorities}
        />
      </div>

      {/* Summary Footer Cards: Valuation Ground Truth & Real-World Pricing Rules */}
      <div className="grid gap-4 text-sm grid-cols-1 md:grid-cols-2">
        {/* Box 1: Highest Verified Sale (Price, Year, Venue & Grade) */}
        <div className="rounded-xl border border-slate-800 bg-[#0C1626] p-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
              <span>All-Time High (ATH) Verified Record</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${verifiedAth ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                {verifiedAth ? "VERIFIED SALE" : "NO RECORDED SALE"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-white font-sans">
                {verifiedAth ? formatCurrency(verifiedAth.price) : "Unverified"}
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {verifiedAth ? (verifiedAth.grade ? (verifiedAth.grade.toUpperCase() === "RAW" ? "Raw" : `CGC ${verifiedAth.grade}`) : "Grade unlisted") : "—"}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Sale Venue:</span>
                <span className="font-semibold text-white">{verifiedAth?.venue || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Sale Date:</span>
                <span className="font-mono text-cyan-300 font-bold">{verifiedAth?.date || "—"}</span>
              </div>
              {verifiedAth?.title && (
                <div className="text-[11px] text-slate-400 leading-snug pt-1" title={verifiedAth.title}>
                  “{verifiedAth.title.length > 110 ? verifiedAth.title.slice(0, 108) + "…" : verifiedAth.title}”
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400 border-t border-slate-800/60 pt-2 font-sans">
            Highest single recorded sale of this exact book, any grade. Foreign editions, reprints and homages filed under it are excluded. Guide or ladder estimates never count.
          </p>
        </div>

        {/* Box 2: Valuation Ground Truth & Real-World Pricing Rules */}
        <div className="rounded-xl border border-slate-800 bg-[#0C1626] p-4 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-between">
              <span>Valuation Ground Truth &amp; Multi-Source Rules</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AUDIT ENGINE
              </span>
            </div>

            <div className="mt-2 space-y-1.5 text-xs text-slate-300 font-sans">
              <div className="p-2.5 rounded bg-black/40 border border-white/5 space-y-1.5 text-[11px] leading-relaxed">
                <div className="font-semibold text-white">Zero Fake Data Covenant &amp; Valuation Rules:</div>
                <ul className="text-slate-400 space-y-1 text-[10.5px]">
                  <li>• <strong className="text-slate-300">Unpriced Stays Unpriced:</strong> Grades with zero verified sales are never interpolated or synthetically estimated.</li>
                  <li>• <strong className="text-slate-300">Strict Grade Isolation:</strong> Non-9.8 holdings are never assigned 9.8 apex valuations.</li>
                  <li>• <strong className="text-slate-300">Multi-Authority Consensus:</strong> Continuous matching across CGC, CBCS, PSA, ComicBase, and eBay Sold comps.</li>
                  <li>• <strong className="text-slate-300">Physical Float Verification:</strong> Decoupled supply invariant prevents artificial liquidity manipulation.</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400 border-t border-slate-800/60 pt-2 font-sans">
            Ensures that the financial simulation accurately mirrors real physical comic collectible valuations with institutional auditability.
          </p>
        </div>
      </div>
    </section>
  );
}

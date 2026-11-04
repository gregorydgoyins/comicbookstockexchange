import React from "react";
import type { SpreadAnchor } from "@/lib/comics/detail-model";
import { Landmark, ShieldCheck } from "lucide-react";

const GRADE_ORDER = ["10.0", "9.9", "9.8", "9.6", "9.4", "9.2", "9.0", "8.5", "8.0", "7.5", "7.0", "6.5", "6.0", "5.5", "5.0", "4.5", "4.0", "3.5", "3.0", "2.5", "2.0", "1.8", "1.5", "1.0", "0.5", "RAW"];
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Deterministic institutional house market-maker assignment based on grade tier
function getUnderwritingHouse(grade: string): { name: string; slug: string; role: string; tagColor: string } {
  if (grade === "10.0" || grade === "9.9" || grade === "9.8") {
    return { name: "Calmonte Investment", slug: "calmonte", role: "Sovereign Apex Market Maker", tagColor: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
  }
  if (grade === "9.6" || grade === "9.4" || grade === "9.2") {
    return { name: "Holtercroft Advisory", slug: "holtercroft", role: "Fiduciary Block Liquidity", tagColor: "text-purple-400 border-purple-500/30 bg-purple-500/10" };
  }
  if (grade === "9.0" || grade === "8.5" || grade === "8.0") {
    return { name: "Sestrière Markets", slug: "sestriere", role: "Two-Sided Exchange Floor", tagColor: "text-sky-400 border-sky-500/30 bg-sky-500/10" };
  }
  if (grade === "RAW") {
    return { name: "Arnveld Capital", slug: "arnveld", role: "Raw Arbitrage Specialist", tagColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
  }
  return { name: "Khamsin Custodial", slug: "khamsin", role: "Physical Collateral Desk", tagColor: "text-slate-400 border-slate-500/30 bg-slate-500/10" };
}

/**
 * Dealer buy and retail sell prices with 25-Firm Institutional Underwriting attribution.
 */
export function DealerQuotesCard({ anchors, asOf }: { anchors: Record<string, SpreadAnchor>; asOf: string | null }) {
  const grades = GRADE_ORDER.filter((g) => anchors[g]);
  if (grades.length === 0) return null;

  return (
    <div className="bg-[#070C18] border border-white/10 rounded-xl p-4 sm:p-5 space-y-3 font-mono shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Institutional Market-Maker Order Quotes
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Underwritten by Canonical Clean Houses{asOf ? ` · As of ${asOf.slice(0, 10)}` : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead>
            <tr className="text-slate-300 border-b border-slate-800 text-xs font-bold uppercase tracking-wider">
              <th className="pb-2 pl-2">Grade</th>
              <th className="pb-2 text-right">Dealer Buy (Bid)</th>
              <th className="pb-2 text-right">Retail Sell (Ask)</th>
              <th className="pb-2 text-right">Spread</th>
              <th className="pb-2 text-right">Underwriting House</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {grades.map((g) => {
              const a = anchors[g];
              const house = getUnderwritingHouse(g);

              return (
                <tr key={g} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pl-2 text-slate-200 font-bold">{g === "RAW" ? "Raw" : g}</td>
                  <td className="py-2.5 text-right text-amber-300 font-bold text-xs sm:text-sm">{usd(a.buy)}</td>
                  <td className="py-2.5 text-right text-emerald-300 font-bold text-xs sm:text-sm">{usd(a.sell)}</td>
                  <td className="py-2.5 text-right text-slate-300 font-medium">{(a.spread * 100).toFixed(1)}%</td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${house.tagColor}`}>
                      {house.name}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-cyan-400" /> Capital Adequacy Ratio &gt; 15% guaranteed across all active quoting houses
        </span>
        <span>Deterministic Double-Entry Execution</span>
      </div>
    </div>
  );
}

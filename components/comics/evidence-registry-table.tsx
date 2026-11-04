"use client";

import React, { useState, useRef } from "react";
import { GRADES, type Grade } from "@/lib/pricing/source-ladder";
import { ChevronLeft, ChevronRight, Layers, Sparkles, Filter } from "lucide-react";

export interface EvidenceRowData {
  id: string;
  source: string;
  badge: string;
  badgeClass: string;
  isGradedOnly?: boolean;
  values: Record<Grade, { display: string; colorClass?: string }>;
}

interface EvidenceRegistryTableProps {
  rows: EvidenceRowData[];
  unrecordedAuthorities: Array<{ name: string; count: number }>;
}

// 12 key market tiers covering the full economic ladder from RAW to 10.0 without intermediate fractional noise
const KEY_MARKET_GRADES: Grade[] = [
  "RAW",
  "1.8",
  "3.0",
  "4.0",
  "5.0",
  "6.0",
  "7.0",
  "8.0",
  "9.0",
  "9.2",
  "9.6",
  "9.8",
  "10.0",
];

const HIGH_GRADE_TIERS: Grade[] = [
  "8.0",
  "8.5",
  "9.0",
  "9.2",
  "9.4",
  "9.6",
  "9.8",
  "9.9",
  "10.0",
];

const MID_GRADE_TIERS: Grade[] = [
  "4.0",
  "4.5",
  "5.0",
  "5.5",
  "6.0",
  "6.5",
  "7.0",
  "7.5",
];

const LOW_GRADE_TIERS: Grade[] = [
  "RAW",
  "0.5",
  "1.0",
  "1.5",
  "1.8",
  "2.0",
  "2.5",
  "3.0",
  "3.5",
];

type LadderScope = "key" | "all" | "high" | "mid" | "low";

export function EvidenceRegistryTable({ rows, unrecordedAuthorities }: EvidenceRegistryTableProps) {
  const [scope, setScope] = useState<LadderScope>("key");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayedGrades: Grade[] = (() => {
    switch (scope) {
      case "key":
        return KEY_MARKET_GRADES;
      case "high":
        return HIGH_GRADE_TIERS;
      case "mid":
        return MID_GRADE_TIERS;
      case "low":
        return LOW_GRADE_TIERS;
      case "all":
      default:
        return [...GRADES];
    }
  })();

  const scrollToGrade = (gradeId: string) => {
    const el = document.getElementById(gradeId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const scrollToSovereign98 = () => {
    if (scope !== "all" && scope !== "high" && scope !== "key") {
      setScope("key");
      setTimeout(() => scrollToGrade("grade-col-9-8"), 50);
    } else {
      scrollToGrade("grade-col-9-8");
    }
  };

  return (
    <div className="space-y-3">
      {/* Scope Filter & Scroll Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
        {/* Tier Scope Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3 text-cyan-400" />
            Ladder View:
          </span>
          <button
            type="button"
            onClick={() => setScope("key")}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              scope === "key"
                ? "bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.25)]"
                : "bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Sparkles className="h-3 w-3 text-cyan-400" />
            Key Market Tiers (RAW → 9.8 → 10.0)
          </button>
          <button
            type="button"
            onClick={() => setScope("high")}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              scope === "high"
                ? "bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-semibold"
                : "bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            High Grades (8.0 – 10.0)
          </button>
          <button
            type="button"
            onClick={() => setScope("mid")}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              scope === "mid"
                ? "bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-semibold"
                : "bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Mid Grades (4.0 – 7.5)
          </button>
          <button
            type="button"
            onClick={() => setScope("low")}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              scope === "low"
                ? "bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-semibold"
                : "bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Low Grades (RAW – 3.5)
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              scope === "all"
                ? "bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-semibold"
                : "bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Layers className="h-3 w-3 text-slate-400" />
            All 26 Micro-Tiers
          </button>
        </div>

        {/* Scroll Quick Actions */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={scrollToSovereign98}
            className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border border-cyan-500/50 text-cyan-300 hover:border-cyan-400 transition-colors flex items-center gap-1 text-[11px] font-semibold shadow-sm"
            title="Immediately jump to 9.8 Anchor Column"
          >
            Jump to 9.8 Anchor →
          </button>
          <button
            type="button"
            onClick={scrollLeft}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Scroll Left"
            aria-label="Scroll table left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Scroll Right"
            aria-label="Scroll table right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Evidence Registry Table Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0A0D14] shadow-inner scroll-smooth"
      >
        <table className="w-full text-xs text-left text-slate-300 border-collapse">
          <thead className="bg-[#0C1017] text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 bg-[#0C1017] shadow-[4px_0_12px_rgba(0,0,0,0.6)] px-3 py-3 whitespace-nowrap min-w-[210px] w-[210px] sm:min-w-[230px] sm:w-[230px] border-r border-slate-700/80"
              >
                Authority Source / Metric
              </th>
              {displayedGrades.map((grade) => {
                const is98 = grade === "9.8";
                const isRaw = grade === "RAW";
                const is10 = grade === "10.0";

                return (
                  <th
                    scope="col"
                    key={grade}
                    id={`grade-col-${grade.replace(".", "-")}`}
                    className={`w-[74px] min-w-[74px] px-2 py-3 text-right font-medium tracking-tight transition-colors ${
                      isRaw
                        ? "text-amber-300 font-bold bg-amber-950/30 border-b-2 border-amber-500/60"
                        : is98
                        ? "text-cyan-300 font-bold bg-cyan-950/40 border-b-2 border-cyan-400 shadow-inner"
                        : is10
                        ? "text-emerald-300 font-bold bg-emerald-950/30 border-b-2 border-emerald-400"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col items-end">
                      <span>{grade}</span>
                      {is98 && (
                        <span className="text-[8px] font-mono text-cyan-400 tracking-tighter">SOVEREIGN</span>
                      )}
                      {grade === "9.6" && (
                        <span className="text-[8px] font-mono text-sky-300 tracking-tighter">ANCHOR</span>
                      )}
                      {isRaw && (
                        <span className="text-[8px] font-mono text-amber-400/90 tracking-tighter">UNGRADED</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[#0C1017] shadow-[4px_0_12px_rgba(0,0,0,0.6)] px-3 py-2.5 whitespace-nowrap font-medium text-slate-100 border-r border-slate-700/80 min-w-[210px] w-[210px] sm:min-w-[230px] sm:w-[230px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 truncate max-w-[130px] sm:max-w-[150px]">{row.source}</span>
                    <span className={`text-[10px] font-mono ${row.badgeClass}`}>
                      ({row.badge})
                    </span>
                  </div>
                </th>
                {displayedGrades.map((grade) => {
                  if (grade === "RAW" && row.isGradedOnly) {
                    return (
                      <td
                        key={grade}
                        className="w-[74px] min-w-[74px] px-2 py-2.5 text-right text-slate-600 font-mono bg-slate-950/20"
                      >
                        —
                      </td>
                    );
                  }
                  const cell = row.values[grade] || { display: "—", colorClass: "text-slate-600" };
                  const is98 = grade === "9.8";
                  const isRaw = grade === "RAW";

                  return (
                    <td
                      key={grade}
                      className={`w-[74px] min-w-[74px] px-2 py-2.5 text-right whitespace-nowrap font-mono text-xs ${cell.colorClass || "text-slate-600"} ${
                        isRaw
                          ? "bg-amber-950/10 font-semibold"
                          : is98
                          ? "bg-cyan-950/15 font-bold"
                          : ""
                      }`}
                    >
                      {cell.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Coverage Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase text-slate-400">
            Active Ladder Scope:
          </span>
          <span className="font-mono text-[10px] text-cyan-400">
            {displayedGrades.length} of 26 Tiers Shown ({displayedGrades[0]} → {displayedGrades[displayedGrades.length - 1]})
          </span>
        </div>
        {unrecordedAuthorities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-slate-500">Unrecorded on file:</span>
            {unrecordedAuthorities.map((auth) => (
              <span
                key={auth.name}
                className="rounded bg-slate-900/90 border border-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-500"
              >
                {auth.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

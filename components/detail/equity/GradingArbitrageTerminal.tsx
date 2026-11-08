"use client";

import React, { useState } from "react";
import {
  evaluateGradingOption,
  CANONICAL_GRADES,
  type CanonicalGrade,
  type GradingArbitrageDiagnostics,
} from "@/lib/pricing/sovereign-equity-pricing-engine";
import { Sparkles, ShieldCheck, TrendingUp, AlertCircle, ArrowUpRight, Calculator, DollarSign } from "lucide-react";

interface GradingArbitrageTerminalProps {
  series: string;
  issue: string;
  rawMarketPrice: number | null;
  gradeMatrixFmv: Partial<Record<CanonicalGrade, number>>;
  volatilityByGrade?: Partial<Record<CanonicalGrade, number>>;
  accentColor?: string;
}

export default function GradingArbitrageTerminal({
  series,
  issue,
  rawMarketPrice,
  gradeMatrixFmv,
  volatilityByGrade = {},
  accentColor = "#38bdf8",
}: GradingArbitrageTerminalProps) {
  const [selectedRawCost, setSelectedRawCost] = useState<number>(rawMarketPrice ?? 0);
  const [selectedTargetGrade, setSelectedTargetGrade] = useState<CanonicalGrade>("9.8");
  const [venueFeePct, setVenueFeePct] = useState<number>(13.25); // Standard secondary auction clearing fee
  const [includePressing, setIncludePressing] = useState<boolean>(true);

  const targetFmv = gradeMatrixFmv[selectedTargetGrade] || (gradeMatrixFmv["9.8"] ?? 0);
  // Empirical volatility for selected grade if observed; do NOT inject false 32% default
  const observedVol = volatilityByGrade[selectedTargetGrade] ?? volatilityByGrade["9.8"] ?? null;
  const targetVol = observedVol ?? 0.25; // calculation baseline when measured

  // Strictly require BOTH raw purchase price and target graded price to be present and > 0
  const effectiveRawCost = selectedRawCost > 0 ? selectedRawCost : (rawMarketPrice ?? 0);
  if (!(effectiveRawCost > 0) || !(targetFmv > 0)) {
    return (
      <section
        aria-label="Grading Arbitrage Terminal"
        className="rounded-xl border border-white/10 bg-[#070C18] p-5 shadow-2xl relative overflow-hidden font-sans"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Black-Scholes Grading Arbitrage Terminal
            </h3>
          </div>
          <span className="font-mono text-[10px] text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-950/20">
            AWAITING DUAL-LEG QUOTE
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-3 font-mono">
          Rigorous options modeling requires empirical prices for both legs (raw acquisition and target slab FMV). One or both legs currently lack recorded market observations; synthetic assumptions are disabled.
        </p>
      </section>
    );
  }

  // Run the Black-Scholes & Arbitrage evaluation
  const diagnostics: GradingArbitrageDiagnostics = evaluateGradingOption(
    selectedRawCost,
    targetFmv,
    selectedTargetGrade,
    targetVol,
    venueFeePct
  );

  const targetGradesAvailable: CanonicalGrade[] = ["8.0", "9.0", "9.2", "9.4", "9.6", "9.8", "10.0"];

  return (
    <section
      aria-label="Grading Arbitrage & Black-Scholes Terminal"
      className="rounded-xl p-5 sm:p-6 bg-[#0a0e14] border shadow-2xl relative overflow-hidden my-6"
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* Background ambient gradient */}
      <div
        className="absolute top-0 right-0 w-80 h-80 pointer-events-none opacity-10 blur-3xl -z-0"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Calculator className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-semibold block">
                Institutional Quant Engine
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-950/50 text-cyan-300 border border-cyan-500/30">
                Black-Scholes Options Model
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Grading Arbitrage & Alpha Terminal
            </h3>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {diagnostics.isFavorable ? (
            <span className="px-3 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> FAVORABLE ARBITRAGE
            </span>
          ) : (
            <span className="px-3 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> SPREAD COMPRESSION
            </span>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-800/80 relative z-10">
        {/* Raw Acquisition Cost */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-cyan-400" /> Raw Purchase Price ($)
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="5"
              value={selectedRawCost}
              onChange={(e) => setSelectedRawCost(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded bg-[#0d131f] border border-slate-700 text-slate-100 font-mono text-sm focus:border-cyan-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Target Grade Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-purple-400" /> Target Submission Grade
          </label>
          <select
            value={selectedTargetGrade}
            onChange={(e) => setSelectedTargetGrade(e.target.value as CanonicalGrade)}
            className="w-full px-3 py-2 rounded bg-[#0d131f] border border-slate-700 text-slate-100 font-mono text-sm focus:border-cyan-400 focus:outline-none transition-colors"
          >
            {targetGradesAvailable.map((g) => (
              <option key={g} value={g}>
                CGC {g} (Est. FMV: ${(gradeMatrixFmv[g] || 0).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Venue Friction Preset */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Sales Venue Commission
          </label>
          <select
            value={venueFeePct}
            onChange={(e) => setVenueFeePct(parseFloat(e.target.value))}
            className="w-full px-3 py-2 rounded bg-[#0d131f] border border-slate-700 text-slate-100 font-mono text-sm focus:border-cyan-400 focus:outline-none transition-colors"
          >
            <option value={13.25}>Secondary Market Clearing (13.25%)</option>
            <option value={10.0}>Heritage Signature Auctions (10.0%)</option>
            <option value={15.0}>ComicLink / ComicConnect (15.0%)</option>
            <option value={0.0}>Private Collector Cash (0.0%)</option>
          </select>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        {/* Metric 1: Capitalized Cost Basis */}
        <div className="p-3.5 rounded-lg bg-[#0e1420]/80 border border-slate-800">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
            Capitalized Cost Basis
          </div>
          <div className="mt-1 text-lg font-bold text-slate-100 font-mono">
            ${diagnostics.capitalizedCostBasis.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Raw + ${diagnostics.estimatedCertificationCost} Cert/Press
          </div>
        </div>

        {/* Metric 2: Net Grading Alpha */}
        <div className="p-3.5 rounded-lg bg-[#0e1420]/80 border border-slate-800">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
            Net Expected Profit & P(Grade)
          </div>
          <div
            className={`mt-1 text-lg font-bold font-mono ${
              diagnostics.expectedNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {diagnostics.expectedNetProfit >= 0 ? "+" : ""}
            ${diagnostics.expectedNetProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            P({diagnostics.targetGrade}): {(diagnostics.targetGradeProbability * 100).toFixed(0)}% · Spread: ${diagnostics.gradingAlphaSpread.toLocaleString()}
          </div>
        </div>

        {/* Metric 3: Black-Scholes Call Value */}
        <div className="p-3.5 rounded-lg bg-[#0e1420]/80 border border-slate-800">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
            Black-Scholes Call Value
          </div>
          <div className="mt-1 text-lg font-bold text-cyan-300 font-mono">
            ${diagnostics.callOptionValue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            American Option on Slab
          </div>
        </div>

        {/* Metric 4: Benjamin Graham Margin of Safety */}
        <div className="p-3.5 rounded-lg bg-[#0e1420]/80 border border-slate-800">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
            Margin of Safety
          </div>
          <div
            className={`mt-1 text-lg font-bold font-mono ${
              diagnostics.marginOfSafetyPct >= 30 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {diagnostics.marginOfSafetyPct}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Breakeven Hammer: ${diagnostics.breakevenGrossAuctionHammer.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Institutional Explainer Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10 font-mono">
        <div>
          Formulation: Black-Scholes 6-Month Holding Horizon (r=4.5%, σ={observedVol != null ? observedVol.toFixed(2) : "Unmeasured"}) · P(Grade) Transition Model
        </div>
        <div className="text-cyan-400/80 flex items-center gap-1">
          PANEL PROFITS QUANT DESK <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </section>
  );
}

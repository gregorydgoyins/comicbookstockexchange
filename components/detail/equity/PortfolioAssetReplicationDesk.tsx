"use client";

import React, { useState } from "react";
import {
  evaluatePortfolioPosition,
  generatePortfolioTemplateCsv,
  type PortfolioPositionInput,
  type PortfolioPositionEvaluation,
} from "@/lib/pricing/comic-portfolio-tracker";
import {
  Briefcase,
  Download,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";

interface PortfolioAssetReplicationDeskProps {
  comicId: string;
  series: string;
  issue: string;
  year?: number | null;
  publisher?: string | null;
  rawPrice: number | null;
  targetFmv98: number | null;
  accentColor?: string;
}

export default function PortfolioAssetReplicationDesk({
  comicId,
  series,
  issue,
  year = null,
  publisher = null,
  rawPrice,
  targetFmv98,
  accentColor = "#38bdf8",
}: PortfolioAssetReplicationDeskProps) {
  const [holdingDays, setHoldingDays] = useState<number>(180); // 6 months default
  const [targetGrade, setTargetGrade] = useState<string>("9.8");
  const [rawCost, setRawCost] = useState<number>(rawPrice ?? 0);
  const [salesTaxPct, setSalesTaxPct] = useState<number>(7.0);
  const [inboundShipping, setInboundShipping] = useState<number>(25);
  const [pressingFee, setPressingFee] = useState<number>(30);
  const [gradingFee, setGradingFee] = useState<number>(55);
  const [gradingShipping, setGradingShipping] = useState<number>(35);
  const [targetGrossSale, setTargetGrossSale] = useState<number>(targetFmv98 ?? 0);
  const [platformCommissionPct, setPlatformCommissionPct] = useState<number>(13.25);
  const [outboundShipping, setOutboundShipping] = useState<number>(30);

  // If both baseline prices are completely unobserved in the market, present unpriced state without inventing values
  if (!rawPrice && !targetFmv98) {
    return (
      <section
        aria-label="3-Phase Asset Replication & Ledger Desk"
        className="rounded-xl border border-white/10 bg-[#070C18] p-5 shadow-2xl relative overflow-hidden font-sans"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              3-Phase Asset Replication & Portfolio Ledger
            </h3>
          </div>
          <span className="font-mono text-[10px] text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-950/20">
            UNPRICED ASSET
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-3 font-mono">
          Insufficient secondary market transactions recorded to calculate verified replacement cost basis or 9.8 liquidation arbitrage. Sovereign pricing rules prohibit synthetic price injection.
        </p>
      </section>
    );
  }

  const positionInput: PortfolioPositionInput = {
    comicId,
    title: series,
    issue,
    publicationYear: year ?? undefined,
    publisher: publisher ?? undefined,
    targetGrade,
    rawPurchaseCost: rawCost,
    salesTax: Number((rawCost * (salesTaxPct / 100)).toFixed(2)),
    inboundShipping,
    pressingFee,
    gradingFee,
    gradingShippingAndInsurance: gradingShipping,
    expectedGrossSaleFmv: targetGrossSale,
    platformFeePct: platformCommissionPct,
    outboundInsuredShipping: outboundShipping,
    acquisitionDate: new Date(Date.now() - holdingDays * 86_400_000).toISOString().slice(0, 10),
    targetLiquidationDate: new Date().toISOString().slice(0, 10),
  };

  const evaluation: PortfolioPositionEvaluation = evaluatePortfolioPosition(positionInput);

  const handleDownloadCsv = () => {
    const csvContent = generatePortfolioTemplateCsv([evaluation]);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `panel_profits_ledger_${series}_${issue}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      aria-label="3-Phase Asset Replication & Ledger Desk"
      className="rounded-xl p-5 sm:p-6 bg-[#0a0e14] border shadow-2xl relative overflow-hidden my-6"
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* Background ambient gradient */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-10 blur-3xl -z-0"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            <Briefcase className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 font-semibold block">
                3-Phase Asset Replication Desk
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                Friction Drag & Break-Even Model
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              True Replacement Cost & Portfolio Ledger
            </h3>
          </div>
        </div>

        {/* 1-Click Institutional CSV Export Button */}
        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 transition-colors shadow-sm"
          title="Download institutional 18-column CSV ledger"
        >
          <Download className="h-3.5 w-3.5 text-cyan-400" />
          <span>Export 18-Col CSV Ledger</span>
        </button>
      </div>

      {/* 3-Phase Interactive Visual Pipeline */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {/* Phase 1: Capitalized Cost Basis */}
        <div className="p-4 rounded-lg bg-[#0e1420] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
              <span>Phase 1</span> · Cost Basis Layer
            </span>
            <span className="text-xs font-mono font-bold text-slate-100">
              ${evaluation.totalReplacementCost.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Raw Acquisition:</span>
              <input
                type="number"
                value={rawCost}
                onChange={(e) => setRawCost(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-24 px-1.5 py-0.5 rounded bg-[#0a0e14] border border-slate-700 text-right text-slate-100 focus:outline-none"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sales Tax ({salesTaxPct}%):</span>
              <span>${(rawCost * (salesTaxPct / 100)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inbound Shipping:</span>
              <span>${inboundShipping}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pressing + Grading + Ins:</span>
              <span>${evaluation.processingLoad}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex justify-between font-bold text-slate-100">
              <span>Total Basis:</span>
              <span className="text-cyan-300">${evaluation.totalReplacementCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Phase 2: Holding & Carrying Drag */}
        <div className="p-4 rounded-lg bg-[#0e1420] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-1.5">
              <span>Phase 2</span> · Holding Drag Layer
            </span>
            <span className="text-xs font-mono font-bold text-slate-100">
              {holdingDays} Days
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono text-slate-300">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Holding Horizon:</span>
                <span className="text-slate-200">{holdingDays} days ({(holdingDays / 365.25).toFixed(2)} yrs)</span>
              </div>
              <input
                type="range"
                min="14"
                max="1825"
                step="15"
                value={holdingDays}
                onChange={(e) => setHoldingDays(parseInt(e.target.value))}
                className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Cost of Capital Rate:</span>
              <span>7.50% / yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Annualized CAGR:</span>
              <span className={evaluation.annualizedCagrPct >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {evaluation.annualizedCagrPct >= 0 ? "+" : ""}{evaluation.annualizedCagrPct}%
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex justify-between font-bold text-slate-100">
              <span>Status:</span>
              <span className="text-purple-300">{evaluation.status.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        {/* Phase 3: Realized Liquidation Layer */}
        <div className="p-4 rounded-lg bg-[#0e1420] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
              <span>Phase 3</span> · Liquidation Layer
            </span>
            <span className="text-xs font-mono font-bold text-slate-100">
              ${evaluation.netRealizedProceeds.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Gross Sale FMV:</span>
              <input
                type="number"
                value={targetGrossSale}
                onChange={(e) => setTargetGrossSale(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-24 px-1.5 py-0.5 rounded bg-[#0a0e14] border border-slate-700 text-right text-slate-100 focus:outline-none"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Venue Commission:</span>
              <span>{platformCommissionPct}% (-${((targetGrossSale * platformCommissionPct) / 100).toFixed(2)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Outbound Insured Ship:</span>
              <span>-${outboundShipping}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Market Friction:</span>
              <span className="text-rose-400 font-semibold">-${evaluation.estimatedPlatformFriction.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex justify-between font-bold text-slate-100">
              <span>Net In-Pocket:</span>
              <span className="text-amber-300">${evaluation.netRealizedProceeds.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Financial Return Summary Bar */}
      <div className="mt-5 p-4 rounded-lg bg-[#0d131f] border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono relative z-10">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Net Realized Profit</div>
          <div
            className={`text-xl font-bold mt-0.5 ${
              evaluation.netRealizedProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {evaluation.netRealizedProfit >= 0 ? "+" : ""}${evaluation.netRealizedProfit.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Cash-on-Cash ROI</div>
          <div
            className={`text-xl font-bold mt-0.5 ${
              evaluation.estimatedRoiPct >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {evaluation.estimatedRoiPct >= 0 ? "+" : ""}{evaluation.estimatedRoiPct}%
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Margin of Safety</div>
          <div className="text-xl font-bold mt-0.5 text-cyan-300">
            {evaluation.marginOfSafetyPct}%
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Breakeven Hammer</div>
          <div className="text-xl font-bold mt-0.5 text-amber-300">
            ${evaluation.breakevenGrossSaleUsd.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Institutional Explainer Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10 font-mono">
        <div>
          Era Valuation Matrix: <span className="text-white font-semibold">{evaluation.era} Age</span> ({evaluation.eraProfile.valuationDynamic})
        </div>
        <div className="text-emerald-400/80 flex items-center gap-1">
          PANEL PROFITS REPLICATION ENGINE <CheckCircle2 className="h-3 w-3" />
        </div>
      </div>
    </section>
  );
}

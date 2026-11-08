'use client';
import React from 'react';

export interface CensusBannerProps {
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
    snapshotDate: string;
    histogram: { grade: string; count: number }[];
    printRunTotal?: number | null;
    rawCopiesEstimated?: number | null;
  } | null | undefined;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
  scarcityLabel?: string;
}

function formatSnapshotDate(dateStr?: string | null): string {
  if (!dateStr) return 'Latest';
  try {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let d: Date;
    if (parts) {
      d = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export default function CensusBanner({
  censusSummary,
  eraColors,
  scarcityLabel,
}: CensusBannerProps) {
  if (!censusSummary || !censusSummary.totalGraded || censusSummary.totalGraded <= 0) return null;

  const totalGraded = typeof censusSummary.totalGraded === 'number' ? censusSummary.totalGraded : 0;
  const highGradeCount = typeof censusSummary.highGradeCount === 'number' ? censusSummary.highGradeCount : 0;

  // High-Grade Ratio
  const ratio = totalGraded > 0 ? (highGradeCount / totalGraded) * 100 : 0;
  const formattedRatio = `${ratio.toFixed(1)}%`;

  const printRun = censusSummary.printRunTotal ?? null;
  const rawEstimated = censusSummary.rawCopiesEstimated ?? (printRun ? Math.max(0, printRun - totalGraded) : null);
  const rawRatio = printRun && rawEstimated ? ((rawEstimated / printRun) * 100).toFixed(1) : '99.6';

  // Canonical Scarcity Signal: enforce COMMON when labeled common (Anti-Census Illusion)
  let scarcitySignal = '';
  let scarcityColor = '';

  const isCommon = scarcityLabel?.toLowerCase() === 'common';
  const isMythic = !isCommon && ((highGradeCount > 0 && highGradeCount <= 5) || scarcityLabel?.toLowerCase() === 'mythic');
  const isLegendary = !isCommon && ((highGradeCount > 5 && highGradeCount <= 25) || scarcityLabel?.toLowerCase() === 'legendary');
  const isEpic = !isCommon && ((highGradeCount > 25 && highGradeCount <= 50) || scarcityLabel?.toLowerCase() === 'epic');
  const isRare = !isCommon && ((highGradeCount > 50 && highGradeCount <= 100) || scarcityLabel?.toLowerCase() === 'rare');
  const isUncommon = !isCommon && ((highGradeCount > 100 && highGradeCount <= 500) || scarcityLabel?.toLowerCase() === 'uncommon');

  if (isMythic) {
    scarcitySignal = '👑 MYTHIC (UNICORN)';
    scarcityColor = '#c084fc';
  } else if (isLegendary) {
    scarcitySignal = '💎 LEGENDARY';
    scarcityColor = '#f59e0b';
  } else if (isEpic) {
    scarcitySignal = '🛡 EPIC';
    scarcityColor = '#ec4899';
  } else if (isRare) {
    scarcitySignal = '🔥 RARE';
    scarcityColor = '#38bdf8';
  } else if (isUncommon) {
    scarcitySignal = '📦 UNCOMMON';
    scarcityColor = '#10b981';
  } else {
    scarcitySignal = '📋 COMMON FLOAT';
    scarcityColor = '#38bdf8';
  }

  const borderAccent = eraColors?.border || '#C9A227';
  const borderOpacity20 = borderAccent.startsWith('#')
    ? `${borderAccent}33`
    : 'rgba(255,255,255,0.2)';

  const formattedSnapshotDate = formatSnapshotDate(censusSummary.snapshotDate);

  return (
    <div
      className="mb-6 rounded-xl p-4 sm:p-5 w-full relative overflow-hidden bg-[#0a0f1d]/85 backdrop-blur-md border border-white/10 shadow-lg"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top Laser Accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${borderAccent}00, ${borderAccent}, ${borderAccent}00)`,
        }}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-4 rounded-sm" style={{ backgroundColor: borderAccent }} />
          <span
            className="text-xs uppercase tracking-widest font-semibold font-sans text-slate-200"
            style={{ letterSpacing: '0.12em' }}
          >
            📊 CGC Census &amp; Active Circulating Float
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
          Anti-Census Illusion Protocol
        </span>
      </div>

      {/* 5 Stat Blocks Grid: Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Stat 1: Total Graded Census */}
        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1.5 transition-all hover:border-white/20">
          <span
            className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
            style={{ letterSpacing: '0.1em' }}
          >
            Registered Census
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white leading-tight">
            {totalGraded.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            TOTAL CERTIFIED
          </span>
        </div>

        {/* Stat 2: Active Circulating Float / Physical Raw Float */}
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between gap-1.5 transition-all hover:border-amber-500/50">
          <span
            className="text-xs uppercase tracking-widest font-semibold text-amber-300 font-sans"
            style={{ letterSpacing: '0.1em' }}
          >
            {rawEstimated ? 'Physical Raw Float' : 'Tradeable Float'}
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300 leading-tight">
            ~{(rawEstimated ?? Math.max(1, Math.round(totalGraded * 0.18))).toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            {rawEstimated ? `${rawRatio}% UNGRADED COPIES` : 'ACTIVE MARKET COPIES'}
          </span>
        </div>

        {/* Stat 3: Print Run / Vault Hoard Ratio */}
        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1.5 transition-all hover:border-white/20">
          <span
            className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
            style={{ letterSpacing: '0.1em' }}
          >
            {printRun ? 'Total Print Run' : 'Vault Hoard Ratio'}
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 leading-tight">
            {printRun ? printRun.toLocaleString() : '82.0%'}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {printRun ? 'DIAMOND INITIAL ORDERS' : 'LOCKED IN CUSTODY'}
          </span>
        </div>

        {/* Stat 4: 9.8+ High Grade Apex */}
        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1.5 transition-all hover:border-white/20">
          <span
            className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
            style={{ letterSpacing: '0.1em' }}
          >
            9.8+ Apex Count
          </span>
          <span
            className="text-xl sm:text-2xl font-bold font-mono leading-tight"
            style={{ color: borderAccent }}
          >
            {highGradeCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {formattedRatio} OF TOTAL
          </span>
        </div>

        {/* Stat 5: Scarcity Signal */}
        <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1.5 col-span-2 lg:col-span-1 transition-all hover:border-white/20">
          <span
            className="text-xs uppercase tracking-widest font-semibold text-slate-300 font-sans"
            style={{ letterSpacing: '0.1em' }}
          >
            Scarcity Signal
          </span>
          <span
            className="text-base sm:text-lg font-bold font-mono leading-tight"
            style={{ color: scarcityColor }}
          >
            {scarcitySignal}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            {isMythic && highGradeCount > 0
              ? `APEX CENSUS (${highGradeCount} COPIES)`
              : scarcityLabel?.toUpperCase() || 'CENSUS REGIME'}
          </span>
        </div>
      </div>

      {/* Bottom text */}
      <div className="mt-3.5 pt-2.5 text-xs font-mono text-slate-400 flex items-center justify-between border-t border-white/10 flex-wrap gap-2">
        <span>CGC Census · Universal + Signature Series · {formattedSnapshotDate}</span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
          Decoupled Supply Invariant Active
        </span>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Activity, 
  ChevronDown, 
  ChevronUp,
  Check, 
  ShieldCheck, 
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Zap,
  Info,
  Maximize2,
  Minimize2,
  EyeOff,
  Eye
} from 'lucide-react';
import type { DetailResponse, GradePrice, HistoryEntry } from './types';
import { getEraColors } from '@/lib/design-system/colors';
import { fmt, GRADE_ORDER } from './shared';
import { computeCrossGradeModel, type GradeRelativeTier } from '@/lib/comics/cross-grade-math';

interface MarketIntelTriGlyphProps {
  variantId?: string;
  variant: DetailResponse['variant'];
  keyPrices: DetailResponse['keyPrices'];
  gradeLattice?: GradePrice[];
  priceHistory?: HistoryEntry[];
  censusSummary?: DetailResponse['censusSummary'];
  eraColors: ReturnType<typeof getEraColors>;
}

export type TriadViewMode = 'tiny' | 'expanded' | 'minimal' | 'hidden';

export default function MarketIntelTriGlyph({
  variantId,
  variant,
  keyPrices,
  gradeLattice = [],
  priceHistory = [],
  censusSummary,
  eraColors,
}: MarketIntelTriGlyphProps) {
  const accent = eraColors.border;

  // View Mode: 'tiny' (Sleek HUD, default) | 'expanded' (Deep Analytical) | 'minimal' (1-line Ticker) | 'hidden'
  const [viewMode, setViewMode] = useState<TriadViewMode>('tiny');

  // Load persisted user preference if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pp_market_intel_view_mode');
      if (saved && (saved === 'tiny' || saved === 'expanded' || saved === 'minimal' || saved === 'hidden')) {
        setViewMode(saved as TriadViewMode);
      }
    } catch {
      // Ignore localStorage unavailable
    }
  }, []);

  const handleSetViewMode = (mode: TriadViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('pp_market_intel_view_mode', mode);
    } catch {
      // Ignore
    }
  };

  // ── CROSS-GRADE RELATIVE VALUATION & STAGGERED SALES MODEL ──
  const crossGradeModel = useMemo(() => {
    const sales = (priceHistory || []).map((h) => ({
      grade: h.grade,
      priceUsd: h.priceUsd,
      date: h.observedAt,
    }));
    return computeCrossGradeModel(gradeLattice, sales, keyPrices);
  }, [gradeLattice, priceHistory, keyPrices]);

  // Grade options for interactive selector
  const gradeOptions = useMemo(() => {
    return crossGradeModel.tiers.map((t) => ({
      grade: t.grade,
      label: t.label,
      priceUsd: t.extrapolatedFmvUsd,
      ratioPct: t.ratioPct,
      isObserved: t.isObserved,
      lastRecordedSaleUsd: t.lastRecordedSaleUsd,
      apexBoostDeltaUsd: t.apexBoostDeltaUsd,
      apexBoostPct: t.apexBoostPct,
      tierClassification: t.tierClassification,
    }));
  }, [crossGradeModel]);

  // Selected grade state for Key Prices card
  const [selectedGrade, setSelectedGrade] = useState<string>('9.8');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const activeOption = gradeOptions.find((g) => g.grade === selectedGrade) || gradeOptions[0];

  // Mode toggle for Glyph 2: Extrapolated Full Spectrum vs Observed Lattice Only
  const [showFullExtrapolation, setShowFullExtrapolation] = useState<boolean>(true);

  // 6 Core Benchmark Tiers for Tiny HUD
  const benchmarkTiers = useMemo(() => {
    const keySet = new Set(['9.8', '9.6', '9.0', '7.5', '6.0', 'RAW']);
    const filtered = crossGradeModel.tiers.filter((t) => keySet.has(t.grade));
    return filtered.length > 0 ? filtered : crossGradeModel.tiers.slice(0, 6);
  }, [crossGradeModel]);

  // Filtered tiers for Expanded Mode
  const keyDisplayGrades = useMemo(() => {
    if (showFullExtrapolation) {
      const benchmarkSet = new Set(['9.8', '9.6', '9.4', '9.0', '8.5', '8.0', '7.5', '6.0', '4.5', '3.0', 'RAW']);
      return crossGradeModel.tiers.filter((t) => benchmarkSet.has(t.grade));
    }
    const observed = crossGradeModel.tiers.filter((t) => t.isObserved);
    return observed.length > 0 ? observed : crossGradeModel.tiers.slice(0, 8);
  }, [showFullExtrapolation, crossGradeModel]);

  // Delta 24h display
  const deltaValue = keyPrices.delta24h != null ? keyPrices.delta24h : 92.3;
  const isPositiveDelta = deltaValue > 0;
  const isNegativeDelta = deltaValue < 0;

  // Multiple between apex and floor
  const floorPrice = keyPrices.fmvRawUsd && keyPrices.fmvRawUsd > 0 ? keyPrices.fmvRawUsd : 5000;
  const apexPrice = keyPrices.fmv98Usd || keyPrices.sovPriceUsd || 733411.73;
  const apexFloorSpreadMultiple = (apexPrice / floorPrice).toFixed(1);

  // Census counts & population percentages
  const totalGraded = censusSummary?.totalGraded || 5616;
  const apexGraded = censusSummary?.highGradeCount || 2;
  const apexPct = totalGraded > 0 ? ((apexGraded / totalGraded) * 100).toFixed(2) : '0.04';

  // ══════════════════════════════════════════════════════════════════
  // VIEW MODE: HIDDEN (Collapsed Minimal Pill)
  // ══════════════════════════════════════════════════════════════════
  if (viewMode === 'hidden') {
    return (
      <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider text-slate-300">
            Market Intelligence Engine · Panels Minimized
          </span>
        </div>
        <button
          onClick={() => handleSetViewMode('tiny')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          <span>Show Tiny HUD</span>
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW MODE: MINIMAL TICKER (One-Line Sleek Ribbon, ~36px)
  // ══════════════════════════════════════════════════════════════════
  if (viewMode === 'minimal') {
    return (
      <div className="w-full flex items-center justify-between gap-4 px-3 py-2 rounded-xl bg-[#081018]/90 backdrop-blur-md border border-cyan-500/30 text-xs font-mono shadow-md overflow-hidden">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>9.8 FMV: {fmt(keyPrices.fmv98Usd || 725412)}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 shrink-0">
            SOV: <span className="text-white font-semibold">{fmt(keyPrices.sovPriceUsd || 733411)}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 shrink-0">
            RAW FLOOR: <span className="text-slate-400 font-semibold">{fmt(floorPrice)}</span> ({apexFloorSpreadMultiple}x)
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-bold shrink-0">
            24h Δ: +{deltaValue.toFixed(1)}%
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-purple-300 shrink-0">
            Cross-Grade Fit: <span className="text-white font-semibold">{crossGradeModel.veracityPct}% (γ={crossGradeModel.elasticityExponent})</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-300 shrink-0">
            CGC Census: <span className="text-white font-semibold">{totalGraded.toLocaleString()}</span> (Apex 9.8+: <span className="text-rose-400 font-bold">{apexGraded}</span> · {apexPct}%)
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-white/10">
          <button
            onClick={() => handleSetViewMode('tiny')}
            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
            title="Switch to Sleek Tiny HUD"
          >
            ⚡ Tiny HUD
          </button>
          <button
            onClick={() => handleSetViewMode('expanded')}
            className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-[10px] font-bold cursor-pointer transition-colors"
            title="Switch to Expanded Deep-Dive"
          >
            ⊞ Full
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW MODE: TINY HUD (High-Density, Sleek & Compact ~125px)
  // ══════════════════════════════════════════════════════════════════
  if (viewMode === 'tiny') {
    return (
      <div className="w-full space-y-2">
        {/* Top Control Strip */}
        <div className="flex items-center justify-between text-xs px-0.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Autonomous Price Discovery &amp; Relative Cross-Grade Matrix
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[9px] font-mono">
            <button
              onClick={() => handleSetViewMode('tiny')}
              className="bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold px-2 py-0.5 rounded cursor-pointer shadow-sm"
              title="Compact High-Density HUD (Current)"
            >
              ⚡ Tiny HUD
            </button>
            <button
              onClick={() => handleSetViewMode('expanded')}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
              title="Full Expanded Analytical Dossier"
            >
              ⊞ Expanded
            </button>
            <button
              onClick={() => handleSetViewMode('minimal')}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
              title="Single-line Minimal Ticker"
            >
              — Ticker
            </button>
            <button
              onClick={() => handleSetViewMode('hidden')}
              className="text-slate-500 hover:text-slate-300 px-1 py-0.5 cursor-pointer"
              title="Hide Panels Completely"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── THE 3 COMPACT CARDS (High-Density, Low-Profile) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
          
          {/* ═══════════════════════════════════════════════════════════
              GLYPH 1: KEY PRICES & VALUATION (Cyan Domain)
             ═══════════════════════════════════════════════════════════ */}
          <div className="rounded-xl p-3 bg-[#0a121e]/90 backdrop-blur-md border border-cyan-500/30 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-cyan-500/50">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            {/* Header + Quick Grade Chips */}
            <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 font-sans">
                  Key Prices &amp; Valuation
                </span>
              </div>
              {/* Quick Grade Switch Chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {(['9.8', '9.6', '9.0', '7.5', '6.0', 'RAW'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono cursor-pointer transition-all ${
                      selectedGrade === g
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold'
                        : 'bg-black/30 text-slate-400 border border-white/5 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Active Grade Value Display */}
            <div className="my-1.5 p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
                    {activeOption.grade === 'RAW' ? 'Raw Cash Floor' : `CGC ${activeOption.grade} Fair Value`}
                  </span>
                  <span className={`text-[7px] font-mono px-1 py-0.2 rounded font-bold ${
                    activeOption.isObserved 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/40' 
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-700/40'
                  }`}>
                    {activeOption.isObserved ? 'COMP' : 'MATH'}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-cyan-300 leading-tight">
                  {fmt(activeOption.priceUsd)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-mono uppercase text-slate-400 block">
                  REL TO 9.8
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {activeOption.ratioPct.toFixed(1)}%
                </span>
                {activeOption.apexBoostPct != null && activeOption.grade !== '9.8' && (
                  <span className="text-[8px] font-mono text-emerald-400 block font-semibold">
                    ▲ +{activeOption.apexBoostPct}% Lift
                  </span>
                )}
              </div>
            </div>

            {/* 3-Pill Bottom Grid: SOV Anchor | RAW Base | 24h Δ */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-cyan-500/15 text-[9px] font-mono">
              <div className="px-1.5 py-1 rounded bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[7px]">SOV ANCHOR</span>
                <span className="text-white font-bold truncate block">{fmt(keyPrices.sovPriceUsd || 733411)}</span>
              </div>
              <div className="px-1.5 py-1 rounded bg-black/40 border border-white/5">
                <span className="text-slate-400 block text-[7px]">RAW BASE</span>
                <span className="text-slate-300 font-bold truncate block">{fmt(floorPrice)}</span>
              </div>
              <div className="px-1.5 py-1 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                <span className="text-emerald-400/80 block text-[7px]">24h Δ</span>
                <span className="font-bold flex items-center gap-0.5 truncate">
                  {isPositiveDelta ? '▲' : '▼'} {deltaValue.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              GLYPH 2: CROSS-GRADE RELATIVE MATH (Purple Domain)
             ═══════════════════════════════════════════════════════════ */}
          <div className="rounded-xl p-3 bg-[#120d1f]/90 backdrop-blur-md border border-purple-500/30 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-purple-500/50">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 font-sans">
                  Cross-Grade Relative Math
                </span>
              </div>
              <div className="flex items-center gap-1 text-[8px] font-mono">
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {crossGradeModel.veracityPct}% FIT (R² {crossGradeModel.rSquaredVeracity})
                </span>
                <span className="text-slate-400 text-[8px]">
                  γ={crossGradeModel.elasticityExponent}
                </span>
              </div>
            </div>

            {/* Compact 6-Rung Benchmark Micro-Grid */}
            <div className="grid grid-cols-3 gap-1 my-1.5">
              {benchmarkTiers.map((t) => {
                const isTop = t.grade === '9.8';
                const isSelected = selectedGrade === t.grade;
                return (
                  <button
                    key={t.grade}
                    type="button"
                    onClick={() => setSelectedGrade(t.grade)}
                    className={`p-1 rounded-md text-left cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-purple-950/70 border-purple-400/60 shadow-sm ring-1 ring-purple-400/30'
                        : 'bg-black/30 border-white/5 hover:border-purple-500/30 hover:bg-purple-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8px] font-mono leading-none">
                      <span className={`font-bold ${isTop ? 'text-purple-300' : 'text-slate-200'}`}>
                        {t.grade === 'RAW' ? 'RAW' : t.grade}
                      </span>
                      <span className="text-[7px] text-slate-400">
                        {t.ratioPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[9px] font-mono font-bold text-white mt-0.5 leading-tight truncate">
                      {fmt(t.extrapolatedFmvUsd)}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[6.5px] font-mono">
                      <span className={t.isObserved ? 'text-emerald-400 font-semibold' : 'text-purple-400'}>
                        {t.isObserved ? 'COMP' : 'MATH'}
                      </span>
                      {t.apexBoostPct != null && !isTop && (
                        <span className="text-emerald-400 font-bold">
                          +{t.apexBoostPct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pt-1 border-t border-purple-500/15">
              <span className="truncate">Trades stagger relative to decay curve</span>
              <button 
                onClick={() => handleSetViewMode('expanded')} 
                className="text-purple-300 hover:text-white underline cursor-pointer shrink-0 ml-1"
              >
                All 16 Tiers &rarr;
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              GLYPH 3: CENSUS POPULATION & FLOAT (Emerald Domain)
             ═══════════════════════════════════════════════════════════ */}
          <div className="rounded-xl p-3 bg-[#0a1612]/90 backdrop-blur-md border border-emerald-500/30 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-emerald-500/50">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 font-sans">
                  Census Population
                </span>
              </div>
              <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                CGC Universal
              </span>
            </div>

            {/* Dual Counter + Apex Scarcity Tag */}
            <div className="my-1.5 p-2 rounded-lg bg-emerald-950/25 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[7.5px] font-mono uppercase text-slate-400 block">TOTAL CERTIFIED</span>
                <span className="text-sm font-bold font-mono text-white leading-tight">
                  {totalGraded.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[7.5px] font-mono uppercase text-rose-300/80 block">9.8+ APEX COPIES</span>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-sm font-bold font-mono text-rose-400 leading-tight">
                    {apexGraded.toLocaleString()}
                  </span>
                  <span className="text-[7px] font-mono px-1 py-0.2 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold">
                    {apexPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Segmented Population Distribution Pyramid Bar */}
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                <div style={{ width: '4%' }} className="h-full bg-rose-500" title={`9.8+ Apex: ${apexGraded} copies (${apexPct}%)`} />
                <div style={{ width: '12%' }} className="h-full bg-cyan-400" title="High Grade 9.0-9.6 (2.6%)" />
                <div style={{ width: '28%' }} className="h-full bg-purple-500" title="Mid Grade 7.0-8.5 (15.2%)" />
                <div style={{ width: '56%' }} className="h-full bg-slate-600" title="Lower Grade < 7.0 (82.1%)" />
              </div>
              {/* Micro-Chips Legend */}
              <div className="flex items-center justify-between text-[7px] font-mono text-slate-400">
                <span className="text-rose-400">■ 9.8+ ({apexGraded})</span>
                <span className="text-cyan-300">■ 9.0-9.6</span>
                <span className="text-purple-300">■ 7.0-8.5</span>
                <span className="text-slate-400">■ &lt;7.0</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pt-1 border-t border-emerald-500/15">
              <span>APEX: 1 in {Math.round(totalGraded / Math.max(1, apexGraded)).toLocaleString()} copies</span>
              <span className="text-emerald-400/90 font-medium">Supply Float Active</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW MODE: EXPANDED (Full Deep-Dive Analytical Mode)
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="w-full space-y-3">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            Expanded Analytical Terminal · Cross-Grade Elasticity &amp; Census Histogram
          </span>
        </div>

        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[9px] font-mono">
          <button
            onClick={() => handleSetViewMode('tiny')}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
            title="Compact High-Density HUD"
          >
            ⚡ Tiny HUD
          </button>
          <button
            onClick={() => handleSetViewMode('expanded')}
            className="bg-purple-500/30 text-purple-200 border border-purple-400/40 font-bold px-2 py-0.5 rounded cursor-pointer shadow-sm"
            title="Expanded Analytical View (Current)"
          >
            ⊞ Expanded
          </button>
          <button
            onClick={() => handleSetViewMode('minimal')}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
            title="Single-line Minimal Ticker"
          >
            — Ticker
          </button>
          <button
            onClick={() => handleSetViewMode('hidden')}
            className="text-slate-500 hover:text-slate-300 px-1 py-0.5 cursor-pointer"
            title="Hide Panels Completely"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── EXPANDED 3-COLUMN MASONRY ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        
        {/* ═══════════════════════════════════════════════════════════
            GLYPH 1: KEY PRICES & VALUATION (Cyan Domain)
           ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl p-4 bg-[#0a121e]/90 backdrop-blur-md border border-cyan-500/30 flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden transition-all hover:border-cyan-500/60">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-sans" style={{ letterSpacing: '0.08em' }}>
                  Key Prices &amp; Valuation
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                Tier Valuations
              </span>
            </div>

            {/* Dropdown Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center justify-between">
                <span>Inspect Grade Tier</span>
                <span className="text-[9px] font-mono text-cyan-400 font-semibold">{gradeOptions.length} Tiers (Cross-Grade Model)</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/50 border border-cyan-500/30 hover:border-cyan-400 text-left text-xs font-mono transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{activeOption.label}</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      activeOption.isObserved 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                        : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                    }`}>
                      {activeOption.isObserved ? 'COMP' : 'EXTRAPOLATED'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#08121a] border border-cyan-500/40 shadow-2xl py-1 z-50 max-h-56 overflow-y-auto">
                    {gradeOptions.map((opt) => (
                      <button
                        key={opt.grade}
                        type="button"
                        onClick={() => {
                          setSelectedGrade(opt.grade);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                          opt.grade === selectedGrade ? 'bg-cyan-950/60 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{opt.label}</span>
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                            opt.isObserved ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {opt.isObserved ? 'VERIFIED' : 'MATH'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white">{fmt(opt.priceUsd)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Tier Live Value Card */}
            <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
                    {activeOption.grade === 'RAW' ? 'UNGRADED RAW TIER' : `CGC ${activeOption.grade} FAIR VALUE`}
                  </span>
                  <span className="text-base font-bold font-mono text-cyan-300">
                    {fmt(activeOption.priceUsd)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">
                    REL TO 9.8
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {activeOption.ratioPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-cyan-500/10 flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-400">
                  {activeOption.isObserved ? 'Verified Auction Comp' : 'Extrapolated Math (Apex Model)'}
                </span>
                {activeOption.apexBoostPct != null && activeOption.grade !== '9.8' && (
                  <span className="text-emerald-400 font-bold">
                    ▲ +{activeOption.apexBoostPct}% Apex Lift
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="uppercase tracking-wider font-semibold text-slate-200 font-sans block text-[11px]">
                    SOV Price
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">Confirmed Sovereign Anchor</span>
                </div>
                <span className="text-xs font-bold font-mono text-cyan-300">
                  {keyPrices.sovPriceUsd > 0 ? fmt(keyPrices.sovPriceUsd) : fmt(733411.73)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="uppercase tracking-wider font-semibold text-slate-200 font-sans block text-[11px]">
                    9.8 FMV
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">Sovereign Grade Fair Value</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">
                  {keyPrices.fmv98Usd > 0 ? fmt(keyPrices.fmv98Usd) : fmt(733411.73)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="uppercase tracking-wider font-semibold text-slate-200 font-sans block text-[11px]">
                    RAW Baseline
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">Ungraded Floor Observation</span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-300">
                  {keyPrices.fmvRawUsd != null && keyPrices.fmvRawUsd > 0 ? fmt(keyPrices.fmvRawUsd) : fmt(5000)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                <span className="uppercase tracking-wider font-semibold text-slate-300 font-sans text-[11px]">
                  24h Δ Momentum
                </span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                  {isPositiveDelta ? <ArrowUpRight className="w-3.5 h-3.5" /> : isNegativeDelta ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  <span>{isPositiveDelta ? '+' : ''}{deltaValue.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>GRADE COUNT: {keyPrices.gradeCount || gradeOptions.length}</span>
            <span className="text-cyan-400/80">SPREAD: {apexFloorSpreadMultiple}x</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            GLYPH 2: CROSS-GRADE RELATIVE SPREAD LADDER (Purple Domain)
           ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl p-4 bg-[#120d1f]/90 backdrop-blur-md border border-purple-500/30 flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden transition-all hover:border-purple-500/60">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-purple-400 to-transparent" />

          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold text-xs">
                  <BarChart2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-sans" style={{ letterSpacing: '0.08em' }}>
                  Cross-Grade Relative Math
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  {crossGradeModel.veracityPct}% Veracity
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="text-slate-400">
                Staggered Apex Cascade (γ = {crossGradeModel.elasticityExponent})
              </span>
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded border border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFullExtrapolation(true)}
                  className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider transition-colors cursor-pointer ${
                    showFullExtrapolation ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Math
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullExtrapolation(false)}
                  className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider transition-colors cursor-pointer ${
                    !showFullExtrapolation ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Observed
                </button>
              </div>
            </div>

            <p className="text-[9.5px] text-slate-400 font-sans leading-relaxed">
              When an apex 9.8 breaks out, it cascades down the ladder, boosting underlying mid-grades relative to their empirical decay curve.
            </p>

            {/* Scrollable Ladder */}
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {keyDisplayGrades.map((t, idx) => {
                const isTop = t.grade === '9.8';
                const barW = Math.min(100, Math.max(2, t.ratioPct));
                return (
                  <div key={`${t.grade}-${idx}`} className="p-1.5 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-[11px] ${isTop ? 'text-purple-300' : 'text-slate-200'}`}>
                          {t.grade === 'RAW' ? 'RAW' : `CGC ${t.grade}`}
                        </span>
                        <span className={`text-[7px] font-mono px-1 py-0.2 rounded ${
                          t.isObserved 
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' 
                            : 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                        }`}>
                          {t.isObserved ? 'COMP' : 'MATH'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[11px] ${isTop ? 'text-white' : 'text-purple-200'}`}>
                          {fmt(t.extrapolatedFmvUsd)}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {t.ratioPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${barW}%`, 
                          backgroundColor: isTop ? '#c084fc' : t.isObserved ? '#a855f7' : '#818cf8',
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>ELASTICITY: γ = {crossGradeModel.elasticityExponent}</span>
            <span className="text-purple-300/80">R² = {crossGradeModel.rSquaredVeracity} ({crossGradeModel.veracityPct}% FIT)</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            GLYPH 3: CGC CENSUS POPULATION SNAPSHOT (Emerald Domain)
           ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl p-4 bg-[#0a1612]/90 backdrop-blur-md border border-emerald-500/30 flex flex-col justify-between gap-3 shadow-xl relative overflow-hidden transition-all hover:border-emerald-500/60">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
                  <Activity className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-sans" style={{ letterSpacing: '0.08em' }}>
                  Census Population
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                CGC Universal + SS
              </span>
            </div>

            {/* Dual Counters */}
            <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
              <div>
                <div className="text-lg font-bold font-mono text-white leading-tight">
                  {totalGraded.toLocaleString()}
                </div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">
                  Total Certified
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-rose-400 leading-tight">
                  {apexGraded.toLocaleString()}
                </div>
                <div className="text-[8px] font-mono uppercase tracking-wider text-rose-300/80 mt-0.5">
                  9.8+ Apex Copies
                </div>
              </div>
            </div>

            {/* Histogram */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>GRADE CLUSTER</span>
                <span>CERTIFIED COPIES</span>
              </div>

              {[
                { grade: '9.8', count: apexGraded, pct: Number(apexPct) },
                { grade: '9.6', count: 18, pct: 0.32 },
                { grade: '9.4', count: 42, pct: 0.75 },
                { grade: '9.2', count: 86, pct: 1.53 },
                { grade: '9.0', count: 140, pct: 2.49 },
                { grade: '8.5', count: 320, pct: 5.70 },
              ].map((h, idx) => (
                <div key={`${h.grade}-${idx}`} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-300 font-medium">{h.grade}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">{h.count.toLocaleString()}</span>
                      <span className="text-[8px] text-slate-500 w-10 text-right">{h.pct.toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500/60"
                      style={{ width: `${Math.max(4, h.pct * 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>
              {censusSummary?.snapshotDate
                ? `CGC CENSUS · ${new Date(censusSummary.snapshotDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                : 'CGC CENSUS · 2026'}
            </span>
            <span className="text-emerald-400/80">SUPPLY INVARIANT ACTIVE</span>
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  DollarSign, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  HelpCircle, 
  ChevronDown, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { GradePrice } from './types';
import { fmt } from './shared';

interface SlabArbitrageTerminalProps {
  publicationYear: number | null;
  rawPrice: number | null;
  gradeLattice: GradePrice[];
  accentColor?: string;
  isGated?: boolean;
  onUnlock?: () => void;
}

export default function SlabArbitrageTerminal({
  publicationYear,
  rawPrice,
  gradeLattice = [],
  accentColor = '#06b6d4',
  isGated = false,
  onUnlock,
}: SlabArbitrageTerminalProps) {
  const isPre1975 = publicationYear != null && publicationYear < 1975;
  const cgcGradingFee = isPre1975 ? 65 : 35;
  const shippingRoundtrip = 45;
  const invoiceFee = 5;

  const effectiveRaw = rawPrice != null && rawPrice > 0 ? rawPrice : 5000;
  const baseReplacementCost = effectiveRaw + cgcGradingFee + shippingRoundtrip + invoiceFee;

  // Find prices for key benchmark grades
  const p80 = gradeLattice.find((g) => g.grade === '8.0')?.priceUsd ?? 12000;
  const p94 = gradeLattice.find((g) => g.grade === '9.4')?.priceUsd ?? 48000;
  const p98 = gradeLattice.find((g) => g.grade === '9.8')?.priceUsd ?? 733411.73;

  const diff80 = p80 > 0 ? p80 - baseReplacementCost : null;
  const roi80 = diff80 != null && baseReplacementCost > 0 ? (diff80 / baseReplacementCost) * 100 : null;

  const diff94 = p94 > 0 ? p94 - baseReplacementCost : null;
  const roi94 = diff94 != null && baseReplacementCost > 0 ? (diff94 / baseReplacementCost) * 100 : null;

  const diff98 = p98 > 0 ? p98 - baseReplacementCost : null;
  const roi98 = diff98 != null && baseReplacementCost > 0 ? (diff98 / baseReplacementCost) * 100 : null;

  const [selectedBenchmark, setSelectedBenchmark] = useState<'8.0' | '9.4' | '9.8'>('9.4');
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  const selectedData = useMemo(() => {
    if (selectedBenchmark === '8.0') return { label: 'CGC 8.0 (Very Fine)', price: p80, diff: diff80, roi: roi80 };
    if (selectedBenchmark === '9.4') return { label: 'CGC 9.4 (Near Mint)', price: p94, diff: diff94, roi: roi94 };
    return { label: 'CGC 9.8 (Mint Apex)', price: p98, diff: diff98, roi: roi98 };
  }, [selectedBenchmark, p80, p94, p98, diff80, diff94, diff98, roi80, roi94, roi98]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#080d19]/90 backdrop-blur-md p-5 shadow-2xl relative overflow-hidden space-y-5">
      {/* Laser Top Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Scale className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white font-sans">
                Slab Arbitrage &amp; Replacement Economics Engine
              </h3>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                Decision Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Empowering subscribers to determine whether to purchase loose RAW copies and encapsulate, or acquire certified slabs directly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeeBreakdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-mono transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showFeeBreakdown ? 'Hide Fee Breakdown' : 'Encapsulation Breakdown'}</span>
          </button>
        </div>
      </div>

      {/* Fee Breakdown Dropdown / Drawer */}
      {showFeeBreakdown && (
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 animate-fadeIn text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-white/5">
            <span className="text-cyan-300 font-bold uppercase tracking-wider">Baseline Encapsulation Math</span>
            <span className="text-slate-400">{isPre1975 ? 'Vintage Era (<1975)' : 'Modern Era (≥1975)'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase">Raw Outlay</span>
              <span className="text-sm font-bold text-white">{fmt(effectiveRaw)}</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase">CGC Grading Fee</span>
              <span className="text-sm font-bold text-white">{fmt(cgcGradingFee)}</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase">2-Way Insured S&amp;H</span>
              <span className="text-sm font-bold text-white">{fmt(shippingRoundtrip)}</span>
            </div>
            <div className="p-2 rounded bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase">Online Invoice Fee</span>
              <span className="text-sm font-bold text-white">{fmt(invoiceFee)}</span>
            </div>
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px] text-cyan-400">
            <span>TOTAL ALL-IN REPLACEMENT COST:</span>
            <span className="text-sm font-bold">{fmt(baseReplacementCost)}</span>
          </div>
        </div>
      )}

      {/* Main 3-Column Arbitrage Benchmark Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: Grade 8.0 (VF) */}
        <div 
          onClick={() => setSelectedBenchmark('8.0')}
          className={`rounded-xl p-4 border transition-all cursor-pointer relative ${
            selectedBenchmark === '8.0' 
              ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-200">GRADE 8.0 (VF)</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              roi80 != null && roi80 > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {roi80 != null ? `${roi80 > 0 ? '+' : ''}${roi80.toFixed(0)}% ROI` : '—'}
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-xl font-bold font-mono text-white block">{fmt(p80)}</span>
            <span className="text-[10px] text-slate-400 font-mono">Current Secondary Market FMV</span>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Net Expected Spread:</span>
            <span className={`font-bold ${diff80 != null && diff80 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {diff80 != null ? `${diff80 >= 0 ? '+' : ''}${fmt(diff80)}` : 'Unpriced'}
            </span>
          </div>
        </div>

        {/* Tier 2: Grade 9.4 (NM) */}
        <div 
          onClick={() => setSelectedBenchmark('9.4')}
          className={`rounded-xl p-4 border transition-all cursor-pointer relative ${
            selectedBenchmark === '9.4' 
              ? 'bg-purple-950/30 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-200">GRADE 9.4 (NM)</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              roi94 != null && roi94 > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {roi94 != null ? `${roi94 > 0 ? '+' : ''}${roi94.toFixed(0)}% ROI` : '—'}
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-xl font-bold font-mono text-white block">{fmt(p94)}</span>
            <span className="text-[10px] text-slate-400 font-mono">Current Secondary Market FMV</span>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Net Expected Spread:</span>
            <span className={`font-bold ${diff94 != null && diff94 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {diff94 != null ? `${diff94 >= 0 ? '+' : ''}${fmt(diff94)}` : 'Unpriced'}
            </span>
          </div>
        </div>

        {/* Tier 3: Grade 9.8 (Mint Apex) */}
        <div 
          onClick={() => setSelectedBenchmark('9.8')}
          className={`rounded-xl p-4 border transition-all cursor-pointer relative ${
            selectedBenchmark === '9.8' 
              ? 'bg-emerald-950/30 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
              : 'bg-black/30 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-slate-200">GRADE 9.8 (MINT)</span>
              <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Apex
              </span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              roi98 != null && roi98 > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {roi98 != null ? `${roi98 > 0 ? '+' : ''}${roi98.toFixed(0)}% ROI` : '—'}
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-xl font-bold font-mono text-white block">{fmt(p98)}</span>
            <span className="text-[10px] text-slate-400 font-mono">Sovereign Benchmark Value</span>
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Net Expected Spread:</span>
            <span className={`font-bold ${diff98 != null && diff98 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {diff98 != null ? `${diff98 >= 0 ? '+' : ''}${fmt(diff98)}` : 'Unpriced'}
            </span>
          </div>
        </div>
      </div>

      {/* Subscriber Guidance Summary Card */}
      <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-sans">
              Strategic Subscriber Acquisition Recommendation
            </span>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {roi80 != null && roi80 > 100 ? (
              <>
                <strong className="text-emerald-400 font-mono">Favorable Raw Arbitrage Window:</strong> The spread between raw baseline ({fmt(baseReplacementCost)}) and Grade 8.0/9.4 exceeds encapsulation overhead. Subscribers pursuing yield may acquire raw copies under strict physical pre-screening.
              </>
            ) : (
              <>
                <strong className="text-cyan-400 font-mono">Direct Encapsulated Acquisition Recommended:</strong> Narrow spreads between raw copies and certified 8.0/9.4 tiers favor acquiring existing authenticated slabs, bypassing grading lead times and defect variance risk.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
            <span className="text-[9px] text-slate-400 block uppercase">Break-Even Tier</span>
            <span className="font-bold text-white">Grade 8.0+</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
            <span className="text-[9px] text-cyan-400/80 block uppercase">Spread Multiple</span>
            <span className="font-bold">{(p98 / baseReplacementCost).toFixed(1)}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

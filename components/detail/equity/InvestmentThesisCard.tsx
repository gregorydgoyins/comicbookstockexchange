'use client';
import React, { useMemo } from 'react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';
import { Target, TrendingUp, TrendingDown, Zap } from 'lucide-react';

export interface InvestmentThesisCardProps {
  variant: {
    workName: string;
    issueNumber: string;
    era: string | null;
    publisher: string;
    scarcityTier: string | null;
  };
  keyPrices: {
    fmv98Usd: number;
    sovPriceUsd: number;
  };
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
  } | null | undefined;
  series: {
    name: string;
    totalIssues: number;
  } | null | undefined;
  priceHistory: Array<{ priceUsd: number; observedAt: string }>;
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

const FALLBACK_BULL_POINTS = [
  'Proven historical resilience across market cycles',
  'Strong collector demand for foundational character milestone',
  'Consistent secondary market liquidity among peer issues',
];

const FALLBACK_BEAR_POINTS = [
  'Macro discretionary spending sensitivity may pressure valuations',
  'Specialized collectibles liquidity profile requires patient holding periods',
  'Future grading submissions may increment known census supply',
];

export default function InvestmentThesisCard({
  variant,
  keyPrices,
  censusSummary,
  series: _series,
  priceHistory = [],
  eraColors,
}: InvestmentThesisCardProps) {
  const colors = eraColors ?? getEraColors(variant?.era);

  const { bullBullets, bearBullets, catalystBullets } = useMemo(() => {
    const eraStr = (variant?.era || '').toLowerCase().trim();
    const pubStr = (variant?.publisher || '').toLowerCase().trim();
    const highGradeCount = censusSummary?.highGradeCount;
    const totalGraded = censusSummary?.totalGraded;
    const sovPrice = keyPrices?.sovPriceUsd ?? 0;

    // ── Bull Case (green) ──────────────────────────────────
    const bulls: string[] = [];

    // If era is golden/silver → 'Pre-1970 key issue with extreme natural scarcity'
    if (eraStr.includes('golden') || eraStr.includes('silver')) {
      bulls.push('Pre-1970 key issue with extreme natural scarcity');
    }

    // If highGradeCount < 50 → 'Extremely limited high-grade population ({count} copies at 9.8+)'
    if (typeof highGradeCount === 'number' && highGradeCount < 50) {
      bulls.push(`Extremely limited high-grade population (${highGradeCount.toLocaleString()} copies at 9.8+)`);
    }

    // If sovPriceUsd > 5000 → 'Blue-chip equity with institutional demand floor'
    if (typeof sovPrice === 'number' && sovPrice > 5000) {
      bulls.push('Blue-chip equity with institutional demand floor');
    }

    // If publisher is Marvel → 'MCU adaptation pipeline provides ongoing catalyst'
    if (pubStr.includes('marvel')) {
      bulls.push('MCU adaptation pipeline provides ongoing catalyst');
    } else if (pubStr.includes('dc')) {
      // If publisher is DC → 'Warner Bros/DC Studios content pipeline active'
      bulls.push('Warner Bros/DC Studios content pipeline active');
    }

    // Always include at least 2 bullets
    for (const fallback of FALLBACK_BULL_POINTS) {
      if (bulls.length >= 2) break;
      if (!bulls.includes(fallback)) {
        bulls.push(fallback);
      }
    }

    // ── Bear Case (red) ────────────────────────────────────
    const bears: string[] = [];

    // If totalGraded > 2000 → 'Large graded population may cap appreciation'
    if (typeof totalGraded === 'number' && totalGraded > 2000) {
      bears.push('Large graded population may cap appreciation');
    }

    // If era is modern → 'Modern era print runs limit natural scarcity'
    if (eraStr.includes('modern')) {
      bears.push('Modern era print runs limit natural scarcity');
    }

    // If price trending down (last 4 prices declining) → 'Recent price momentum negative'
    if (priceHistory && priceHistory.length >= 4) {
      const sorted = [...priceHistory].sort((a, b) =>
        (a.observedAt || '').localeCompare(b.observedAt || '')
      );
      const last4 = sorted.slice(-4);
      const isDeclining =
        (last4[1].priceUsd < last4[0].priceUsd &&
          last4[2].priceUsd < last4[1].priceUsd &&
          last4[3].priceUsd < last4[2].priceUsd) ||
        (last4[1].priceUsd <= last4[0].priceUsd &&
          last4[2].priceUsd <= last4[1].priceUsd &&
          last4[3].priceUsd <= last4[2].priceUsd &&
          last4[3].priceUsd < last4[0].priceUsd);

      if (isDeclining) {
        bears.push('Recent price momentum negative');
      }
    }

    // If highGradeCount > 200 → 'Abundant 9.8 supply reduces scarcity premium'
    if (typeof highGradeCount === 'number' && highGradeCount > 200) {
      bears.push('Abundant 9.8 supply reduces scarcity premium');
    }

    // Always include at least 2 bullets
    for (const fallback of FALLBACK_BEAR_POINTS) {
      if (bears.length >= 2) break;
      if (!bears.includes(fallback)) {
        bears.push(fallback);
      }
    }

    // ── Catalyst Watch (amber) ─────────────────────────────
    const catalysts: string[] = [];
    if (pubStr.includes('marvel')) {
      catalysts.push('MCU Phase announcement potential');
    } else if (pubStr.includes('dc')) {
      catalysts.push('DC Studios slate expansion');
    }
    catalysts.push('CGC census population shift');
    catalysts.push('Record auction result for comparable key');

    return {
      bullBullets: bulls.slice(0, 3),
      bearBullets: bears.slice(0, 3),
      catalystBullets: catalysts.slice(0, 3),
    };
  }, [variant, keyPrices, censusSummary, priceHistory]);

  return (
    <Panel
      title="Investment Thesis"
      icon={<Target className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Bull Case */}
        <div
          className="group relative rounded-xl p-3.5 bg-[#0d1512]/80 hover:bg-[#0f1f18] transition-all duration-300 flex flex-col justify-between border border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(34,197,94,0.45),inset_0_0_15px_rgba(34,197,94,0.15)] ring-1 ring-emerald-500/20 hover:ring-emerald-400/60"
        >
          {/* Luminous Outer Laser Edge Rim Light on Hover */}
          <div className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-emerald-400 opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_10px_#22c55e] transition-all duration-300" />
          <div className="absolute -bottom-[1px] left-6 right-6 h-[1px] rounded-full bg-emerald-400/40 group-hover:opacity-80 transition-all duration-300" />

          {/* Subtle ghosted ambient green backlight on hover */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-emerald-500/15 via-emerald-950/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-emerald-500/25">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e] animate-pulse" />
                <TrendingUp className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 text-emerald-400" />
                <span
                  className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-300 font-mono"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Bull Case
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                UPSIDE
              </span>
            </div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {bullBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 leading-snug"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontFamily: 'Hind, sans-serif',
                  }}
                >
                  <span
                    className="select-none shrink-0 text-emerald-400 font-bold"
                    style={{ fontSize: '12px', lineHeight: '14px' }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Catalyst Watch (Yellow / Amber) */}
        <div
          className="group relative rounded-xl p-3.5 bg-[#17140b]/80 hover:bg-[#211b0e] transition-all duration-300 flex flex-col justify-between border border-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.45),inset_0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20 hover:ring-amber-400/60"
        >
          {/* Luminous Outer Laser Edge Rim Light on Hover */}
          <div className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-amber-400 opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_10px_#f59e0b] transition-all duration-300" />
          <div className="absolute -bottom-[1px] left-6 right-6 h-[1px] rounded-full bg-amber-400/40 group-hover:opacity-80 transition-all duration-300" />

          {/* Subtle ghosted ambient yellow/amber backlight on hover */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-amber-500/15 via-amber-950/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-500/25">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                <Zap className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 text-amber-400" />
                <span
                  className="text-[9px] uppercase tracking-wider font-extrabold text-amber-300 font-mono"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Catalyst Watch
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                TRIGGERS
              </span>
            </div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {catalystBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 leading-snug"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontFamily: 'Hind, sans-serif',
                  }}
                >
                  <span
                    className="select-none shrink-0 text-amber-400 font-bold"
                    style={{ fontSize: '12px', lineHeight: '14px' }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bear Case (Red) */}
        <div
          className="group relative rounded-xl p-3.5 bg-[#170e0f]/80 hover:bg-[#221013] transition-all duration-300 flex flex-col justify-between border border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_25px_rgba(239,68,68,0.45),inset_0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-rose-500/20 hover:ring-rose-400/60"
        >
          {/* Luminous Outer Laser Edge Rim Light on Hover */}
          <div className="absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-rose-400 opacity-60 group-hover:opacity-100 group-hover:shadow-[0_0_10px_#ef4444] transition-all duration-300" />
          <div className="absolute -bottom-[1px] left-6 right-6 h-[1px] rounded-full bg-rose-400/40 group-hover:opacity-80 transition-all duration-300" />

          {/* Subtle ghosted ambient red backlight on hover */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-rose-500/15 via-rose-950/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-rose-500/25">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#ef4444] animate-pulse" />
                <TrendingDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 text-rose-400" />
                <span
                  className="text-[9px] uppercase tracking-wider font-extrabold text-rose-300 font-mono"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Bear Case
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                DOWNSIDE
              </span>
            </div>
            <ul className="space-y-2 m-0 p-0 list-none">
              {bearBullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 leading-snug"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontFamily: 'Hind, sans-serif',
                  }}
                >
                  <span
                    className="select-none shrink-0 text-rose-400 font-bold"
                    style={{ fontSize: '12px', lineHeight: '14px' }}
                  >
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  );
}

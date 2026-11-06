'use client';

import { useState, useMemo } from 'react';
import { Clock, Info } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import { withAlpha } from '@/lib/colorUtils';
import { useTooltipsEnabled } from '@/components/shell/tooltip-toggle';
import type { TemporalMemory, GradePrice, HistoryEntry, TitanEvent } from './types';
import Panel from './Panel';
import { fmt, fmtDate } from './shared';

const TIER_LABELS = ['Equilibrium', 'Surface Tremor', 'Fault Tension', 'Structural Shear', 'Seismic Event', 'Regional Collapse', 'Systemic Crisis'];
const TIER_COLORS = ['#4ade80', '#86efac', '#fde68a', '#f59e0b', '#fb923c', '#f87171', '#dc2626'];
const TIER_DESCS = [
  'Market operating within normal parameters.',
  'Mild stress detected. Short overlay, low scar risk.',
  'Sustained directional pressure. Structural support deployed.',
  'Deep fault lines forming. Coordinated multi-vector intervention.',
  'Major market rupture. Emergency liquidity injection.',
  'Systemic failure in progress. Maximum intervention force.',
  'Total market failure. Constitutional Managing Principals directly engaged.',
];
const INTERVENTION_TYPE_DESCS: Record<string, string> = {
  MINOR_STABILIZATION: 'Targeted liquidity injection and light spread compression.',
  STRUCTURAL_SUPPORT: 'Multi-vector operation — price floor anchoring combined with volatility suppression.',
  MAJOR_INTERVENTION: 'Full desk mobilization. Spread forced to zero.',
  EMERGENCY_HALT: 'Trading suspended across affected lanes.',
  TITAN_OVERRIDE: 'Direct Executive Principal command. Consequences are permanent.',
};

const GRADE_PIE_COLORS: Record<string, string> = {
  'RAW': '#475569',
  '4.0': '#6b7280', '4.5': '#6b7280',
  '5.0': '#7c8ea0', '5.5': '#7c8ea0',
  '6.0': '#64748b', '6.5': '#64748b',
  '7.0': '#7ea8c4', '7.5': '#7ea8c4',
  '8.0': '#38bdf8', '8.5': '#38bdf8',
  '9.0': '#22d3ee', '9.2': '#22d3ee',
  '9.4': '#818cf8', '9.6': '#8b5cf6',
  '9.8': '#a78bfa', '9.9': '#f59e0b', '10.0': '#fde68a',
};
const gradeColor = (g: string) => GRADE_PIE_COLORS[g] ?? '#475569';

function MetricTooltip({
  title,
  explanation,
  formula,
  align = 'center',
}: {
  title: string;
  explanation: string;
  formula?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const enabled = useTooltipsEnabled();
  if (!enabled) return null;

  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div className="relative inline-flex items-center group/tip ml-1 align-middle">
      <span
        tabIndex={0}
        role="button"
        aria-label={`Explanation for ${title}`}
        className="cursor-help text-slate-400 hover:text-cyan-300 transition-colors p-0.5 rounded hover:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      >
        <Info className="w-2.5 h-2.5 opacity-70 group-hover/tip:opacity-100" />
      </span>
      <div
        className={`absolute bottom-full mb-1.5 hidden group-hover/tip:flex group-focus-within/tip:flex flex-col z-50 w-64 p-2.5 rounded-lg bg-slate-950/95 border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.65)] text-left backdrop-blur-md pointer-events-none transition-all duration-150 ${alignClass}`}
      >
        <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
          <span>{title}</span>
          <span className="text-[8px] font-mono text-slate-500">GLOSSARY</span>
        </div>
        <p className="text-[9.5px] leading-relaxed text-slate-200">
          {explanation}
        </p>
        {formula && (
          <div className="mt-1.5 pt-1 border-t border-slate-800/80 font-mono text-[8px] text-amber-300/90 bg-slate-900/60 rounded px-1.5 py-0.5">
            <span className="text-slate-500 mr-1">Formula:</span>
            {formula}
          </div>
        )}
      </div>
    </div>
  );
}

function DoomsdayClock({ totalEvents, highestTier }: { totalEvents: number; highestTier: number }) {
  const pct = Math.min(1, highestTier / 6);
  const color = pct === 0 ? 'rgba(255,255,255,0.1)' : pct < 0.34 ? '#4ade80' : pct < 0.67 ? '#f59e0b' : '#f87171';
  const r = 26, cx = 34, cy = 34;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        {pct > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={withAlpha(color, 0.851)} strokeWidth="5"
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: pct > 0.66 ? `drop-shadow(0 0 4px ${withAlpha(color, 0.502)})` : 'none' }} />}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fill="#fff" fontFamily="monospace" fontWeight="500" style={{ dominantBaseline: 'middle' }}>{totalEvents}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="monospace" letterSpacing="1">{totalEvents === 0 ? 'CLEAR' : `T${highestTier}`}</text>
      </svg>
      <span className="text-[7px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Interventions</span>
    </div>
  );
}

function SparklineStrip({ points, eraColor }: { points: { date: string; priceUsd: number }[]; eraColor: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (points.length < 2) return null;

  // Filter or consolidate points into quarterly/periodic cadence so each segment represents a quarter (or meaningful horizon)
  // If points are dense monthly observations, downsample/group by ~3 months (quarterly) or preserve natural cadence if <= 16 points
  const rawPoints = points;
  let periodicPoints: { date: string; priceUsd: number }[] = [];
  if (rawPoints.length > 20) {
    // Group into quarterly buckets (every 3rd month or first observation of each quarter)
    const step = Math.max(1, Math.floor(rawPoints.length / 16));
    for (let i = 0; i < rawPoints.length; i += step) {
      periodicPoints.push(rawPoints[i]);
    }
    // Always include the latest observation point
    if (periodicPoints[periodicPoints.length - 1] !== rawPoints[rawPoints.length - 1]) {
      periodicPoints.push(rawPoints[rawPoints.length - 1]);
    }
  } else {
    periodicPoints = rawPoints;
  }

  const W = 520, H = 84, PAD = 10;
  const prices = periodicPoints.map(p => p.priceUsd);
  const minP = Math.min(...prices), maxP = Math.max(...prices);

  // Exact vertical center representing stability / equilibrium baseline (Yellow line = 0 baseline)
  const midY = H / 2;

  // Midpoint baseline price (the zero/equilibrium benchmark)
  const baselinePrice = periodicPoints[0].priceUsd > 0 ? periodicPoints[0].priceUsd : (minP + maxP) / 2;
  const maxDispersion = Math.max(
    Math.abs(maxP - baselinePrice),
    Math.abs(minP - baselinePrice),
    baselinePrice * 0.08,
    1
  );

  const xs = periodicPoints.map((_, i) => (i / (periodicPoints.length - 1)) * W);
  // Traverses above (positive y up) or below (negative y down) the center line
  const ys = prices.map(p => {
    const deviation = (p - baselinePrice) / maxDispersion;
    const maxHalfHeight = (H / 2) - PAD;
    return midY - deviation * maxHalfHeight;
  });

  // State Transition Machine across Horizon Segments:
  // State from previous position:
  // 1. Up from previous position: Red -> Yellow -> Green (Recovery & Breakout)
  // 2. Down from previous position: Green -> Yellow -> Red (Drawdown & Capitulation)
  // 3. Stays Flat / Keeps pace with zero line: Yellow -> Yellow (Stability Equilibrium)
  // 4. Stays Depressed: Red -> Red (Persistent Cyclical Trough)
  // 5. Stays Elevated: Green -> Green (Sustained Bullish Expansion)
  type MarketState = 'GREEN_EXPANSION' | 'YELLOW_STABILITY' | 'RED_DRAWDOWN';
  let prevState: MarketState = 'YELLOW_STABILITY';

  const segments = [];
  for (let i = 0; i < periodicPoints.length - 1; i++) {
    const p1 = periodicPoints[i];
    const p2 = periodicPoints[i + 1];
    const delta = p2.priceUsd - p1.priceUsd;
    const pctChange = p1.priceUsd > 0 ? (delta / p1.priceUsd) * 100 : 0;

    // Relative to the absolute zero stability baseline
    const isAboveBaseline = p2.priceUsd > baselinePrice * 1.01;
    const isBelowBaseline = p2.priceUsd < baselinePrice * 0.99;

    let currentState: MarketState = 'YELLOW_STABILITY';
    let transitionLabel = 'Stable Equilibrium';
    let segColor = '#eab308'; // Yellow stability
    let glowColor = 'rgba(234, 179, 8, 0.45)';
    let gradientId = `grad-${i}`;

    // Determine target state based on directional momentum and baseline position
    if (pctChange > 1.2) {
      if (prevState === 'RED_DRAWDOWN') {
        // Red recovering through yellow to green
        if (isAboveBaseline) {
          currentState = 'GREEN_EXPANSION';
          transitionLabel = 'Red → Yellow → Green (Full Recovery & Breakout)';
        } else {
          currentState = 'YELLOW_STABILITY';
          transitionLabel = 'Red → Yellow (Trough Rebound to Stability)';
        }
      } else {
        currentState = 'GREEN_EXPANSION';
        transitionLabel = prevState === 'GREEN_EXPANSION' ? 'Green → Green (Sustained Expansion)' : 'Yellow → Green (Expansionary Climb)';
      }
    } else if (pctChange < -1.2) {
      if (prevState === 'GREEN_EXPANSION') {
        // Green falling through yellow to red
        if (isBelowBaseline) {
          currentState = 'RED_DRAWDOWN';
          transitionLabel = 'Green → Yellow → Red (Macro Liquidation)';
        } else {
          currentState = 'YELLOW_STABILITY';
          transitionLabel = 'Green → Yellow (Pullback to Equilibrium)';
        }
      } else {
        currentState = 'RED_DRAWDOWN';
        transitionLabel = prevState === 'RED_DRAWDOWN' ? 'Red → Red (Persistent Drawdown Trough)' : 'Yellow → Red (Drawdown Deterioration)';
      }
    } else {
      // Flat / keeping pace with zero line
      currentState = 'YELLOW_STABILITY';
      if (prevState === 'RED_DRAWDOWN') {
        transitionLabel = 'Red → Yellow (Trough Consolidation)';
      } else if (prevState === 'GREEN_EXPANSION') {
        transitionLabel = 'Green → Yellow (High-Plateau Consolidation)';
      } else {
        transitionLabel = 'Yellow → Yellow (Flat Stability Equilibrium)';
      }
    }

    // Color mapping based on transition
    if (currentState === 'GREEN_EXPANSION') {
      segColor = '#22c55e'; // Green up
      glowColor = 'rgba(34, 197, 94, 0.55)';
    } else if (currentState === 'RED_DRAWDOWN') {
      segColor = '#ef4444'; // Red down
      glowColor = 'rgba(239, 68, 68, 0.55)';
    } else {
      segColor = '#eab308'; // Yellow stable
      glowColor = 'rgba(234, 179, 8, 0.45)';
    }

    // Capture starting color for multi-state transition gradient (e.g. Red -> Green)
    const startColor = prevState === 'GREEN_EXPANSION' ? '#22c55e' : prevState === 'RED_DRAWDOWN' ? '#ef4444' : '#eab308';
    const endColor = segColor;

    segments.push({
      x1: xs[i],
      y1: ys[i],
      x2: xs[i + 1],
      y2: ys[i + 1],
      p1,
      p2,
      delta,
      pctChange,
      color: segColor,
      startColor,
      endColor,
      gradientId,
      glowColor,
      prevState,
      currentState,
      transitionLabel,
      idx: i,
    });

    prevState = currentState;
  }

  const areaPath = `M${xs[0].toFixed(1)},${H} ` + xs.map((x, i) => `L${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ') + ` L${xs[xs.length - 1].toFixed(1)},${H} Z`;

  return (
    <div className="relative group/timeline w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="overflow-visible block">
        <defs>
          <linearGradient id="timeline-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={eraColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={eraColor} stopOpacity="0.01" />
          </linearGradient>
          <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="yellow-stability-glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Segment transition gradients using userSpaceOnUse to prevent WebKit/Safari singular matrix dropping flat lines */}
          {segments.map((s) => (
            <linearGradient
              id={s.gradientId}
              key={s.gradientId}
              gradientUnits="userSpaceOnUse"
              x1={s.x1.toFixed(1)}
              y1={s.y1.toFixed(1)}
              x2={s.x2.toFixed(1)}
              y2={s.y2.toFixed(1)}
            >
              <stop offset="0%" stopColor={s.startColor} />
              <stop offset="100%" stopColor={s.endColor} />
            </linearGradient>
          ))}
        </defs>

        {/* Shaded Area */}
        <path d={areaPath} fill="url(#timeline-area)" />

        {/* Continuous underlying base trace to guarantee zero breaks or gaps between joints across all viewports and browsers */}
        <path
          d={`M${xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' L')}`}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* CENTER STABILITY LINE: Solid yellow-amber glowing equilibrium datum drawn directly across center */}
        <line
          x1="0"
          y1={midY.toFixed(1)}
          x2={W}
          y2={midY.toFixed(1)}
          stroke="#eab308"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          strokeOpacity="0.80"
          filter="url(#yellow-stability-glow)"
        />

        {/* Dynamic Multi-Segment Chromatic Lines traversing or pacing the center stability line */}
        {segments.map((seg) => {
          const isHovered = hoveredIdx === seg.idx;
          const strokePaint = seg.startColor !== seg.endColor ? `url(#${seg.gradientId})` : seg.color;

          return (
            <g key={seg.idx} onMouseEnter={() => setHoveredIdx(seg.idx)} onMouseLeave={() => setHoveredIdx(null)}>
              {/* Ghosted wide rim glow on hover/active */}
              <line
                x1={seg.x1.toFixed(1)}
                y1={seg.y1.toFixed(1)}
                x2={seg.x2.toFixed(1)}
                y2={seg.y2.toFixed(1)}
                stroke={strokePaint}
                strokeWidth={isHovered ? 9 : 5}
                strokeOpacity={isHovered ? 0.75 : 0.35}
                strokeLinecap="round"
                filter="url(#neon-glow)"
                className="transition-all duration-200"
              />
              {/* Sharp foreground vector line */}
              <line
                x1={seg.x1.toFixed(1)}
                y1={seg.y1.toFixed(1)}
                x2={seg.x2.toFixed(1)}
                y2={seg.y2.toFixed(1)}
                stroke={strokePaint}
                strokeWidth={isHovered ? 3 : 2.2}
                strokeLinecap="round"
                className="transition-all duration-150 cursor-pointer"
              />
              {/* Interactive hit target */}
              <line
                x1={seg.x1.toFixed(1)}
                y1={seg.y1.toFixed(1)}
                x2={seg.x2.toFixed(1)}
                y2={seg.y2.toFixed(1)}
                stroke="transparent"
                strokeWidth={16}
                className="cursor-pointer"
              />
            </g>
          );
        })}

        {/* Data points */}
        {xs.map((x, i) => {
          const isHovered = hoveredIdx === i || hoveredIdx === i - 1;
          const isExtreme = prices[i] === maxP || prices[i] === minP;
          return (
            <circle
              key={i}
              cx={x.toFixed(1)}
              cy={ys[i].toFixed(1)}
              r={isHovered ? 4 : isExtreme ? 3 : 2}
              fill={isHovered ? '#fff' : isExtreme ? '#38bdf8' : 'rgba(255,255,255,0.8)'}
              stroke="rgba(0,0,0,0.8)"
              strokeWidth={0.8}
              className="transition-all duration-150 pointer-events-none"
            />
          );
        })}
      </svg>

      {/* Stability Equilibrium Baseline Tag & Guide Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 pb-1.5 border-b border-slate-800/60 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-[12px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 rounded-md px-2.5 py-0.5 shadow-[0_0_12px_rgba(245,158,11,0.25)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
            <span>Equilibrium Baseline: ${baselinePrice.toLocaleString()}</span>
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-sans">
            (Center dashed line = Zero/Stable anchor)
          </span>
        </div>

        {/* Legend pills explaining the long lines */}
        <div className="flex items-center gap-2.5 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
            <span>Above: Growth / Breakout</span>
          </span>
          <span className="flex items-center gap-1 text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
            <span>Center: Stability / Flat</span>
          </span>
          <span className="flex items-center gap-1 text-rose-400 bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_4px_#ef4444]" />
            <span>Below: Drawdown / Trough</span>
          </span>
        </div>
      </div>
      {hoveredIdx !== null && segments[hoveredIdx] && (
        <div
          className="absolute z-30 pointer-events-none rounded-lg px-3 py-2 text-[11px] sm:text-[12px] font-mono shadow-2xl border backdrop-blur-md flex flex-col gap-1.5"
          style={{
            backgroundColor: 'rgba(8, 13, 23, 0.98)',
            borderColor: segments[hoveredIdx].color,
            boxShadow: `0 0 22px ${segments[hoveredIdx].glowColor}`,
            top: '-64px',
            left: `${Math.min(75, Math.max(15, (xs[hoveredIdx] / W) * 100))}%`,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-[12px]">
              {fmtDate(segments[hoveredIdx].p1.date)} ({fmt(segments[hoveredIdx].p1.priceUsd)})
            </span>
            <span className="text-slate-400 font-bold">→</span>
            <span className="font-bold text-white text-[12px]">
              {fmtDate(segments[hoveredIdx].p2.date)} ({fmt(segments[hoveredIdx].p2.priceUsd)})
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[10.5px]">
            <span
              className="font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${segments[hoveredIdx].color}30`,
                color: segments[hoveredIdx].color,
                border: `1px solid ${segments[hoveredIdx].color}60`,
              }}
            >
              {segments[hoveredIdx].pctChange > 0 ? '▲ UP +' : segments[hoveredIdx].pctChange < 0 ? '▼ DOWN ' : '■ FLAT '}
              {segments[hoveredIdx].pctChange.toFixed(1)}% (
              {segments[hoveredIdx].delta > 0 ? `+$${segments[hoveredIdx].delta.toFixed(2)}` : `-$${Math.abs(segments[hoveredIdx].delta).toFixed(2)}`})
            </span>
            <span className="text-amber-300 font-semibold tracking-wide">
              {segments[hoveredIdx].transitionLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SvgDonut({
  data,
  innerRadius = 28,
  outerRadius = 46,
  fmtTip,
  wheelType = 'volume',
}: {
  data: { name: string; value: number }[];
  innerRadius?: number;
  outerRadius?: number;
  fmtTip: (val: number, name: string) => [string, string];
  wheelType?: 'volume' | 'elasticity' | 'spread';
}) {
  const [hovered, setHovered] = useState<{ name: string; value: number; color: string; pct: number } | null>(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const size = 110;
  const center = size / 2;
  const radius = (innerRadius + outerRadius) / 2;
  const strokeWidth = outerRadius - innerRadius;
  const circumference = 2 * Math.PI * radius;

  if (total === 0 || data.length === 0) {
    return (
      <div className="h-[110px] flex items-center justify-center text-[8px] font-mono text-white/40">
        no data
      </div>
    );
  }

  let accumulated = 0;

  return (
    <div className="relative flex items-center justify-center group/wheel" style={{ height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <filter id={`donut-glow-${wheelType}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ghosted Outer Rim Base Glow */}
        <circle
          cx={center}
          cy={center}
          r={radius + 4}
          fill="none"
          stroke={hovered ? hovered.color : 'rgba(255,255,255,0.06)'}
          strokeWidth={1.5}
          strokeOpacity={hovered ? 0.45 : 0.15}
          style={{
            filter: hovered ? `drop-shadow(0 0 6px ${hovered.color})` : 'none',
            transition: 'all 200ms ease',
          }}
        />

        {data.map((slice) => {
          const sliceRatio = slice.value / total;
          const strokeLength = sliceRatio * circumference;
          const offset = accumulated * circumference;
          accumulated += sliceRatio;

          const baseColor = gradeColor(slice.name);
          const isHovered = hovered?.name === slice.name;

          return (
            <g key={slice.name}>
              {/* Ghosted neon glow rim when slice is hovered */}
              {isHovered && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={baseColor}
                  strokeWidth={strokeWidth + 5}
                  strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${center} ${center})`}
                  opacity={0.65}
                  filter={`url(#donut-glow-${wheelType})`}
                  style={{ strokeLinecap: 'butt' }}
                />
              )}
              {/* Primary crisp slice */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={baseColor}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-150 cursor-pointer"
                style={{
                  strokeLinecap: 'butt',
                  opacity: hovered && !isHovered ? 0.35 : 0.95,
                  filter: isHovered ? `drop-shadow(0 0 8px ${baseColor})` : 'none',
                }}
                onMouseEnter={() =>
                  setHovered({
                    name: slice.name,
                    value: slice.value,
                    color: baseColor,
                    pct: Math.round(sliceRatio * 100),
                  })
                }
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Center percentage / label when hovering a slice */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        {hovered ? (
          <>
            <span
              className="text-[14px] font-mono font-extrabold leading-none"
              style={{
                color: hovered.color,
                textShadow: `0 0 10px ${hovered.color}90`,
              }}
            >
              {hovered.pct}%
            </span>
            <span className="text-[9.5px] font-mono font-bold text-white mt-0.5">
              {hovered.name}
            </span>
          </>
        ) : (
          <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
            CGC
          </span>
        )}
      </div>

      {hovered && (
        <div
          className="absolute z-30 pointer-events-none rounded-lg px-3 py-2 text-[11px] sm:text-[12px] font-mono shadow-2xl border backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(8, 13, 23, 0.98)',
            borderColor: hovered.color,
            boxShadow: `0 0 20px ${hovered.color}70`,
            bottom: '100%',
            marginBottom: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="flex items-center gap-2 font-bold mb-1 text-[12px]" style={{ color: hovered.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hovered.color, boxShadow: `0 0 8px ${hovered.color}` }} />
            <span>{fmtTip(hovered.value, hovered.name)[1]}</span>
            <span className="text-slate-300">({hovered.pct}% of cohort)</span>
          </div>
          <div className="text-white text-[10.5px] font-medium">{fmtTip(hovered.value, hovered.name)[0]}</div>
        </div>
      )}
    </div>
  );
}

function TitanEventCard({ ev, color }: { ev: TitanEvent; color: string }) {
  const [open, setOpen] = useState(false);
  const ddPct = Math.min(100, Math.abs(ev.drawdown) * 200);
  return (
    <div className="rounded px-2.5 py-1.5 cursor-pointer select-none"
      style={{ backgroundColor: open ? withAlpha(color, 0.071) : withAlpha(color, 0.027), border: `1px solid ${open ? withAlpha(color, 0.333) : withAlpha(color, 0.133)}`, transition: 'background-color 150ms ease, border-color 150ms ease' }}
      onClick={() => setOpen(o => !o)}>
      <div className="flex items-center gap-3">
        <div className="text-[10px] shrink-0 tabular-nums" style={{ color, fontFamily: 'monospace' }}>T{ev.tier}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{TIER_LABELS[ev.tier] || ev.type}</div>
          <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>tick #{ev.tick.toLocaleString()} · dd {(ev.drawdown * 100).toFixed(1)}% · {ev.overlayDuration}t overlay</div>
        </div>
        <span className="text-[8px] px-1 rounded shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.76)', fontFamily: 'monospace' }}>{open ? '▲' : '▼'}</span>
      </div>
      <div className="mt-1.5 relative h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 left-0 bottom-0 rounded-full" style={{ width: `${ddPct}%`, backgroundColor: withAlpha(color, 0.6) }} />
      </div>
      {open && (
        <div className="mt-2 pt-2 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${withAlpha(color, 0.125)}` }}>
          <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ color, fontFamily: 'monospace' }}>T{ev.tier} · {TIER_LABELS[ev.tier]}</span> — {TIER_DESCS[ev.tier]}
          </p>
          <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
            <span style={{ color: 'rgba(255,255,255,0.70)' }}>{ev.type.replace(/_/g, ' ')}</span> — {INTERVENTION_TYPE_DESCS[ev.type] || 'Intervention applied.'}
          </p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>stress idx {ev.stressIndex != null ? ev.stressIndex.toFixed(3) : '—'}</span>
            <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>overlay {ev.overlayDuration}t</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ScarMetricCard({ label, value, accent, gaugeValue, gaugeMin, gaugeMax, unit, description, linkedTick }: {
  label: string; value: string; accent: string; gaugeValue: number;
  gaugeMin: number; gaugeMax: number; unit: string; description: string; linkedTick?: number;
}) {
  const [open, setOpen] = useState(false);
  const range = gaugeMax - gaugeMin;
  const zeroPct = range > 0 ? ((0 - gaugeMin) / range) * 100 : 50;
  const valPct  = range > 0 ? Math.min(100, Math.max(0, ((gaugeValue - gaugeMin) / range) * 100)) : 50;
  const left = Math.min(zeroPct, valPct);
  const width = Math.abs(valPct - zeroPct);
  return (
    <div className="rounded px-2.5 py-2 cursor-pointer select-none"
      style={{ backgroundColor: open ? withAlpha(accent, 0.063) : withAlpha(accent, 0.024), border: `1px solid ${open ? accent : withAlpha(accent, 0.145)}`, transition: 'background-color 150ms ease, border-color 150ms ease' }}
      onClick={() => setOpen(o => !o)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.62)' }}>{label}</span>
          <span className="text-[8px] px-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.76)', fontFamily: 'monospace' }}>{open ? '▲' : '▼'}</span>
        </div>
        <span className="text-[12px]" style={{ color: accent, fontFamily: 'monospace', fontWeight: 500 }}>{value}</span>
      </div>
      <div className="relative h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="absolute top-0 bottom-0 w-px" style={{ left: `${zeroPct}%`, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 2 }} />
        <div className="absolute top-0 bottom-0 rounded-full" style={{ left: `${left}%`, width: `${Math.max(1, width)}%`, backgroundColor: withAlpha(accent, 0.749) }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>{gaugeMin}{unit}</span>
        <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>0</span>
        <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace' }}>+{gaugeMax}{unit}</span>
      </div>
      {open && (
        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${withAlpha(accent, 0.125)}` }}>
          <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>{description}</p>
          {linkedTick != null && <p className="text-[8px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>Origin: Liquidity intervention event at tick #{linkedTick.toLocaleString()}</p>}
        </div>
      )}
    </div>
  );
}

export default function TemporalMemoryPanel({ mem, eraColors, gradeLattice, priceHistory }: {
  mem: TemporalMemory;
  eraColors: ReturnType<typeof getEraColors>;
  gradeLattice: GradePrice[];
  priceHistory: HistoryEntry[];
}) {
  const { lifetimeStats: ls, principalHistory: th, scarTissue: sc, timelineStrip } = mem;
  const GRADE_ORDER_PIE = ['RAW','4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0','9.2','9.4','9.6','9.8'];

  const sortedLattice = useMemo(() =>
    [...gradeLattice].filter(g => GRADE_ORDER_PIE.includes(g.grade))
      .sort((a, b) => GRADE_ORDER_PIE.indexOf(a.grade) - GRADE_ORDER_PIE.indexOf(b.grade)),
  [gradeLattice]);

  const gradeObsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of (priceHistory || [])) map[e.grade] = (map[e.grade] || 0) + 1;
    return map;
  }, [priceHistory]);

  const usingRealVolume = sortedLattice.some(g => (g.salesVolume ?? 0) > 0);
  const volPieData = useMemo(() => sortedLattice.map(g => {
    const vol = (g.salesVolume ?? 0) > 0 ? g.salesVolume as number : (gradeObsMap[g.grade] || 0);
    return { name: g.grade, value: vol };
  }).filter(g => g.value > 0), [sortedLattice, gradeObsMap]);

  const elasticityPieData = useMemo(() => sortedLattice.filter(g => g.priceUsd > 0).map(g => ({ name: g.grade, value: g.priceUsd })), [sortedLattice]);
  const spreadMult = sc.hasScar ? Math.abs(sc.spreadAdj) : 0.001;
  const spreadPieData = useMemo(() => sortedLattice.filter(g => g.priceUsd > 0).map(g => ({ name: g.grade, value: Math.round(g.priceUsd * spreadMult * 100) / 100 || g.priceUsd })), [sortedLattice, spreadMult]);

  const statCell = (
    label: string,
    value: string,
    sub?: string,
    accent?: string,
    tooltip?: { title: string; explanation: string; formula?: string; align?: 'left' | 'center' | 'right' }
  ) => (
    <div key={label} className="flex flex-col gap-0.5">
      <div className="text-[9px] uppercase tracking-wider flex items-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
        <span>{label}</span>
        {tooltip && (
          <MetricTooltip
            title={tooltip.title}
            explanation={tooltip.explanation}
            formula={tooltip.formula}
            align={tooltip.align}
          />
        )}
      </div>
      <div className="text-[13px]" style={{ color: accent || 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>{value}</div>
      {sub && <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</div>}
    </div>
  );

  return (
    <Panel title="Temporal Memory" icon={<Clock className="w-3.5 h-3.5" />} eraColors={eraColors}>
      <div className="flex flex-col gap-4">

        <div className="flex items-center gap-4 pb-3" style={{ borderBottom: `1px solid ${withAlpha(eraColors.border, 0.071)}` }}>
          <DoomsdayClock totalEvents={th.totalEvents} highestTier={th.highestTier} />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.48)' }}>Market Intervention Record</div>
            {th.totalEvents === 0 ? (
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: 'monospace' }}>No principal interventions on record. Market physics at baseline.</div>
            ) : (
              <div className="flex gap-4 flex-wrap">
                {[
                  { label: 'Events', val: th.totalEvents.toString() },
                  { label: 'Peak Tier', val: `T${th.highestTier} · ${TIER_LABELS[th.highestTier] || '—'}`, accent: TIER_COLORS[th.highestTier] },
                  { label: 'Last', val: th.mostRecentTick != null ? `Tick #${th.mostRecentTick.toLocaleString()}` : '—' },
                ].map(({ label, val, accent }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <div className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.76)' }}>{label}</div>
                    <div className="text-[11px]" style={{ color: accent || 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {ls ? (
          <div>
            <div className="text-[9px] uppercase tracking-widest mb-2 flex items-center" style={{ color: 'rgba(255,255,255,0.48)' }}>
              <span>Lifetime Archive · CGC 9.8 Universal</span>
              <MetricTooltip
                title="Lifetime Universal Archive"
                explanation="Comprehensive longitudinal performance envelope for benchmark CGC 9.8 Universal equities across all verified transaction history."
                align="left"
              />
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3 pb-3" style={{ borderBottom: `1px solid ${withAlpha(eraColors.border, 0.082)}` }}>
              {statCell(
                'All-Time High',
                fmt(ls.allTimeHighUsd),
                undefined,
                undefined,
                {
                  title: 'All-Time High (ATH)',
                  explanation: 'Highest recorded price for a CGC 9.8 copy in verified public auction or exchange transactions across the entire recorded lifespan.',
                  formula: 'max(Price_History[9.8])',
                  align: 'left',
                }
              )}
              {statCell(
                'All-Time Low',
                fmt(ls.allTimeLowUsd),
                undefined,
                undefined,
                {
                  title: 'All-Time Low (ATL)',
                  explanation: 'Lowest verified historical price point for CGC 9.8, establishing the absolute historical macro support floor.',
                  formula: 'min(Price_History[9.8])',
                  align: 'left',
                }
              )}
              {statCell(
                'Max Drawdown',
                `−${ls.maxDrawdownPct.toFixed(1)}%`,
                'peak-to-trough',
                ls.maxDrawdownPct > 30 ? '#f87171' : ls.maxDrawdownPct > 15 ? '#f59e0b' : '#86efac',
                {
                  title: 'Macro Maximum Drawdown',
                  explanation: 'The largest historical percentage loss from an all-time peak to subsequent cyclical trough before recovery. Quantifies tail risk & capital shock depth.',
                  formula: '(Trough_Price - Peak_Price) / Peak_Price * 100%',
                  align: 'center',
                }
              )}
              {statCell(
                'Lifetime Vol',
                `${(ls.lifetimeCv * 100).toFixed(1)}%`,
                'coefficient of variation',
                undefined,
                {
                  title: 'Lifetime Volatility (CV)',
                  explanation: 'Coefficient of variation across all observation periods. Measures relative price dispersion normalized by the asset\'s long-term mean price.',
                  formula: 'σ(Price) / μ(Price) * 100%',
                  align: 'center',
                }
              )}
              {statCell(
                'Avg Recovery',
                ls.avgRecoveryPoints != null ? `${ls.avgRecoveryPoints} obs` : '—',
                'from −20% trough',
                undefined,
                {
                  title: 'Average Recovery Duration',
                  explanation: 'Mean number of discrete observation points required for the asset to reclaim its prior baseline price following a severe (-20% or deeper) market drawdown.',
                  align: 'right',
                }
              )}
              {statCell(
                'Data Span',
                ls.dataSpanDays > 365 ? `${(ls.dataSpanDays / 365).toFixed(1)}y` : `${ls.dataSpanDays}d`,
                `${ls.pricePoints.toLocaleString()} observations` ,
                undefined,
                {
                  title: 'Historical Data Span',
                  explanation: 'Total chronological duration between the first recorded historical price snapshot and the most recent verified observation point.',
                  align: 'right',
                }
              )}
            </div>
          </div>
        ) : (
          <div className="text-[10px] py-2" style={{ color: 'rgba(255,255,255,0.76)' }}>No 9.8 price history on record.</div>
        )}

        {timelineStrip.length >= 2 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.48)' }}>
                  Price Timeline · Full History (Quarterly Dynamic State Machine)
                </span>
                <MetricTooltip
                  title="Dynamic Stability Timeline"
                  explanation="Multi-period horizon vector. The glowing yellow line represents zero-equilibrium baseline stability. Segments transition dynamically: Red → Yellow → Green (breakout), Green → Yellow → Red (drawdown), Yellow → Yellow (flat stability), Red → Red (cyclical trough), and Green → Green (sustained expansion)."
                  align="left"
                />
              </div>
              {ls && <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{fmtDate(ls.firstObservation)} → {fmtDate(ls.lastObservation)}</span>}
            </div>
            <div className="rounded overflow-hidden" style={{ backgroundColor: withAlpha(eraColors.border, 0.027), border: `1px solid ${withAlpha(eraColors.border, 0.082)}`, padding: '6px 8px' }}>
              <SparklineStrip points={timelineStrip} eraColor={eraColors.border} />
            </div>
            {/* Timeline State Logic Guide */}
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[7.5px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
                  <span className="text-emerald-400">Climbing (Up from prior)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#eab308]" />
                  <span className="text-amber-400">Pacing Zero Line (Stable)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#ef4444]" />
                  <span className="text-rose-400">Declining (Down from prior)</span>
                </span>
              </div>
              <span className="text-slate-500">Hover any segment for transitional vector details</span>
            </div>
          </div>
        )}

        {sortedLattice.length > 0 && (
          <div className="pt-1">
            <div className="text-[9px] uppercase tracking-widest mb-3 flex items-center" style={{ color: 'rgba(255,255,255,0.48)' }}>
              <span>Grade Distribution · Scar Physics by Grade (3 Fault Wheels)</span>
              <MetricTooltip
                title="Grade Distribution & Fault Wheels"
                explanation="Radial decomposition of grade liquidity, valuation elasticity, and spread friction across all canonical CGC tiers from Raw to 10.0."
                align="left"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  title: 'Vol Baseline',
                  sub: sc.hasScar ? `+${(sc.volAdjustment * 100).toFixed(3)}%` : 'baseline',
                  data: volPieData,
                  footer: usingRealVolume ? 'sales by grade' : 'price obs by grade',
                  fmtTip: (val: number, name: string) => [usingRealVolume ? `${val} sales` : `${val} obs`, `CGC ${name}`] as [string, string],
                  tooltip: {
                    title: 'Volume Baseline Fault Wheel',
                    explanation: 'Proportional concentration of completed secondary market sales (or recorded price observations) distributed across individual grade tiers.',
                    align: 'left' as const,
                  },
                },
                {
                  title: 'Elasticity',
                  sub: sc.hasScar ? (sc.elasticityAdj > 0 ? `+${sc.elasticityAdj.toFixed(4)}` : sc.elasticityAdj.toFixed(4)) : 'baseline',
                  data: elasticityPieData,
                  footer: 'price weight by grade',
                  fmtTip: (val: number, name: string) => [fmt(val), `CGC ${name}`] as [string, string],
                  tooltip: {
                    title: 'Elasticity & Price Weight Wheel',
                    explanation: 'Relative capital allocation weight of each grade based on current consensus FMV. Demonstrates the non-linear premium curve of high-grade copies.',
                    align: 'center' as const,
                  },
                },
                {
                  title: 'Spread Adj',
                  sub: sc.hasScar ? (sc.spreadAdj > 0 ? `+${(sc.spreadAdj * 10000).toFixed(0)} bps` : `${(sc.spreadAdj * 10000).toFixed(0)} bps`) : 'baseline',
                  data: spreadPieData,
                  footer: 'spread exposure by grade',
                  fmtTip: (val: number, name: string) => [sc.hasScar ? `${val.toFixed(4)} spread cost` : fmt(val), `CGC ${name}`] as [string, string],
                  tooltip: {
                    title: 'Spread Friction & Exposure Wheel',
                    explanation: 'Estimated bid-ask execution drag and liquidity cost across grade tiers under prevailing market conditions.',
                    align: 'right' as const,
                  },
                },
              ].map(({ title, sub, data, footer, fmtTip, tooltip }, i) => (
                <div key={title} className="flex flex-col items-center">
                  <div className="text-[8px] uppercase tracking-widest mb-1 text-center flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>{title}</span>
                    <MetricTooltip
                      title={tooltip.title}
                      explanation={tooltip.explanation}
                      align={tooltip.align}
                    />
                  </div>
                  <div className="text-[7px] text-center mb-1 font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{sub}</div>
                  <SvgDonut
                    data={data}
                    innerRadius={28}
                    outerRadius={46}
                    fmtTip={fmtTip}
                    wheelType={i === 0 ? 'volume' : i === 1 ? 'elasticity' : 'spread'}
                  />
                  <div className="text-[7px] text-center mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{footer}</div>
                </div>
              ))}
            </div>
            {/* Legend & Meaning Guide */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[8px] font-mono">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">Grade Palette & Cohort Weight:</span>
                <span className="text-slate-500">Hover slice for percentage glow & liquidity attribution</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {sortedLattice.map(g => (
                  <div key={g.grade} className="flex items-center gap-1 group/chip cursor-pointer">
                    <div
                      className="w-2 h-2 rounded-full transition-all duration-150 group-hover/chip:scale-125"
                      style={{
                        backgroundColor: gradeColor(g.grade),
                        boxShadow: `0 0 6px ${gradeColor(g.grade)}80`,
                      }}
                    />
                    <span className="text-[7.5px] font-mono text-slate-300 group-hover/chip:text-white">{g.grade}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-[7.5px] text-slate-400 font-sans">
                <div><span className="font-bold text-sky-400">Vol Baseline:</span> Identifies grade concentration of physical trades.</div>
                <div><span className="font-bold text-purple-400">Elasticity:</span> Reveals high-grade capital gravity & steepness.</div>
                <div><span className="font-bold text-amber-400">Spread Adj:</span> Pinpoints execution drag and bid-ask cost risk.</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest mb-2 flex items-center" style={{ color: 'rgba(255,255,255,0.48)' }}>
              <span>Consortium Intervention History</span>
              <MetricTooltip
                title="Consortium Intervention History"
                explanation="Historical record of institutional stabilizer actions and liquidity interventions deployed to mitigate severe market dislocations or disorderly trading."
                align="left"
              />
            </div>
            {th.totalEvents === 0 ? (
              <div className="rounded px-3 py-2.5" style={{ backgroundColor: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>No interventions on record.</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.76)' }}>No intervention recorded during observation window.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-4 mb-1">
                  {[
                    { label: 'Interventions', val: th.totalEvents.toString() },
                    { label: 'Highest Tier', val: `T${th.highestTier} · ${TIER_LABELS[th.highestTier] || '—'}`, accent: TIER_COLORS[th.highestTier] },
                    { label: 'Last Tick', val: th.mostRecentTick != null ? `#${th.mostRecentTick.toLocaleString()}` : '—' },
                  ].map(({ label, val, accent }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                      <div className="text-[11px]" style={{ color: accent || 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{val}</div>
                    </div>
                  ))}
                </div>
                {[...th.events].slice(-3).reverse().map((ev, i) => (
                  <div key={i}><TitanEventCard ev={ev} color={TIER_COLORS[ev.tier]} /></div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[9px] uppercase tracking-widest mb-2 flex items-center" style={{ color: 'rgba(255,255,255,0.48)' }}>
              <span>Scar Tissue · Permanent Market Memory</span>
              <MetricTooltip
                title="Permanent Scar Tissue"
                explanation="Persistent adjustments to volatility floors, demand elasticity, and bid-ask spreads reflecting the asset's structural recovery from past market distress."
                align="right"
              />
            </div>
            {!sc.hasScar ? (
              <div className="rounded px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>Scar Tissue: None</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>No principal interventions recorded. Vol, elasticity & spread are at baseline.</div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <ScarMetricCard label="Vol Baseline"
                  value={sc.volAdjustment > 0 ? `+${(sc.volAdjustment * 100).toFixed(3)}%` : `${(sc.volAdjustment * 100).toFixed(3)}%`}
                  accent={sc.volAdjustment > 0 ? '#f87171' : '#4ade80'}
                  gaugeValue={sc.volAdjustment * 100} gaugeMin={-5} gaugeMax={5} unit="%"
                  description="Permanent volatility floor adjustment. Positive values mean each tick carries more price variance — execution becomes less predictable."
                  linkedTick={th.events[th.events?.length - 1]?.tick} />
                <ScarMetricCard label="Elasticity Residue"
                  value={sc.elasticityAdj > 0 ? `+${sc.elasticityAdj.toFixed(4)}` : `${sc.elasticityAdj.toFixed(4)}`}
                  accent={sc.elasticityAdj < 0 ? '#f87171' : '#fde68a'}
                  gaugeValue={sc.elasticityAdj} gaugeMin={-0.5} gaugeMax={0.5} unit=""
                  description="Permanent price elasticity modifier. Negative values mean this market responds less forcefully to demand pressure."
                  linkedTick={th.events[th.events?.length - 1]?.tick} />
                <ScarMetricCard label="Spread Adj"
                  value={sc.spreadAdj > 0 ? `+${(sc.spreadAdj * 10000).toFixed(0)} bps` : `${(sc.spreadAdj * 10000).toFixed(0)} bps`}
                  accent={sc.spreadAdj > 0 ? '#f87171' : '#4ade80'}
                  gaugeValue={sc.spreadAdj * 10000} gaugeMin={-100} gaugeMax={100} unit=" bps"
                  description="Permanent bid-ask spread penalty on all transactions. This is the market's permanent memory of liquidity stress."
                  linkedTick={th.events[th.events?.length - 1]?.tick} />
              </div>
            )}
          </div>
        </div>

      </div>
    </Panel>
  );
}

'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  Info,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import { withAlpha } from '@/lib/colorUtils';
import { useTooltipsEnabled } from '@/components/shell/tooltip-toggle';
import type { TemporalMemory, GradePrice, HistoryEntry, TitanEvent } from './types';
import Panel from './Panel';
import { fmt, fmtDate } from './shared';

/* -------------------------------------------------------------------------- */
/* Constants & Helpers                                                        */
/* -------------------------------------------------------------------------- */

const TIER_LABELS = [
  'Equilibrium (Normal)',
  'Mild Volatility',
  'Market Stress',
  'Structural Drawdown',
  'Severe Liquidity Shock',
  'Market Dislocation',
  'Systemic Crisis',
];

const TIER_COLORS = ['#4ade80', '#86efac', '#fde68a', '#f59e0b', '#fb923c', '#f87171', '#dc2626'];

const GRADE_PIE_COLORS: Record<string, string> = {
  RAW: '#64748b',
  '4.0': '#94a3b8',
  '4.5': '#94a3b8',
  '5.0': '#7c8ea0',
  '5.5': '#7c8ea0',
  '6.0': '#38bdf8',
  '6.5': '#38bdf8',
  '7.0': '#0ea5e9',
  '7.5': '#0ea5e9',
  '8.0': '#6366f1',
  '8.5': '#6366f1',
  '9.0': '#8b5cf6',
  '9.2': '#a855f7',
  '9.4': '#c084fc',
  '9.6': '#d946ef',
  '9.8': '#06b6d4',
  '9.9': '#f59e0b',
  '10.0': '#fde68a',
};

const gradeColor = (g: string) => GRADE_PIE_COLORS[g] ?? '#64748b';

/* -------------------------------------------------------------------------- */
/* Interactive Metric Tooltip with Large Readable Font                         */
/* -------------------------------------------------------------------------- */

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
    <div className="relative inline-flex items-center group/tip ml-1.5 align-middle">
      <span
        tabIndex={0}
        role="button"
        aria-label={`Explanation for ${title}`}
        className="cursor-help text-slate-400 hover:text-cyan-300 transition-colors p-1 rounded hover:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      >
        <Info className="w-3.5 h-3.5 opacity-80 group-hover/tip:opacity-100" />
      </span>
      <div
        className={`absolute bottom-full mb-2 hidden group-hover/tip:flex group-focus-within/tip:flex flex-col z-50 w-72 sm:w-80 p-3.5 rounded-xl bg-slate-950/98 border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-left backdrop-blur-xl pointer-events-none transition-all duration-150 ${alignClass}`}
      >
        <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span>{title}</span>
          <span className="text-[10px] font-mono text-slate-400">BENCHMARK DEFINITION</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-200">{explanation}</p>
        {formula && (
          <div className="mt-2 pt-1.5 border-t border-slate-800/90 font-mono text-[11px] text-amber-300 bg-slate-900/90 rounded-md px-2 py-1">
            <span className="text-slate-400 mr-1.5 font-bold">Formula:</span>
            {formula}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Market Health & Stability Gauge (Plain English & Large Readable Display)   */
/* -------------------------------------------------------------------------- */

function MarketHealthGauge({
  totalEvents,
  highestTier,
  accentColor,
}: {
  totalEvents: number;
  highestTier: number;
  accentColor: string;
}) {
  const isClear = totalEvents === 0;
  const statusColor = isClear ? '#10b981' : highestTier <= 2 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-inner">
      <div className="flex items-center gap-3.5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg border"
          style={{
            backgroundColor: `${statusColor}18`,
            borderColor: `${statusColor}40`,
            boxShadow: `0 0 16px ${statusColor}30`,
          }}
        >
          {isClear ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Market Stability Profile
            </span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5"
              style={{
                backgroundColor: `${statusColor}22`,
                color: statusColor,
                border: `1px solid ${statusColor}44`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: statusColor }}
              />
              {isClear ? 'Equilibrium (Organic Discovery)' : `Tier ${highestTier} Stress Event`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-relaxed">
            {isClear
              ? 'Market operates purely on organic buyer and seller auction discovery. Zero artificial price interventions or emergency liquidity halts on record.'
              : `Consortium stabilizer action recorded. Market experienced ${TIER_LABELS[highestTier]} conditions during historical shocks.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono">
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Stabilizer Events</div>
          <div className="text-base sm:text-lg font-bold text-white">
            {totalEvents === 0 ? '0 on record' : `${totalEvents} logged`}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Interactive Longitudinal Price Chart (Replaces the "Multicolored Snake")    */
/* -------------------------------------------------------------------------- */

function InteractivePriceChart({
  points,
  eraColor,
  allTimeHigh,
  allTimeLow,
}: {
  points: { date: string; priceUsd: number }[];
  eraColor: string;
  allTimeHigh: number;
  allTimeLow: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'ALL' | '5Y' | '3Y' | '1Y'>('ALL');
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Filter points based on selected time range
  const filteredPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    if (timeRange === 'ALL') return points;

    const now = new Date(points[points.length - 1].date).getTime();
    const years = timeRange === '5Y' ? 5 : timeRange === '3Y' ? 3 : 1;
    const cutoff = now - years * 365.25 * 24 * 3600 * 1000;

    const subset = points.filter((p) => new Date(p.date).getTime() >= cutoff);
    return subset.length >= 2 ? subset : points;
  }, [points, timeRange]);

  if (filteredPoints.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center text-xs font-mono text-slate-400">
        Insufficient chronological observations for timeline rendering.
      </div>
    );
  }

  // Calculate coordinates & bounds
  const W = 800;
  const H = 220;
  const PAD_TOP = 25;
  const PAD_BOTTOM = 35;
  const PAD_LEFT = 65;
  const PAD_RIGHT = 30;

  const prices = filteredPoints.map((p) => p.priceUsd);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const priceRange = maxP - minP || 1;

  // Historical average price anchor
  const baselinePrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

  // Map to canvas
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const getX = (idx: number) => PAD_LEFT + (idx / (filteredPoints.length - 1)) * innerW;
  const getY = (val: number) => PAD_TOP + innerH - ((val - minP) / priceRange) * innerH;

  const baselineY = getY(baselinePrice);

  // SVG Line & Area paths
  const pts = filteredPoints.map((p, i) => ({
    x: getX(i),
    y: getY(p.priceUsd),
    point: p,
    idx: i,
  }));

  const linePath = `M ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} L ${pts[0].x.toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} Z`;

  // Active inspected point (pinned takes precedence, otherwise hover, fallback to latest)
  const activeIdx = pinnedIdx ?? hoverIdx ?? filteredPoints.length - 1;
  const activePoint = pts[activeIdx];
  const priorPoint = activeIdx > 0 ? pts[activeIdx - 1] : null;

  const deltaVsPrior = priorPoint ? activePoint.point.priceUsd - priorPoint.point.priceUsd : 0;
  const pctVsPrior = priorPoint && priorPoint.point.priceUsd > 0 ? (deltaVsPrior / priorPoint.point.priceUsd) * 100 : 0;

  const startPoint = pts[0];
  const deltaVsStart = activePoint.point.priceUsd - startPoint.point.priceUsd;
  const pctVsStart = startPoint.point.priceUsd > 0 ? (deltaVsStart / startPoint.point.priceUsd) * 100 : 0;

  // Mouse move handler for scrubbing across the timeline
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const svgX = (clientX / rect.width) * W;

      // Find nearest point
      let nearestIdx = 0;
      let minDistance = Infinity;
      pts.forEach((pt, i) => {
        const dist = Math.abs(pt.x - svgX);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      });
      setHoverIdx(nearestIdx);
    },
    [pts, W]
  );

  // Y-axis grid increments (4 ticks)
  const yTicks = [
    minP,
    minP + priceRange * 0.33,
    minP + priceRange * 0.67,
    maxP,
  ];

  // X-axis label samples (up to 5 readable labels)
  const xStep = Math.max(1, Math.floor((pts.length - 1) / 4));
  const xLabels = pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % xStep === 0);

  // Peak and trough indices
  const peakIdx = prices.indexOf(maxP);
  const troughIdx = prices.indexOf(minP);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Header & Range Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white font-sans tracking-wide">
              Longitudinal Valuation Trajectory
            </h4>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded-md">
              CGC 9.8 Universal
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Verified historical transaction line with quarterly equilibrium baseline anchor.
          </p>
        </div>

        {/* Interactive Time Horizon Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
          {(['ALL', '5Y', '3Y', '1Y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setTimeRange(r);
                setPinnedIdx(null);
              }}
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md transition-all ${
                timeRange === r
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Interactive HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Observed Date
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{fmtDate(activePoint.point.date)}</span>
            </div>
          </div>

          <div className="border-l border-slate-800 pl-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Historical Valuation
            </div>
            <div className="text-lg sm:text-xl font-extrabold font-mono text-cyan-300">
              {fmt(activePoint.point.priceUsd)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Change vs Prior
            </div>
            <div
              className={`text-sm font-bold font-mono flex items-center gap-1 justify-end ${
                deltaVsPrior > 0
                  ? 'text-emerald-400'
                  : deltaVsPrior < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {deltaVsPrior > 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : deltaVsPrior < 0 ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : null}
              <span>
                {deltaVsPrior >= 0 ? '+' : ''}
                {pctVsPrior.toFixed(1)}% ({fmt(deltaVsPrior)})
              </span>
            </div>
          </div>

          <div className="text-right border-l border-slate-800 pl-4 hidden sm:block">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Net Cycle Return
            </div>
            <div
              className={`text-sm font-bold font-mono ${
                pctVsStart >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {pctVsStart >= 0 ? '+' : ''}
              {pctVsStart.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 sm:p-3 overflow-hidden shadow-2xl">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          className="overflow-visible block cursor-crosshair select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          onClick={() => {
            if (hoverIdx !== null) {
              setPinnedIdx(pinnedIdx === hoverIdx ? null : hoverIdx);
            }
          }}
        >
          <defs>
            <linearGradient id="equity-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
            </linearGradient>
            <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val, i) => {
            const y = getY(val);
            return (
              <g key={i}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={W - PAD_RIGHT}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD_LEFT - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.6)"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {fmt(val)}
                </text>
              </g>
            );
          })}

          {/* Historical Average Baseline */}
          <line
            x1={PAD_LEFT}
            y1={baselineY}
            x2={W - PAD_RIGHT}
            y2={baselineY}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            strokeOpacity="0.75"
          />
          <text
            x={W - PAD_RIGHT}
            y={baselineY - 6}
            textAnchor="end"
            fill="#f59e0b"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Historical Average: {fmt(baselinePrice)}
          </text>

          {/* Area Fill */}
          <path d={areaPath} fill="url(#equity-area-gradient)" />

          {/* Primary Crisp Price Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#chart-glow)"
          />

          {/* Peak (ATH) Marker */}
          {peakIdx >= 0 && pts[peakIdx] && (
            <g>
              <circle
                cx={pts[peakIdx].x}
                cy={pts[peakIdx].y}
                r="5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={pts[peakIdx].x}
                y={pts[peakIdx].y - 9}
                textAnchor="middle"
                fill="#10b981"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ATH {fmt(maxP)}
              </text>
            </g>
          )}

          {/* Trough (Floor) Marker */}
          {troughIdx >= 0 && pts[troughIdx] && (
            <g>
              <circle
                cx={pts[troughIdx].x}
                cy={pts[troughIdx].y}
                r="5"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={pts[troughIdx].x}
                y={pts[troughIdx].y + 16}
                textAnchor="middle"
                fill="#ef4444"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                FLOOR {fmt(minP)}
              </text>
            </g>
          )}

          {/* Scrubber Crosshair Guide Line */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={PAD_TOP}
                x2={activePoint.x}
                y2={PAD_TOP + innerH}
                stroke="#06b6d4"
                strokeWidth="1.8"
                strokeDasharray="3 3"
                strokeOpacity="0.85"
              />
              {/* Outer pulsing ring */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="10"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeOpacity="0.5"
                className="animate-ping"
              />
              {/* Center point */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#ffffff"
                stroke="#06b6d4"
                strokeWidth="3"
              />
            </g>
          )}

          {/* X-Axis Date Labels */}
          {xLabels.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={H - 10}
              textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
              fill="rgba(255,255,255,0.65)"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="500"
            >
              {fmtDate(pt.point.date)}
            </text>
          ))}
        </svg>

        {/* Instructions / Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300 font-sans">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
              <span className="font-semibold text-white">Historical Price Trajectory</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
              <span className="font-semibold text-amber-300">Historical Average Floor</span>
            </span>
          </div>

          <div className="text-slate-400 font-mono text-[11px]">
            Hover or tap anywhere to scrub · Click to pin observation point
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Donut Chart Component with High-Contrast Typography & Clear Slice Labels    */
/* -------------------------------------------------------------------------- */

function SvgDonut({
  data,
  size = 140,
  innerRadius = 38,
  outerRadius = 58,
  title,
  subtitle,
  selectedGrade,
  onSelectGrade,
  fmtTip,
}: {
  data: { name: string; value: number }[];
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  title: string;
  subtitle: string;
  selectedGrade: string | null;
  onSelectGrade: (grade: string | null) => void;
  fmtTip: (val: number, name: string) => [string, string];
}) {
  const [hovered, setHovered] = useState<{ name: string; value: number; color: string; pct: number } | null>(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const center = size / 2;
  const radius = (innerRadius + outerRadius) / 2;
  const strokeWidth = outerRadius - innerRadius;
  const circumference = 2 * Math.PI * radius;

  if (total === 0 || data.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-xs font-mono text-slate-400">
        <span>No cohort transactions recorded</span>
      </div>
    );
  }

  // Active slice highlighted (selected takes priority)
  const activeGrade = selectedGrade ?? hovered?.name;
  let accumulated = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-1.5">
        <h5 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">{title}</h5>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>

      <div className="relative flex items-center justify-center my-1" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Base outer glow */}
          <circle
            cx={center}
            cy={center}
            r={radius + 4}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1.5}
          />

          {data.map((slice) => {
            const sliceRatio = slice.value / total;
            const strokeLength = sliceRatio * circumference;
            const offset = accumulated * circumference;
            accumulated += sliceRatio;

            const baseColor = gradeColor(slice.name);
            const isMatch = activeGrade === slice.name;

            return (
              <circle
                key={slice.name}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={baseColor}
                strokeWidth={isMatch ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  strokeLinecap: 'butt',
                  opacity: activeGrade && !isMatch ? 0.35 : 1,
                  filter: isMatch ? `drop-shadow(0 0 10px ${baseColor})` : 'none',
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
                onClick={() => onSelectGrade(selectedGrade === slice.name ? null : slice.name)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeGrade ? (
            <>
              <span
                className="text-xl sm:text-2xl font-mono font-extrabold leading-none"
                style={{ color: gradeColor(activeGrade) }}
              >
                {Math.round(
                  ((data.find((d) => d.name === activeGrade)?.value ?? 0) / total) * 100
                )}
                %
              </span>
              <span className="text-xs font-mono font-bold text-white mt-1">
                CGC {activeGrade}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                COHORT
              </span>
              <span className="text-[11px] font-mono text-slate-400">100%</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Component: TemporalMemoryPanel                                        */
/* -------------------------------------------------------------------------- */

export default function TemporalMemoryPanel({
  mem,
  eraColors,
  gradeLattice,
  priceHistory,
}: {
  mem: TemporalMemory;
  eraColors: ReturnType<typeof getEraColors>;
  gradeLattice: GradePrice[];
  priceHistory: HistoryEntry[];
}) {
  const { lifetimeStats: ls, principalHistory: th, scarTissue: sc, timelineStrip } = mem;

  // Selected Grade Filter State across all 3 wheels
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  // Selected Stat Card to display expanded insight drawer
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

  const GRADE_ORDER_PIE = [
    'RAW',
    '4.0',
    '4.5',
    '5.0',
    '5.5',
    '6.0',
    '6.5',
    '7.0',
    '7.5',
    '8.0',
    '8.5',
    '9.0',
    '9.2',
    '9.4',
    '9.6',
    '9.8',
  ];

  const sortedLattice = useMemo(
    () =>
      [...gradeLattice]
        .filter((g) => GRADE_ORDER_PIE.includes(g.grade))
        .sort((a, b) => GRADE_ORDER_PIE.indexOf(a.grade) - GRADE_ORDER_PIE.indexOf(b.grade)),
    [gradeLattice]
  );

  const gradeObsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of priceHistory || []) map[e.grade] = (map[e.grade] || 0) + 1;
    return map;
  }, [priceHistory]);

  const usingRealVolume = sortedLattice.some((g) => (g.salesVolume ?? 0) > 0);

  // 1. Sales Volume Share (Units traded)
  const volPieData = useMemo(
    () =>
      sortedLattice
        .map((g) => {
          const vol =
            (g.salesVolume ?? 0) > 0 ? (g.salesVolume as number) : gradeObsMap[g.grade] || 0;
          return { name: g.grade, value: vol };
        })
        .filter((g) => g.value > 0),
    [sortedLattice, gradeObsMap]
  );

  // 2. Capital Weight (Dollar allocation by consensus FMV)
  const elasticityPieData = useMemo(
    () =>
      sortedLattice
        .filter((g) => g.priceUsd > 0)
        .map((g) => ({ name: g.grade, value: g.priceUsd })),
    [sortedLattice]
  );

  // 3. Trading Friction / Spread Drag
  const spreadMult = sc.hasScar ? Math.abs(sc.spreadAdj) : 0.001;
  const spreadPieData = useMemo(
    () =>
      sortedLattice
        .filter((g) => g.priceUsd > 0)
        .map((g) => ({
          name: g.grade,
          value: Math.round(g.priceUsd * spreadMult * 100) / 100 || g.priceUsd,
        })),
    [sortedLattice, spreadMult]
  );

  // Stat Cards definitions with full human-friendly explanations
  const STAT_CARDS = ls
    ? [
        {
          id: 'ath',
          label: 'All-Time High',
          value: fmt(ls.allTimeHighUsd),
          sub: 'Historical Peak',
          color: '#10b981',
          title: 'All-Time High (ATH)',
          explanation:
            'The highest confirmed auction or exchange sale price for a CGC 9.8 copy in verified transaction history.',
          formula: 'max(Price_History[CGC 9.8])',
          takeaway:
            'Represents the asset’s bull-market ceiling. Provides context on how far the current market is trading below its historic peak.',
        },
        {
          id: 'atl',
          label: 'All-Time Low',
          value: fmt(ls.allTimeLowUsd),
          sub: 'Historical Floor',
          color: '#38bdf8',
          title: 'All-Time Low (ATL)',
          explanation:
            'The lowest verified historical price point for a CGC 9.8 copy, establishing the asset’s absolute historical support foundation.',
          formula: 'min(Price_History[CGC 9.8])',
          takeaway:
            'Acts as the structural macro support level. Major institutional collectors treat this as the non-breakdown floor.',
        },
        {
          id: 'drawdown',
          label: 'Max Drawdown',
          value: `−${ls.maxDrawdownPct.toFixed(1)}%`,
          sub: 'Peak-to-Trough',
          color: ls.maxDrawdownPct > 35 ? '#f87171' : ls.maxDrawdownPct > 20 ? '#f59e0b' : '#34d399',
          title: 'Maximum Historical Drawdown',
          explanation:
            'The largest percentage loss experienced from a major market peak to its subsequent cyclical trough before recovery began.',
          formula: '(Trough_Price − Peak_Price) / Peak_Price * 100%',
          takeaway:
            'Measures historical capital shock risk. Demonstrates how severe cyclical market pullbacks have been in the past.',
        },
        {
          id: 'volatility',
          label: 'Lifetime Volatility',
          value: `${(ls.lifetimeCv * 100).toFixed(1)}%`,
          sub: 'Normalized CV',
          color: '#a78bfa',
          title: 'Lifetime Volatility (Coefficient of Variation)',
          explanation:
            'Relative price dispersion normalized against the asset’s long-term historical mean valuation.',
          formula: 'Standard_Deviation(Price) / Mean(Price) * 100%',
          takeaway:
            'Lower volatility (< 25%) indicates steady, institutional-grade blue-chip price discovery; higher volatility indicates aggressive speculative runs.',
        },
        {
          id: 'recovery',
          label: 'Avg Recovery Time',
          value: ls.avgRecoveryPoints != null ? `${ls.avgRecoveryPoints} cycles` : '1 cycle',
          sub: 'From −20% Drawdown',
          color: '#f59e0b',
          title: 'Average Recovery Duration',
          explanation:
            'Average number of observation periods required for the equity to reclaim its prior baseline price following a deep market drawdown.',
          formula: 'Mean(Trough_to_Rebound_Intervals)',
          takeaway:
            'Quantifies market resilience: how quickly buyer liquidity steps in to absorb discounted supply during cyclical corrections.',
        },
        {
          id: 'dataspan',
          label: 'Historical Data Span',
          value: ls.dataSpanDays > 365 ? `${(ls.dataSpanDays / 365).toFixed(1)} Years` : `${ls.dataSpanDays} Days`,
          sub: `${ls.pricePoints.toLocaleString()} Observations`,
          color: '#cbd5e1',
          title: 'Longitudinal Observation Archive',
          explanation:
            'Total chronological duration of recorded, validated pricing transactions and auction ledger entries.',
          formula: 'Last_Observation_Date − First_Observation_Date',
          takeaway:
            'Longer histories provide statistically robust trendlines and high-confidence support/resistance levels.',
        },
      ]
    : [];

  return (
    <Panel
      title="Temporal Memory & Price History"
      icon={<Clock className="w-4 h-4 text-cyan-400" />}
      eraColors={eraColors}
    >
      <div className="flex flex-col gap-6">
        {/* 1. Market Stability Profile */}
        <MarketHealthGauge
          totalEvents={th.totalEvents}
          highestTier={th.highestTier}
          accentColor={eraColors.border}
        />

        {/* 2. Lifetime Benchmark Metrics */}
        {ls && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-bold text-white font-sans tracking-wide">
                  Lifetime Performance Metrics
                </h4>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                  CGC 9.8 Universal Anchor
                </span>
                <MetricTooltip
                  title="Universal Performance Envelope"
                  explanation="Longitudinal statistical envelope compiled across all verified transactions for benchmark CGC 9.8 copies."
                  align="left"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Click any metric card to expand details
              </span>
            </div>

            {/* 6 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {STAT_CARDS.map((stat) => {
                const isSelected = selectedStat === stat.id;
                return (
                  <div
                    key={stat.id}
                    onClick={() => setSelectedStat(isSelected ? null : stat.id)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900/95 border-cyan-500 shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold truncate">
                          {stat.label}
                        </span>
                        <Info className="w-3 h-3 text-slate-500 shrink-0" />
                      </div>
                      <div
                        className="text-lg sm:text-xl font-extrabold font-mono"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-1.5 pt-1.5 border-t border-slate-800/60">
                      {stat.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Insight Drawer for Clicked Stat */}
            {selectedStat && (
              <div className="p-4 rounded-xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl flex flex-col gap-2 transition-all">
                {(() => {
                  const card = STAT_CARDS.find((c) => c.id === selectedStat);
                  if (!card) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: card.color }}
                          />
                          <h5 className="text-sm font-bold text-white">{card.title}</h5>
                          <span className="text-xs font-mono font-bold" style={{ color: card.color }}>
                            {card.value}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedStat(null)}
                          className="text-xs font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mt-1">
                        {card.explanation}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-slate-400 font-bold block mb-1">
                            Mathematical Formulation:
                          </span>
                          <span className="font-mono text-amber-300 text-[11px]">{card.formula}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-cyan-400 font-bold block mb-1">
                            Investor Interpretation:
                          </span>
                          <span className="text-slate-300 text-xs">{card.takeaway}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 3. Longitudinal Price Trajectory Chart (Replaces the "Multicolored Snake") */}
        {timelineStrip && timelineStrip.length >= 2 && (
          <InteractivePriceChart
            points={timelineStrip}
            eraColor={eraColors.border}
            allTimeHigh={ls?.allTimeHighUsd ?? 0}
            allTimeLow={ls?.allTimeLowUsd ?? 0}
          />
        )}

        {/* 4. Grade Breakdown & Fault Wheels */}
        {sortedLattice.length > 0 && (
          <div className="flex flex-col gap-3.5 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-white font-sans tracking-wide">
                    Grade Census & Liquidity Breakdown
                  </h4>
                  <MetricTooltip
                    title="Grade Census & Liquidity Radial Decomposition"
                    explanation="Multi-axis radial distribution comparing trade velocity, capital weight, and bid-ask spread drag across certified grades."
                    align="left"
                  />
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Understand how physical sales, invested dollars, and liquidity friction divide across grades.
                </p>
              </div>

              {selectedGrade && (
                <button
                  onClick={() => setSelectedGrade(null)}
                  className="text-xs font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-1 rounded-md hover:bg-cyan-900/50"
                >
                  Reset Filter (Show All)
                </button>
              )}
            </div>

            {/* Interactive Grade Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">Filter Grade:</span>
              <button
                onClick={() => setSelectedGrade(null)}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md shrink-0 transition-all ${
                  selectedGrade === null
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Grades
              </button>
              {sortedLattice.map((g) => {
                const isSelected = selectedGrade === g.grade;
                const c = gradeColor(g.grade);
                return (
                  <button
                    key={g.grade}
                    onClick={() => setSelectedGrade(isSelected ? null : g.grade)}
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md shrink-0 flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-lg'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
                    }`}
                    style={{
                      borderColor: isSelected ? c : undefined,
                      boxShadow: isSelected ? `0 0 12px ${c}50` : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                    <span>{g.grade}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Grade Intelligence Spotlight Banner */}
            {selectedGrade && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-extrabold text-sm text-white shadow-lg"
                    style={{ backgroundColor: gradeColor(selectedGrade) }}
                  >
                    {selectedGrade}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Selected Grade Profile
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      CGC {selectedGrade} Universal
                    </div>
                  </div>
                </div>

                {(() => {
                  const entry = sortedLattice.find((g) => g.grade === selectedGrade);
                  const price = entry?.priceUsd ?? 0;
                  const vol = (entry?.salesVolume ?? 0) > 0 ? entry?.salesVolume : gradeObsMap[selectedGrade] || 0;
                  return (
                    <div className="flex items-center gap-6 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Consensus FMV</span>
                        <span className="text-base font-bold text-cyan-300">{fmt(price)}</span>
                      </div>
                      <div className="border-l border-slate-800 pl-4">
                        <span className="text-slate-400 block text-[11px]">Market Trades</span>
                        <span className="text-base font-bold text-white">
                          {vol} {usingRealVolume ? 'sales' : 'obs'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 3 Donut Wheels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <SvgDonut
                data={volPieData}
                size={140}
                title="Sales Volume"
                subtitle={usingRealVolume ? 'Completed market sales by grade' : 'Historical price records'}
                selectedGrade={selectedGrade}
                onSelectGrade={setSelectedGrade}
                fmtTip={(val, name) => [usingRealVolume ? `${val} sales` : `${val} obs`, `CGC ${name}`]}
              />

              <SvgDonut
                data={elasticityPieData}
                size={140}
                title="Capital Weight"
                subtitle="Relative market value allocation"
                selectedGrade={selectedGrade}
                onSelectGrade={setSelectedGrade}
                fmtTip={(val, name) => [fmt(val), `CGC ${name}`]}
              />

              <SvgDonut
                data={spreadPieData}
                size={140}
                title="Spread Drag"
                subtitle="Estimated execution friction"
                selectedGrade={selectedGrade}
                onSelectGrade={setSelectedGrade}
                fmtTip={(val, name) => [sc.hasScar ? `${val.toFixed(4)} spread friction` : fmt(val), `CGC ${name}`]}
              />
            </div>

            {/* Plain English Guide below wheels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
              <div>
                <span className="font-bold text-cyan-400 block mb-0.5">1. Sales Volume Share:</span>
                Identifies which grade tiers sell the most units. High volume means rapid liquidity and quick fills.
              </div>
              <div>
                <span className="font-bold text-purple-400 block mb-0.5">2. Capital Weight:</span>
                Demonstrates where the total invested money sits. High-grade copies (9.8/9.6) typically command 70%+ of total value.
              </div>
              <div>
                <span className="font-bold text-amber-400 block mb-0.5">3. Spread Drag:</span>
                Reveals the estimated bid-ask spread cost for each grade tier under current market liquidity.
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Sliders, ChevronLeft, ChevronRight, RotateCcw, Minus, Plus } from 'lucide-react';
import {
  createChart,
  ColorType,
  LineStyle,
  AreaSeries as AreaSeriesDef,
  LineSeries as LineSeriesDef,
  CandlestickSeries as CandlestickSeriesDef,
  BarSeries as BarSeriesDef,
  HistogramSeries as HistogramSeriesDef,
  createSeriesMarkers,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { BollingerPoint } from './types';

export type ChartType = 'area' | 'line' | 'spline' | 'column' | 'candlestick' | 'ohlc';
export type SubIndicator = 'rsi' | 'macd' | 'none' | 'hax-vol';
export type Timeframe = '1Y' | '2Y' | '3Y' | '5Y' | 'ALL';

interface Props {
  pricePoints: [number, number][];
  ohlcPoints: [number, number, number, number, number][];
  chartType: ChartType;
  trendColor: string;
  eraColor: string;
  showBollinger: boolean;
  bollingerData: BollingerPoint[];
  heritageData?: Array<{ sold_at: string; price_usd: number; grade: string }>;
  showVolume: boolean;
  volPoints: [number, number][];
  heritageVolByGrade: [number, number][];
  hasRealVol: boolean;
  subIndicator: SubIndicator;
  rsiAligned: [number, number][];
  macdData: { macd: number[]; signal: number[]; hist: number[]; times: number[] } | null;
  heritageVolPoints: [number, number][];
  hasSubPane: boolean;
  height: number;
  grade: string;
  timeframe?: Timeframe;
  showSalesTags?: boolean;
  onToggleSubPane?: () => void;
}

const toSec = (ms: number): UTCTimestamp => Math.floor(ms / 1000) as UTCTimestamp;

function fmtUsd(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (abs >= 10000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${Math.round(val).toLocaleString()}`;
}

function fmtDelta(diff: number): string {
  const sign = diff >= 0 ? '+' : '-';
  const abs = Math.abs(diff);
  if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

/**
 * Directional Secondary Market Comp Marker Engine.
 * 
 * Financial Semantics:
 * • Green Up-Arrow (▲ / arrowUp belowBar): Price traveled UP vs previous comp (+Δ).
 * • Red Down-Arrow (▼ / arrowDown aboveBar): Price traveled DOWN vs previous comp (-Δ).
 * • Gold Crown Arrow (👑): All-Time High Apex transaction.
 * • Cyan Circle (● / circle): Inception/baseline comp or flat price.
 * 
 * Granularity & Collision Prevention:
 * • Dynamic spacing scaled by timeframe: when spread out (1Y/2Y), gap shrinks so nearly every comp displays its dollar delta.
 * • Clustered comps still receive directional green/red arrows without overlapping text labels.
 */
function applyMarkers(
  series: any,
  items?: Array<{ sold_at: string; price_usd: number; grade: string }>,
  showSalesTags: boolean = true,
  timeframe: Timeframe = 'ALL'
) {
  if (!series || !items?.length) return;
  try {
    const valid = items.filter(
      (s) => s && s.sold_at && !isNaN(new Date(s.sold_at).getTime()) && s.price_usd != null && s.price_usd > 0
    );
    if (!valid.length) return;

    // Identify absolute peak sale (ATH) in this dataset
    let maxSale = valid[0];
    for (const s of valid) {
      if (s.price_usd > maxSale.price_usd) {
        maxSale = s;
      }
    }

    const sorted = [...valid].sort(
      (a, b) => new Date(a.sold_at).getTime() - new Date(b.sold_at).getTime()
    );

    // Strict anti-collision spacing so text numbers NEVER overlap or crowd each other
    let minGapDays = 150;
    if (timeframe === '1Y') minGapDays = 40;
    else if (timeframe === '2Y') minGapDays = 75;
    else if (timeframe === '3Y') minGapDays = 100;
    else if (timeframe === '5Y') minGapDays = 130;
    else minGapDays = 150;

    const MIN_LABEL_GAP_SEC = minGapDays * 86400;
    let lastLabeledTimeSec = -Infinity;

    const markers = sorted.map((s, idx) => {
      const timeSec = toSec(new Date(s.sold_at).getTime());
      const isMax = s === maxSale;
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const diff = prev ? s.price_usd - prev.price_usd : 0;
      const isInitial = idx === 0;

      // Anti-collision check: only label when sufficiently spaced to prevent number overlap
      const canShowText = isMax || (showSalesTags && (timeSec - lastLabeledTimeSec >= MIN_LABEL_GAP_SEC));
      if (canShowText) {
        lastLabeledTimeSec = timeSec;
      }

      // Determine directional trajectory
      let shape: 'arrowUp' | 'arrowDown' | 'circle' = 'circle';
      let position: 'belowBar' | 'aboveBar' = 'belowBar';
      let color = '#38bdf8'; // Cyan default for initial/flat
      let size: 1 | 2 = 1;

      if (isMax) {
        shape = 'arrowUp';
        position = 'belowBar';
        color = '#fbbf24'; // Gold amber for ATH crown
        size = 2;
      } else if (isInitial) {
        shape = 'circle';
        position = 'belowBar';
        color = '#38bdf8'; // Baseline inception sale
        size = 1;
      } else if (diff > 0) {
        shape = 'arrowUp';
        position = 'belowBar';
        color = '#22c55e'; // Emerald green: price climbed up
        size = 1;
      } else if (diff < 0) {
        shape = 'arrowDown';
        position = 'aboveBar';
        color = '#ef4444'; // Rose red: price pulled down
        size = 1;
      } else {
        shape = 'circle';
        position = 'belowBar';
        color = '#94a3b8'; // Neutral gray: exact flat repeat
        size = 1;
      }

      // Format clean, concise text showing transaction price without crowding adjacent numbers
      let text: string | undefined = undefined;
      if (canShowText) {
        if (isMax) {
          text = `👑 ${fmtUsd(s.price_usd)}`;
        } else if (diff !== 0) {
          const deltaSign = diff > 0 ? '+' : '';
          text = `${fmtUsd(s.price_usd)} (${deltaSign}${fmtUsd(diff)})`;
        } else {
          text = `${fmtUsd(s.price_usd)}`;
        }
      }

      return {
        time: timeSec,
        position,
        color,
        shape,
        size,
        text,
      };
    });

    if (typeof (series as any).setMarkers === 'function') {
      (series as any).setMarkers(markers);
    } else if (typeof createSeriesMarkers === 'function') {
      createSeriesMarkers(series, markers);
    }
  } catch (err) {
    console.warn('[LWTradingChart] Failed to apply markers:', err);
  }
}

function dedupByTime<T extends { time: UTCTimestamp }>(arr: T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!seen.has(arr[i].time)) {
      seen.add(arr[i].time);
      out.unshift(arr[i]);
    }
  }
  return out;
}

const DARK_BG = 'transparent';
const TEXT_COLOR = 'rgba(255,255,255,0.50)';
const GRID_COLOR = 'rgba(255,255,255,0.04)';
const BORDER_COLOR = 'rgba(255,255,255,0.08)';
const CROSSHAIR_COLOR = 'rgba(255,255,255,0.20)';

export default function LWTradingChart({
  pricePoints, ohlcPoints, chartType, trendColor, eraColor,
  showBollinger, bollingerData, heritageData,
  showVolume, volPoints, heritageVolByGrade, hasRealVol,
  subIndicator, rsiAligned, macdData, heritageVolPoints,
  hasSubPane, height, grade,
  timeframe = 'ALL',
  showSalesTags = true,
  onToggleSubPane,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Real-time hover inspection tooltip HUD
  const [hoverData, setHoverData] = useState<{
    timeText: string;
    valueText: string | null;
    saleText: string | null;
  } | null>(null);

  // ── HORIZON EXTENDER / COLLAPSER SLIDER PILL STATE ──
  const [horizonMonths, setHorizonMonths] = useState<number>(24); // 12 to 82 months
  const [sliderPos, setSliderPos] = useState<number>(100);
  const [windowSpan, setWindowSpan] = useState<Timeframe>(() => (timeframe === 'ALL' ? '2Y' : timeframe));
  const [visibleRangeLabel, setVisibleRangeLabel] = useState<string>('');

  // 1. Calculate historical observation boundaries across 82 months
  const timeBounds = useMemo(() => {
    const allTimes = [
      ...pricePoints.map((p) => toSec(p[0])),
      ...ohlcPoints.map((p) => toSec(p[0])),
    ];
    if (allTimes.length === 0) {
      const now = toSec(Date.now());
      return { minSec: (now - 82 * 30 * 86400) as UTCTimestamp, maxSec: now as UTCTimestamp, totalSec: 82 * 30 * 86400 };
    }
    const minSec = Math.min(...allTimes) as UTCTimestamp;
    const maxSec = Math.max(...allTimes) as UTCTimestamp;
    return { minSec, maxSec, totalSec: Math.max(86400, maxSec - minSec) };
  }, [pricePoints, ohlcPoints]);

  // 2. Year tick marks across 82-month timeline
  const yearTicks = useMemo(() => {
    const startYear = new Date(timeBounds.minSec * 1000).getFullYear();
    const endYear = new Date(timeBounds.maxSec * 1000).getFullYear();
    const ticks: Array<{ year: number; pct: number }> = [];
    for (let y = startYear; y <= endYear; y++) {
      const ySec = toSec(new Date(`${y}-01-01T00:00:00Z`).getTime());
      if (ySec >= timeBounds.minSec && ySec <= timeBounds.maxSec) {
        const pct = ((ySec - timeBounds.minSec) / timeBounds.totalSec) * 100;
        ticks.push({ year: y, pct: Math.max(0, Math.min(100, pct)) });
      }
    }
    return ticks;
  }, [timeBounds]);

  // 3. Smooth Slider Viewport Applicator by Horizon Months
  const updateHorizonMonths = (months: number, posPct = sliderPos) => {
    if (!chartRef.current) return;
    setHorizonMonths(months);

    if (months >= 80) {
      setWindowSpan('ALL');
      try {
        chartRef.current.timeScale().fitContent();
      } catch (e) {}
      setVisibleRangeLabel('Full 82-Month Observation Series (Inception to Present)');
      return;
    }

    if (months <= 15) setWindowSpan('1Y');
    else if (months <= 30) setWindowSpan('2Y');
    else setWindowSpan('3Y');

    const winSec = Math.round(months * 30.4 * 86400);
    const maxStartSec = Math.max(timeBounds.minSec, timeBounds.maxSec - winSec);
    const startSec = Math.round(timeBounds.minSec + (posPct / 100) * (maxStartSec - timeBounds.minSec));
    const endSec = Math.min(timeBounds.maxSec, startSec + winSec);

    try {
      chartRef.current.timeScale().setVisibleRange({
        from: startSec as UTCTimestamp,
        to: endSec as UTCTimestamp,
      });
    } catch (e) {}

    const startDateStr = new Date(startSec * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endDateStr = new Date(endSec * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setVisibleRangeLabel(`Viewing Horizon: ${startDateStr} – ${endDateStr} (${months} Months)`);
  };

  const applySliderPosition = (pct: number, spanMode?: Timeframe) => {
    setSliderPos(pct);
    let m = horizonMonths;
    if (spanMode === '1Y') m = 12;
    else if (spanMode === '2Y') m = 24;
    else if (spanMode === '3Y') m = 36;
    else if (spanMode === 'ALL') m = 82;
    updateHorizonMonths(m, pct);
  };

  const stepBackward = () => {
    const newPct = Math.max(0, sliderPos - 15);
    applySliderPosition(newPct);
  };

  const stepForward = () => {
    const newPct = Math.min(100, sliderPos + 15);
    applySliderPosition(newPct);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isOhlc = chartType === 'candlestick' || chartType === 'ohlc';

    // Generous horizontal spacing configuration
    const chart = createChart(el, {
      width: el.clientWidth || 800,
      height,
      layout: {
        background: { type: ColorType.Solid, color: DARK_BG },
        textColor: TEXT_COLOR,
        fontFamily: 'monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: GRID_COLOR, style: LineStyle.Solid },
        horzLines: { color: GRID_COLOR, style: LineStyle.Solid },
      },
      rightPriceScale: {
        borderColor: BORDER_COLOR,
        scaleMargins: { top: 0.08, bottom: hasSubPane ? 0.35 : 0.08 },
        ticksVisible: true,
      },
      leftPriceScale: {
        visible: false,
        scaleMargins: { top: 0.74, bottom: 0.02 },
      },
      timeScale: {
        borderColor: BORDER_COLOR,
        timeVisible: true,
        secondsVisible: false,
        minBarSpacing: 5,
        barSpacing: 14,
        rightOffset: 8,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: {
        vertLine: { color: CROSSHAIR_COLOR, width: 1, style: LineStyle.Dashed, labelBackgroundColor: 'rgba(20,24,36,0.9)' },
        horzLine: { color: CROSSHAIR_COLOR, width: 1, style: LineStyle.Dashed, labelBackgroundColor: 'rgba(20,24,36,0.9)' },
      },
      handleScroll: {
        mouseWheel: false, // Prevent scroll wheel from breaking page scroll or fighting trackpad
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: false, // Use our sleek Slider Pill instead of awkward wheel
        pinch: true,
      },
    });

    chartRef.current = chart;

    let mainSeries: any = null;

    // ── Main price series ──────────────────────────────────────────────────────
    if (isOhlc && ohlcPoints.length > 0) {
      const cs = chartType === 'candlestick'
        ? chart.addSeries(CandlestickSeriesDef, {
            upColor: '#22c55e', downColor: '#ef4444',
            borderUpColor: '#22c55e', borderDownColor: '#ef4444',
            wickUpColor: '#22c55e', wickDownColor: '#ef4444',
            wickVisible: true,
            borderVisible: true,
            priceLineVisible: false,
          })
        : chart.addSeries(BarSeriesDef, {
            upColor: '#22c55e', downColor: '#ef4444',
            thinBars: false,
            priceLineVisible: false,
          });
      const mapped = dedupByTime(ohlcPoints.map(([ts, o, h, l, c]) => ({
        time: toSec(ts), open: o, high: h, low: l, close: c,
      })).sort((a, b) => a.time - b.time));
      cs.setData(mapped);
      mainSeries = cs;

      applyMarkers(cs, heritageData, showSalesTags, timeframe);
    } else if (pricePoints.length > 0) {
      const baseData = dedupByTime(pricePoints.map(([ts, v]) => ({ time: toSec(ts), value: v }))
        .sort((a, b) => a.time - b.time));

      if (chartType === 'column') {
        const hs = chart.addSeries(HistogramSeriesDef, {
          color: trendColor,
          priceLineVisible: false,
        });
        hs.setData(baseData);
        mainSeries = hs;
      } else if (chartType === 'line' || chartType === 'spline') {
        const ls = chart.addSeries(LineSeriesDef, {
          color: trendColor,
          lineWidth: 2,
          priceLineVisible: false,
          crosshairMarkerRadius: 4,
          crosshairMarkerVisible: true,
        });
        ls.setData(baseData);
        mainSeries = ls;
        applyMarkers(ls, heritageData, showSalesTags, timeframe);
      } else {
        // area (default)
        const ls = chart.addSeries(AreaSeriesDef, {
          lineColor: trendColor,
          topColor: `${trendColor}55`,
          bottomColor: `${trendColor}04`,
          lineWidth: 2,
          priceLineVisible: false,
          crosshairMarkerRadius: 4,
          crosshairMarkerVisible: true,
        });
        ls.setData(baseData);
        mainSeries = ls;
        applyMarkers(ls, heritageData, showSalesTags, timeframe);
      }
    }

    // ── Bollinger Band overlays ────────────────────────────────────────────────
    if (showBollinger && bollingerData.length > 0) {
      const toTs = (d: string) => toSec(new Date(d).getTime());
      const sorted = [...bollingerData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const upper = chart.addSeries(LineSeriesDef, { color: `${eraColor}55`, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      upper.setData(dedupByTime(sorted.map(d => ({ time: toTs(d.date), value: d.upperBand }))));

      const mid = chart.addSeries(LineSeriesDef, { color: `${eraColor}88`, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      mid.setData(dedupByTime(sorted.map(d => ({ time: toTs(d.date), value: d.sma20 }))));

      const lower = chart.addSeries(LineSeriesDef, { color: `${eraColor}55`, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      lower.setData(dedupByTime(sorted.filter(d => d.lowerBand > 0).map(d => ({ time: toTs(d.date), value: d.lowerBand }))));
    }

    // ── Volume overlay on main pane ────────────────────────────────────────────
    if (showVolume) {
      const rawVol = hasRealVol ? heritageVolByGrade : volPoints;
      if (rawVol.length > 0) {
        const vs = chart.addSeries(HistogramSeriesDef, {
          color: hasRealVol ? '#f59e0b60' : `${eraColor}40`,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'left',
        });
        vs.setData(dedupByTime(rawVol.map(([ts, v]) => ({ time: toSec(ts), value: v })).sort((a, b) => a.time - b.time)));
      }
    }

    // ── Sub-indicator pane (Uses built-in left price scale so values never contaminate comic price scale) ──
    if (hasSubPane) {
      if (subIndicator === 'rsi' && rsiAligned.length > 0) {
        const rsiData = dedupByTime(rsiAligned.map(([ts, v]) => ({ time: toSec(ts), value: v })).sort((a, b) => a.time - b.time));
        const rsiS = chart.addSeries(LineSeriesDef, {
          color: 'rgba(255,255,255,0.65)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'left',
        });
        rsiS.setData(rsiData);
        rsiS.createPriceLine({ price: 70, color: '#fbbf2450', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
        rsiS.createPriceLine({ price: 50, color: 'rgba(255,255,255,0.15)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
        rsiS.createPriceLine({ price: 30, color: '#f8717150', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
      }

      if (subIndicator === 'macd' && macdData) {
        const { macd, signal, hist, times } = macdData;
        const toD = (i: number) => toSec(times[i]);
        const histData = dedupByTime(hist.map((v, i) => v != null ? ({ time: toD(i), value: v, color: v >= 0 ? '#22c55e80' : '#ef444480' }) : null).filter(Boolean).sort((a, b) => a!.time - b!.time) as { time: UTCTimestamp; value: number; color: string }[]);
        const macdData2 = dedupByTime(macd.map((v, i) => v != null ? ({ time: toD(i), value: v }) : null).filter(Boolean).sort((a, b) => a!.time - b!.time) as { time: UTCTimestamp; value: number }[]);
        const sigData = dedupByTime(signal.map((v, i) => v != null ? ({ time: toD(i), value: v }) : null).filter(Boolean).sort((a, b) => a!.time - b!.time) as { time: UTCTimestamp; value: number }[]);

        const histS = chart.addSeries(HistogramSeriesDef, { color: '#22c55e80', priceLineVisible: false, lastValueVisible: false, priceScaleId: 'left' });
        histS.setData(histData as any[]);
        const macdS = chart.addSeries(LineSeriesDef, { color: '#38bdf8', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'left' });
        macdS.setData(macdData2 as any[]);
        const sigS = chart.addSeries(LineSeriesDef, { color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, priceScaleId: 'left' });
        sigS.setData(sigData as any[]);
      }

      if (subIndicator === 'hax-vol' && heritageVolPoints.length > 0) {
        const hvS = chart.addSeries(HistogramSeriesDef, { color: '#f59e0b', priceLineVisible: false, lastValueVisible: false, priceScaleId: 'left' });
        hvS.setData(dedupByTime(heritageVolPoints.map(([ts, v]) => ({ time: toSec(ts), value: v })).sort((a, b) => a.time - b.time)));
      }
    }

    // ── Subscribe to chart pan / zoom to keep slider in sync ──
    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (!range || !range.from || !range.to) return;
      const fromSec = range.from as number;
      const toSecVal = range.to as number;
      const curWinSec = toSecVal - fromSec;

      if (curWinSec >= timeBounds.totalSec * 0.95) {
        setVisibleRangeLabel('Full 82-Month Historical Series (Overview)');
        return;
      }

      const maxStartSec = Math.max(timeBounds.minSec, timeBounds.maxSec - curWinSec);
      if (maxStartSec > timeBounds.minSec) {
        const calculatedPct = Math.max(0, Math.min(100, ((fromSec - timeBounds.minSec) / (maxStartSec - timeBounds.minSec)) * 100));
        setSliderPos(Number(calculatedPct.toFixed(1)));
      }

      const startDateStr = new Date(fromSec * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const endDateStr = new Date(toSecVal * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const months = Math.round(curWinSec / (30 * 86400));
      setVisibleRangeLabel(`Viewing Horizon: ${startDateStr} – ${endDateStr} (${months} Months)`);
    });

    // ── Initial Range setting based on windowSpan ──
    if (windowSpan !== 'ALL') {
      let days = 730;
      if (windowSpan === '1Y') days = 365;
      else if (windowSpan === '2Y') days = 730;
      else if (windowSpan === '3Y') days = 1095;
      else if (windowSpan === '5Y') days = 1825;
      const winSec = days * 86400;
      const fromSec = Math.max(timeBounds.minSec, timeBounds.maxSec - winSec);
      try {
        chart.timeScale().setVisibleRange({
          from: fromSec as UTCTimestamp,
          to: timeBounds.maxSec as UTCTimestamp,
        });
      } catch (e) {
        chart.timeScale().fitContent();
      }
      const sStr = new Date(fromSec * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const eStr = new Date(timeBounds.maxSec * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setVisibleRangeLabel(`Viewing Horizon: ${sStr} – ${eStr} (${Math.round(days / 30)} Months)`);
    } else {
      chart.timeScale().fitContent();
      setVisibleRangeLabel('Full 82-Month Observation Series (Inception to Present)');
    }

    // ── Crosshair Hover Event Listener (Shows Point-in-Time Data without Collisions) ──
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !mainSeries) {
        setHoverData(null);
        return;
      }

      const timeNum = param.time as number;
      const dateStr = new Date(timeNum * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const seriesPrice = param.seriesData.get(mainSeries);
      let valStr: string | null = null;
      if (seriesPrice) {
        if ('value' in seriesPrice && typeof seriesPrice.value === 'number') {
          valStr = `$${seriesPrice.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if ('close' in seriesPrice && typeof seriesPrice.close === 'number') {
          valStr = `O: $${Math.round((seriesPrice as any).open)} H: $${Math.round((seriesPrice as any).high)} L: $${Math.round((seriesPrice as any).low)} C: $${Math.round((seriesPrice as any).close)}`;
        }
      }

      // Check if a sale occurred near this timestamp & compute historical travel delta
      let saleInfo: string | null = null;
      if (heritageData && heritageData.length > 0) {
        const sortedSales = [...heritageData].sort(
          (a, b) => new Date(a.sold_at).getTime() - new Date(b.sold_at).getTime()
        );
        const foundIdx = sortedSales.findIndex((s) => {
          const sTime = toSec(new Date(s.sold_at).getTime());
          return Math.abs(sTime - timeNum) < 86400 * 20; // within 20 days
        });

        if (foundIdx !== -1) {
          const found = sortedSales[foundIdx];
          const prev = foundIdx > 0 ? sortedSales[foundIdx - 1] : null;
          let deltaStr = '';
          if (prev && prev.price_usd > 0) {
            const diff = found.price_usd - prev.price_usd;
            const diffPct = (diff / prev.price_usd) * 100;
            const sign = diff >= 0 ? '+' : '';
            deltaStr = ` (${diff >= 0 ? '▲' : '▼'} ${sign}$${Math.round(diff).toLocaleString()} / ${sign}${diffPct.toFixed(1)}%)`;
          }
          saleInfo = `Comp: $${Math.round(found.price_usd).toLocaleString()}${deltaStr} · ${found.grade}`;
        }
      }

      setHoverData({
        timeText: dateStr,
        valueText: valStr,
        saleText: saleInfo,
      });
    });

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && chartRef.current) chartRef.current.applyOptions({ width: w });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    pricePoints, ohlcPoints, chartType, trendColor, eraColor,
    showBollinger, bollingerData, heritageData,
    showVolume, volPoints, heritageVolByGrade, hasRealVol,
    subIndicator, rsiAligned, macdData, heritageVolPoints,
    hasSubPane, height, grade,
    timeframe, showSalesTags,
  ]);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* ── REAL-TIME HOVER HUD BAR ── */}
      <div 
        className="flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono min-h-[30px]"
      >
        <div className="flex items-center gap-3">
          {hoverData ? (
            <>
              <span className="text-cyan-400 font-bold">{hoverData.timeText}</span>
              {hoverData.valueText && (
                <span className="text-white font-bold">{hoverData.valueText}</span>
              )}
              {hoverData.saleText && (
                <span className="text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30">
                  {hoverData.saleText}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400">
              Move cursor over timeline to inspect historical prices and verified sales
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {subIndicator !== 'none' && (
            <button
              type="button"
              onClick={onToggleSubPane}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 hover:bg-purple-900 hover:text-white text-[10px] font-mono cursor-pointer transition-colors"
              title={hasSubPane ? 'Collapse lower indicator pane' : 'Expand lower indicator pane'}
            >
              {hasSubPane ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{hasSubPane ? `Collapse ${subIndicator.toUpperCase()}` : `Expand ${subIndicator.toUpperCase()}`}</span>
            </button>
          )}
          <div className="text-[10px] text-slate-400 hidden sm:block">
            Scroll to zoom · Drag horizontally to pan
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl">
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>

      {/* ── TIME HORIZON TIMELINE SLIDER (Full 82-Month Scrubber) ── */}
      <div className="mt-3 p-3.5 rounded-xl bg-[#08101a] border border-cyan-500/25 shadow-xl space-y-3">
        {/* Top Control Bar: Status Label + Window Size Selector */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold text-xs">
              <Sliders className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 font-sans block">
                Time Horizon Timeline Scrubber
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {visibleRangeLabel || 'Viewing: Full 82-Month Historical Series'}
              </span>
            </div>
          </div>

          {/* Window Span Preset Buttons */}
          <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-lg border border-white/5">
            <span className="text-[9px] font-mono text-slate-400 px-1">WINDOW:</span>
            {(['1Y', '2Y', '3Y', 'ALL'] as const).map((span) => (
              <button
                key={span}
                type="button"
                onClick={() => {
                  setWindowSpan(span);
                  applySliderPosition(sliderPos, span);
                }}
                className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  windowSpan === span
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {span === 'ALL' ? 'Full 82M' : span}
              </button>
            ))}
          </div>
        </div>

        {/* The Slider Track with Active Window Highlights */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={stepBackward}
              disabled={sliderPos <= 0 || windowSpan === 'ALL'}
              className="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
              title="Shift viewing window backward 6 months"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Older</span>
            </button>

            <div className="relative flex-1 py-1">
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={sliderPos}
                disabled={windowSpan === 'ALL'}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  applySliderPosition(val);
                }}
                className="w-full h-2 rounded-lg appearance-none bg-black/80 border border-cyan-500/30 cursor-pointer accent-cyan-400 focus:outline-none disabled:opacity-40"
              />
            </div>

            <button
              type="button"
              onClick={stepForward}
              disabled={sliderPos >= 100 || windowSpan === 'ALL'}
              className="px-2.5 py-1 rounded bg-black/60 border border-white/10 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1"
              title="Shift viewing window forward 6 months"
            >
              <span>Newer</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Year Tick Marks along the 82-Month Horizon */}
          <div className="relative w-full h-4 text-[9px] font-mono text-slate-400 select-none">
            {yearTicks.map((t) => (
              <span
                key={t.year}
                style={{
                  position: 'absolute',
                  left: `${t.pct}%`,
                  transform: 'translateX(-50%)',
                }}
                className="hover:text-cyan-300 transition-colors"
              >
                {t.year}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Era Jump Buttons */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2 text-[9px] font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400">QUICK ERA JUMP:</span>
            <button
              type="button"
              onClick={() => {
                setWindowSpan('2Y');
                applySliderPosition(0, '2Y');
              }}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-300 text-slate-300 transition-colors cursor-pointer"
            >
              2019-2021 Inception
            </button>
            <button
              type="button"
              onClick={() => {
                setWindowSpan('2Y');
                applySliderPosition(45, '2Y');
              }}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-300 text-slate-300 transition-colors cursor-pointer"
            >
              2022-2023 Mid-Cycle
            </button>
            <button
              type="button"
              onClick={() => {
                setWindowSpan('2Y');
                applySliderPosition(100, '2Y');
              }}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-300 text-slate-300 transition-colors cursor-pointer"
            >
              2024-2026 Apex Run
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setWindowSpan('ALL');
              applySliderPosition(100, 'ALL');
            }}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Full 82-Month</span>
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'right', paddingTop: '4px', paddingRight: '4px' }}>
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', textDecoration: 'none' }}
        >
          Powered by TradingView
        </a>
      </div>
    </div>
  );
}

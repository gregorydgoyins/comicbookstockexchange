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
  timeframe: Timeframe = 'ALL',
  ohlcPoints?: [number, number, number, number, number][],
  pricePoints?: [number, number][]
) {
  if (!series) return;
  try {
    if (!showSalesTags) {
      if (typeof (series as any).setMarkers === 'function') {
        (series as any).setMarkers([]);
      } else if (typeof createSeriesMarkers === 'function') {
        createSeriesMarkers(series, []);
      }
      return;
    }

    const isOhlc = Boolean(ohlcPoints && ohlcPoints.length > 0);
    const markers: any[] = [];

    if (isOhlc && ohlcPoints && ohlcPoints.length > 0) {
      // Find peak ATH close across candles
      let maxHigh = -Infinity;
      let maxIdx = -1;
      const sortedCandles = [...ohlcPoints].sort((a, b) => a[0] - b[0]);
      sortedCandles.forEach((c, idx) => {
        if (c[2] > maxHigh) {
          maxHigh = c[2];
          maxIdx = idx;
        }
      });

      // Group specific secondary auction sales by month to prioritize verified comp prices
      const salesByMonth = new Map<string, number>();
      if (items && items.length > 0) {
        for (const s of items) {
          if (s && s.sold_at && s.price_usd > 0) {
            const mKey = s.sold_at.slice(0, 7);
            const prev = salesByMonth.get(mKey) || 0;
            if (s.price_usd > prev) salesByMonth.set(mKey, s.price_usd);
          }
        }
      }

      sortedCandles.forEach(([ts, open, high, low, close], idx) => {
        const timeSec = toSec(ts);
        const mKey = new Date(ts).toISOString().slice(0, 7);
        const auctionComp = salesByMonth.get(mKey);
        const isAth = idx === maxIdx;

        // Clean Canvas: NO floating percentage tags cluttering the candles.
        // Candlesticks are clean and authentic.
        // Only mark true verified market milestone events:
        // 1. All-Time High (gold crown)
        // 2. Real verified auction sales from Heritage/eBay (cyan comp pin)
        if (isAth) {
          markers.push({
            time: timeSec,
            position: 'aboveBar',
            color: '#fbbf24',
            shape: 'arrowUp',
            size: 2,
            text: `👑 ${fmtUsd(high)} ATH`,
          });
        } else if (auctionComp != null) {
          markers.push({
            time: timeSec,
            position: 'aboveBar',
            color: '#38bdf8',
            shape: 'circle',
            size: 1,
            text: `Comp: ${fmtUsd(auctionComp)}`,
          });
        }
      });
    } else if (pricePoints && pricePoints.length > 0) {
      const sortedPoints = [...pricePoints].sort((a, b) => a[0] - b[0]);
      let maxVal = -Infinity;
      let maxIdx = -1;
      sortedPoints.forEach((p, idx) => {
        if (p[1] > maxVal) {
          maxVal = p[1];
          maxIdx = idx;
        }
      });

      sortedPoints.forEach(([ts, val], idx) => {
        const timeSec = toSec(ts);
        if (idx === maxIdx) {
          markers.push({
            time: timeSec,
            position: 'aboveBar',
            color: '#fbbf24',
            shape: 'arrowUp',
            size: 2,
            text: `👑 ${fmtUsd(val)} ATH`,
          });
        }
      });
    }

    // Filter duplicates by time and ensure ascending order
    const dedupedMarkers = dedupByTime(markers).sort(
      (a, b) => (a.time as number) - (b.time as number)
    );

    if (typeof (series as any).setMarkers === 'function') {
      (series as any).setMarkers(dedupedMarkers);
    } else if (typeof createSeriesMarkers === 'function') {
      createSeriesMarkers(series, dedupedMarkers);
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
const TEXT_COLOR = 'rgba(255,255,255,0.90)';
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.025)', style: LineStyle.Solid },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.Solid },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.12, bottom: hasSubPane ? 0.35 : 0.10 },
        ticksVisible: true,
      },
      leftPriceScale: {
        visible: false,
        scaleMargins: { top: 0.74, bottom: 0.02 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        minBarSpacing: 6,
        barSpacing: 16,
        rightOffset: 8,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(6, 182, 212, 0.45)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#0f172a' },
        horzLine: { color: 'rgba(6, 182, 212, 0.45)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#0f172a' },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: false,
        pinch: true,
      },
    });

    chartRef.current = chart;

    let mainSeries: any = null;

    // ── Main price series ──────────────────────────────────────────────────────
    if (isOhlc && ohlcPoints.length > 0) {
      const cs = chartType === 'candlestick'
        ? chart.addSeries(CandlestickSeriesDef, {
            upColor: '#10b981', downColor: '#f43f5e',
            borderUpColor: '#34d399', borderDownColor: '#fb7185',
            wickUpColor: '#10b981', wickDownColor: '#f43f5e',
            wickVisible: true,
            borderVisible: true,
            priceLineVisible: false,
          })
        : chart.addSeries(BarSeriesDef, {
            upColor: '#10b981', downColor: '#f43f5e',
            thinBars: false,
            priceLineVisible: false,
          });
      const mapped = dedupByTime(ohlcPoints.map(([ts, o, h, l, c]) => ({
        time: toSec(ts), open: o, high: h, low: l, close: c,
      })).sort((a, b) => a.time - b.time));
      cs.setData(mapped);
      mainSeries = cs;

      applyMarkers(cs, heritageData, showSalesTags, timeframe, ohlcPoints, pricePoints);
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
          crosshairMarkerRadius: 5,
          crosshairMarkerVisible: true,
          pointMarkersVisible: true,
          pointMarkersRadius: 4,
        });
        ls.setData(baseData);
        mainSeries = ls;
        applyMarkers(ls, heritageData, showSalesTags, timeframe, undefined, pricePoints);
      } else {
        // area (default)
        const ls = chart.addSeries(AreaSeriesDef, {
          lineColor: trendColor,
          topColor: `${trendColor}55`,
          bottomColor: `${trendColor}04`,
          lineWidth: 2,
          priceLineVisible: false,
          crosshairMarkerRadius: 5,
          crosshairMarkerVisible: true,
          pointMarkersVisible: true,
          pointMarkersRadius: 4,
        });
        ls.setData(baseData);
        mainSeries = ls;
        applyMarkers(ls, heritageData, showSalesTags, timeframe, undefined, pricePoints);
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
          const o = Math.round((seriesPrice as any).open);
          const h = Math.round((seriesPrice as any).high);
          const l = Math.round((seriesPrice as any).low);
          const c = Math.round((seriesPrice as any).close);
          const delta = c - o;
          const deltaPct = o > 0 ? (Math.abs(delta / o) * 100).toFixed(1) : '0';
          const pctVal = o > 0 ? (Math.abs(delta) / o) * 100 : 0;
          const isUp = c > o;
          const isDown = c < o;

          if (isUp) {
            const tier = pctVal >= 15 ? '🔥 KILLER MONTH' : '🟢 OK UP MONTH';
            valStr = `${tier} (+${deltaPct}%): Tip High: $${h.toLocaleString()} · Close: $${c.toLocaleString()} · Open: $${o.toLocaleString()}`;
          } else if (isDown) {
            const tier = pctVal >= 15 ? '🚨 BAD MONTH' : '🔴 MILD PULLBACK';
            valStr = `${tier} (-${deltaPct}%): Open: $${o.toLocaleString()} · Close: $${c.toLocaleString()} · Floor Low: $${l.toLocaleString()}`;
          } else {
            valStr = `⚪ FLAT / STABLE MONTH: Held at $${c.toLocaleString()}`;
          }
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
        className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-xl bg-[#09111e]/90 backdrop-blur-md border border-white/10 text-xs font-sans min-h-[36px] shadow-sm"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {hoverData ? (
            <>
              <span className="text-cyan-300 font-bold font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                {hoverData.timeText}
              </span>
              {hoverData.valueText && (
                <span className="text-white font-semibold">
                  {hoverData.valueText}
                </span>
              )}
              {hoverData.saleText && (
                <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono">
                  {hoverData.saleText}
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2.5 text-slate-300 flex-wrap text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                UP MONTH = Green Body + Up Tail
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
                DOWN MONTH = Red Body + Down Tail
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-300 font-medium">
                KILLER = Tall Green Surge
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400 font-medium">
                BAD = Deep Red Drop
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                OK / FLAT = Tight Holding Month
              </span>
            </div>
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

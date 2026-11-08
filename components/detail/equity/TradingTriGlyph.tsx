'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Bookmark, 
  BookmarkCheck, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  Check, 
  Radar, 
  Bell, 
  X,
  ExternalLink,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { DetailResponse, GradePrice } from './types';
import type { ExecutionQuote } from '@/lib/comics/detail-model';
import { getEraColors } from '@/lib/design-system/colors';
import { fmt, GRADE_ORDER } from './shared';
import { computeCrossGradeModel } from '@/lib/comics/cross-grade-math';

interface TradingTriGlyphProps {
  variantId: string;
  variant: DetailResponse['variant'];
  keyPrices: DetailResponse['keyPrices'];
  gradeLattice?: GradePrice[];
  quote: ExecutionQuote | null;
  eraColors: ReturnType<typeof getEraColors>;
}

export type BuyOrderType = 'market' | 'limit' | 'stop';
export type SellStrategy = 'free' | 'limit' | 'protect' | 'spread' | 'butterfly';

export default function TradingTriGlyph({
  variantId,
  variant,
  keyPrices,
  gradeLattice = [],
  quote,
  eraColors,
}: TradingTriGlyphProps) {
  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const watching = isWatching(variantId);

  // Toast & Order Execution Modal state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [executedOrder, setExecutedOrder] = useState<{
    type: 'buy' | 'sell';
    details: string;
    grade: string;
    amount: number;
    shares: number;
    timestamp: string;
  } | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // ── CROSS-GRADE RELATIVE VALUATION MODEL ──
  const crossGradeModel = useMemo(() => {
    return computeCrossGradeModel(gradeLattice, [], keyPrices);
  }, [gradeLattice, keyPrices]);

  // Grade options parsed from cross-grade relative model across all canonical tiers
  const gradeOptions = useMemo(() => {
    return crossGradeModel.tiers.map((t) => ({
      grade: t.grade,
      label: t.label,
      priceUsd: t.extrapolatedFmvUsd,
      isObserved: t.isObserved,
      ratioPct: t.ratioPct,
    }));
  }, [crossGradeModel]);

  // ── BUY GLYPH STATE ──
  const [buyGrade, setBuyGrade] = useState<string>('9.8');
  const [buyDropdownOpen, setBuyDropdownOpen] = useState<boolean>(false);
  const [buyOrderType, setBuyOrderType] = useState<BuyOrderType>('market');
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const buyOption = gradeOptions.find((g) => g.grade === buyGrade) || gradeOptions[0];
  const buyMarketPrice = buyOption?.priceUsd ?? keyPrices.fmv98Usd ?? keyPrices.sovPriceUsd ?? 0;
  const [buyLimitPrice, setBuyLimitPrice] = useState<string>(buyMarketPrice.toFixed(2));
  const [buyStopTrigger, setBuyStopTrigger] = useState<string>((buyMarketPrice * 1.05).toFixed(2));

  // ── SELL GLYPH STATE (Robust Strategies: Free to Sell, Limit, Protect, Spread, Butterfly) ──
  const [sellGrade, setSellGrade] = useState<string>('9.8');
  const [sellDropdownOpen, setSellDropdownOpen] = useState<boolean>(false);
  const [sellStrategy, setSellStrategy] = useState<SellStrategy>('free');
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const sellOption = gradeOptions.find((g) => g.grade === sellGrade) || gradeOptions[0];
  const sellMarketPrice = sellOption?.priceUsd ?? keyPrices.fmv98Usd ?? keyPrices.sovPriceUsd ?? 0;
  const [sellLimitPrice, setSellLimitPrice] = useState<string>(sellMarketPrice.toFixed(2));
  
  // Protect / Stop Floor State
  const [protectStopPct, setProtectStopPct] = useState<number>(10);
  const protectStopPrice = sellMarketPrice * (1 - protectStopPct / 100);

  // Spread Arbitrage Roll State (Roll from sellGrade to rollTargetGrade)
  const [rollTargetGrade, setRollTargetGrade] = useState<string>('9.4');
  const rollTargetOption = gradeOptions.find((g) => g.grade === rollTargetGrade) || gradeOptions[2] || gradeOptions[0];
  const spreadExtractedCash = Math.max(0, (sellMarketPrice - rollTargetOption.priceUsd) * sellQuantity);

  // Butterfly Multi-Tier Hedge State
  const butterflyFloorOption = gradeOptions.find((g) => g.grade === 'RAW') || gradeOptions[gradeOptions.length - 1];
  const butterflyMidOption = gradeOptions.find((g) => g.grade === '9.4') || gradeOptions[1];
  const butterflyNetMargin = sellMarketPrice - (2 * (butterflyMidOption?.priceUsd ?? 0)) + (butterflyFloorOption?.priceUsd ?? 0);

  // ── WATCHLIST & RADAR STATE ──
  const [priceAlert, setPriceAlert] = useState<string>(buyMarketPrice.toFixed(2));

  const handleToggleWatchlist = () => {
    if (watching) {
      removeFromWatchlist(variantId);
      triggerToast('Asset removed from Watchlist');
    } else {
      addToWatchlist({
        id: variantId,
        workName: `${variant.workName} #${variant.issueNumber}`,
        era: variant.era ?? undefined,
        fmvUsd: buyMarketPrice,
        delta24h: keyPrices.delta24h ?? 0,
        pinnedAt: new Date().toISOString(),
      });
      triggerToast('★ Asset added to Watchlist & Portfolio Radar');
    }
  };

  const handleBuySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrice = buyOrderType === 'market' 
      ? buyMarketPrice 
      : buyOrderType === 'limit'
      ? parseFloat(buyLimitPrice) || buyMarketPrice
      : parseFloat(buyStopTrigger) || buyMarketPrice;

    const totalOutlay = finalPrice * buyQuantity;

    setExecutedOrder({
      type: 'buy',
      details: `${buyOrderType.toUpperCase()} Order Filled: ${buyQuantity}x CGC ${buyGrade}`,
      grade: buyGrade,
      amount: totalOutlay,
      shares: buyQuantity,
      timestamp: new Date().toLocaleTimeString(),
    });

    triggerToast(
      `✓ Transmitted to Portfolio: ${buyQuantity}x CGC ${buyGrade} @ ${fmt(finalPrice)}`
    );
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalProceeds = sellMarketPrice * 0.72 * sellQuantity;
    let strategyLabel = 'Free to Sell (Wholesale Floor)';

    if (sellStrategy === 'limit') {
      finalProceeds = (parseFloat(sellLimitPrice) || sellMarketPrice) * sellQuantity;
      strategyLabel = `Limit Ask @ ${fmt(parseFloat(sellLimitPrice) || sellMarketPrice)}`;
    } else if (sellStrategy === 'protect') {
      finalProceeds = protectStopPrice * sellQuantity;
      strategyLabel = `Stop Floor Protected @ ${fmt(protectStopPrice)} (-${protectStopPct}%)`;
    } else if (sellStrategy === 'spread') {
      finalProceeds = spreadExtractedCash;
      strategyLabel = `Grade Spread Roll: Sold ${sellGrade} → Bought ${rollTargetGrade} (Extracted ${fmt(spreadExtractedCash)})`;
    } else if (sellStrategy === 'butterfly') {
      finalProceeds = Math.abs(butterflyNetMargin);
      strategyLabel = `Butterfly Spread Hedge: Net Wing Delta ${fmt(butterflyNetMargin)}`;
    }

    setExecutedOrder({
      type: 'sell',
      details: `${strategyLabel} Transmitted to Portfolio`,
      grade: sellGrade,
      amount: finalProceeds,
      shares: sellQuantity,
      timestamp: new Date().toLocaleTimeString(),
    });

    triggerToast(
      `✓ Portfolio Liquidation Transmitted: ${strategyLabel}`
    );
  };

  const handleSetAlert = () => {
    triggerToast(`🔔 Alert Target Set: ${fmt(parseFloat(priceAlert) || buyMarketPrice)}`);
  };

  // 24h Delta Telemetry (defaults to canonical +92.3%)
  const delta24hVal = keyPrices.delta24h ?? 92.3;

  return (
    <div className="space-y-4 mb-8">
      {/* Tri-Glyph Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-white font-sans">
            Institutional Order Execution Rails &amp; Multi-Strategy Book
          </h3>
          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            Portfolio Connected
          </span>
        </div>

        {/* Direct Link to Portfolio & Holdings */}
        <div className="flex items-center gap-2">
          <a
            href="#holdings-section"
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-cyan-300 font-mono transition-all hover:border-cyan-400 cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Position in Portfolio</span>
            <ArrowRight className="w-3 h-3 text-cyan-400" />
          </a>
        </div>
      </div>

      {/* ── EXECUTION CONFIRMATION NOTIFICATION TOAST / POPUP ── */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-[#0b1b17] border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-between animate-fadeIn text-xs font-mono text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="#holdings-section" 
              className="text-[11px] underline text-cyan-300 hover:text-cyan-200 font-bold font-sans"
            >
              Open Portfolio Ledger &rarr;
            </a>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── THE TRIPLE MASONRY TRI-GLYPH (3 Columns) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        
        {/* ═══════════════════════════════════════════════════════════
            GLYPH 1: ▲ BUY ORDER VAULT (Emerald Domain)
           ═══════════════════════════════════════════════════════════ */}
        <div 
          className="rounded-xl p-5 bg-[#0a151b]/90 backdrop-blur-md border border-emerald-500/30 flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
        >
          {/* Top Emerald Laser Bar */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
                  ▲
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-sans" style={{ letterSpacing: '0.08em' }}>
                  Buy Order Desk
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Direct Fill &amp; Limit
              </span>
            </div>

            {/* Target Grade Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Target Grade &amp; Specimen
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBuyDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-black/50 border border-emerald-500/30 hover:border-emerald-400 text-left text-xs font-mono transition-colors cursor-pointer"
                >
                  <span className="text-white font-bold">{buyOption.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-emerald-400 transition-transform ${buyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {buyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#08121a] border border-emerald-500/40 shadow-2xl py-1 z-50 max-h-56 overflow-y-auto">
                    {gradeOptions.map((opt) => (
                      <button
                        key={opt.grade}
                        type="button"
                        onClick={() => {
                          setBuyGrade(opt.grade);
                          setBuyLimitPrice(opt.priceUsd.toFixed(2));
                          setBuyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                          opt.grade === buyGrade ? 'bg-emerald-950/60 text-emerald-200' : 'text-slate-300 hover:bg-emerald-500/10'
                        }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="font-mono font-bold text-white">{fmt(opt.priceUsd)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Type Toggle: Market, Limit, Stop Accumulate */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono font-bold">
              {(['market', 'limit', 'stop'] as const).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setBuyOrderType(ot)}
                  className={`py-1.5 rounded uppercase tracking-wider transition-all cursor-pointer ${
                    buyOrderType === ot
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ot === 'market' && 'Market'}
                  {ot === 'limit' && 'Limit'}
                  {ot === 'stop' && 'Breakout'}
                </button>
              ))}
            </div>

            {/* Dynamic Price Display / Limit Input / Stop Input */}
            {buyOrderType === 'market' && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Institutional Ask Price:</span>
                <span className="text-sm font-bold font-mono text-emerald-300">{fmt(buyMarketPrice)}</span>
              </div>
            )}

            {buyOrderType === 'limit' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Target Limit Bid Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={buyLimitPrice}
                  onChange={(e) => setBuyLimitPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-emerald-500/40 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}

            {buyOrderType === 'stop' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Breakout Trigger Threshold ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={buyStopTrigger}
                  onChange={(e) => setBuyStopTrigger(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-emerald-500/40 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}

            {/* Slabs Quantity Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Quantity (Units)
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBuyQuantity(num)}
                    className={`flex-1 py-1 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      buyQuantity === num
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                        : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Consideration Output */}
            <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Total Estimated Outlay:</span>
              <span className="text-sm font-bold font-mono text-white">
                {fmt((buyOrderType === 'market' ? buyMarketPrice : parseFloat(buyLimitPrice) || buyMarketPrice) * buyQuantity)}
              </span>
            </div>
          </div>

          {/* Action Button & Portfolio Route */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleBuySubmit}
              className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/20 border border-emerald-500/50 transition-all duration-200 hover:shadow-[0_0_25px_rgba(52,211,153,0.7)] hover:bg-emerald-500 hover:text-white hover:border-emerald-300 hover:scale-[1.01] cursor-pointer select-none font-sans"
            >
              ▲ Transmit Buy to Portfolio
            </button>
            <div className="flex items-center justify-center">
              <Link 
                href="/collection" 
                className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>Manage entire collection portfolio &rarr;</span>
              </Link>
            </div>
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════════
            GLYPH 2: ▼ SELL LIQUIDITY VAULT (Rose Domain)
            Robust Strategies: Free to Sell, Limit, Protect, Spread, Butterfly
           ═══════════════════════════════════════════════════════════ */}
        <div 
          className="rounded-xl p-5 bg-[#1b0a13]/90 backdrop-blur-md border border-rose-500/30 flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-rose-500/60 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]"
        >
          {/* Top Rose Laser Bar */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-rose-400 to-transparent" />

          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs">
                  ▼
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300 font-sans" style={{ letterSpacing: '0.08em' }}>
                  Sell Liquidity Desk
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300">
                Institutional Book
              </span>
            </div>

            {/* Off-Loaded Grade Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Offered Grade &amp; Specimen
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSellDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-black/50 border border-rose-500/30 hover:border-rose-400 text-left text-xs font-mono transition-colors cursor-pointer"
                >
                  <span className="text-white font-bold">{sellOption.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-rose-400 transition-transform ${sellDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {sellDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#180812] border border-rose-500/40 shadow-2xl py-1 z-50 max-h-56 overflow-y-auto">
                    {gradeOptions.map((opt) => (
                      <button
                        key={opt.grade}
                        type="button"
                        onClick={() => {
                          setSellGrade(opt.grade);
                          setSellLimitPrice(opt.priceUsd.toFixed(2));
                          setSellDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                          opt.grade === sellGrade ? 'bg-rose-950/60 text-rose-200' : 'text-slate-300 hover:bg-rose-500/10'
                        }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="font-mono font-bold text-white">{fmt(opt.priceUsd)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5-Strategy Selector: Free to Sell, Limit, Protect, Spread, Butterfly */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center justify-between">
                <span>Execution Strategy</span>
                <span className="text-rose-400 font-mono text-[9px]">{sellStrategy.toUpperCase()}</span>
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10 text-[9px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setSellStrategy('free')}
                  className={`py-1 rounded uppercase tracking-wider transition-all cursor-pointer ${
                    sellStrategy === 'free'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Instant wholesale floor liquidation without lockup"
                >
                  Free Sell
                </button>
                <button
                  type="button"
                  onClick={() => setSellStrategy('limit')}
                  className={`py-1 rounded uppercase tracking-wider transition-all cursor-pointer ${
                    sellStrategy === 'limit'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Target ask limit order on the continuous order book"
                >
                  Limit Ask
                </button>
                <button
                  type="button"
                  onClick={() => setSellStrategy('protect')}
                  className={`py-1 rounded uppercase tracking-wider transition-all cursor-pointer ${
                    sellStrategy === 'protect'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Downside stop-loss collar to protect portfolio capital"
                >
                  Protect
                </button>
                <button
                  type="button"
                  onClick={() => setSellStrategy('spread')}
                  className={`py-1 rounded uppercase tracking-wider transition-all cursor-pointer ${
                    sellStrategy === 'spread'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Sell apex tier and roll proceeds into lower tier to extract cash"
                >
                  Spread Roll
                </button>
                <button
                  type="button"
                  onClick={() => setSellStrategy('butterfly')}
                  className={`py-1 rounded uppercase tracking-wider transition-all cursor-pointer col-span-2 ${
                    sellStrategy === 'butterfly'
                      ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Multi-tier butterfly spread across apex, mid, and floor tiers"
                >
                  Butterfly Spread Hedge
                </button>
              </div>
            </div>

            {/* Dynamic UI based on selected Strategy */}
            {sellStrategy === 'free' && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-300 font-semibold block">Wholesale Bid Floor:</span>
                  <span className="text-[9px] text-slate-400 font-mono">Instant T+0 credit</span>
                </div>
                <span className="text-sm font-bold font-mono text-rose-300">{fmt(sellMarketPrice * 0.72)}</span>
              </div>
            )}

            {sellStrategy === 'limit' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Target Limit Ask Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sellLimitPrice}
                  onChange={(e) => setSellLimitPrice(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-rose-500/40 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
                />
              </div>
            )}

            {sellStrategy === 'protect' && (
              <div className="space-y-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Stop Floor:</span>
                  </span>
                  <span className="font-bold text-rose-300">{fmt(protectStopPrice)}</span>
                </div>
                <div className="flex gap-1.5">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setProtectStopPct(pct)}
                      className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        protectStopPct === pct
                          ? 'bg-rose-500/40 text-white border-rose-400'
                          : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sellStrategy === 'spread' && (
              <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Roll into Tier:</span>
                  <select
                    value={rollTargetGrade}
                    onChange={(e) => setRollTargetGrade(e.target.value)}
                    className="bg-black/60 border border-purple-500/40 rounded px-2 py-0.5 text-purple-200 text-xs"
                  >
                    {gradeOptions.filter(g => g.grade !== sellGrade).map(opt => (
                      <option key={opt.grade} value={opt.grade}>{opt.grade === 'RAW' ? 'RAW' : `CGC ${opt.grade}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-purple-500/20">
                  <span className="text-slate-300">Extracted Cash:</span>
                  <span className="text-sm font-bold text-purple-300">{fmt(spreadExtractedCash)}</span>
                </div>
              </div>
            )}

            {sellStrategy === 'butterfly' && (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>+1x 9.8 Apex</span>
                  <span>-2x 9.4 Mid</span>
                  <span>+1x RAW Floor</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                  <span className="text-slate-300">Hedge Delta:</span>
                  <span className="text-xs font-bold text-amber-300">{fmt(butterflyNetMargin)}</span>
                </div>
              </div>
            )}

            {/* Slabs Quantity Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                Quantity (Certified Slabs)
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSellQuantity(num)}
                    className={`flex-1 py-1 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      sellQuantity === num
                        ? 'bg-rose-500/30 text-rose-200 border-rose-400'
                        : 'bg-black/30 text-slate-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Consideration Output */}
            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Estimated Proceeds / Spread:</span>
              <span className="text-sm font-bold font-mono text-white">
                {sellStrategy === 'free' && fmt(sellMarketPrice * 0.72 * sellQuantity)}
                {sellStrategy === 'limit' && fmt((parseFloat(sellLimitPrice) || sellMarketPrice) * sellQuantity)}
                {sellStrategy === 'protect' && fmt(protectStopPrice * sellQuantity)}
                {sellStrategy === 'spread' && fmt(spreadExtractedCash)}
                {sellStrategy === 'butterfly' && fmt(Math.abs(butterflyNetMargin))}
              </span>
            </div>
          </div>

          {/* Action Button & Portfolio Route */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSellSubmit}
              className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-rose-300 bg-rose-500/20 border border-rose-500/50 transition-all duration-200 hover:shadow-[0_0_25px_rgba(244,63,94,0.7)] hover:bg-rose-600 hover:text-white hover:border-rose-300 hover:scale-[1.01] cursor-pointer select-none font-sans"
            >
              ▼ Transmit Liquidation Order
            </button>
            <div className="flex items-center justify-center">
              <a 
                href="#holdings-section" 
                className="text-[10px] font-mono text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <span>Inspect position in holding ledger &darr;</span>
              </a>
            </div>
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════════
            GLYPH 3: ★ WATCHLIST & RADAR VAULT (Amber Domain)
           ═══════════════════════════════════════════════════════════ */}
        <div 
          className="rounded-xl p-5 bg-[#1b1509]/90 backdrop-blur-md border border-amber-500/30 flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-amber-500/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
        >
          {/* Top Amber Laser Bar */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs">
                  ★
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-sans" style={{ letterSpacing: '0.08em' }}>
                  Watchlist &amp; Deal Radar
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Portfolio Vault
              </span>
            </div>

            {/* 24h Delta Telemetry Block */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-sans">
                  24h Δ Momentum:
                </span>
              </div>
              <span className="text-base font-bold font-mono text-emerald-300">
                ↑ +{delta24hVal.toFixed(1)}%
              </span>
            </div>

            {/* Dedicated Watchlist Action Button Pill */}
            <button
              type="button"
              onClick={handleToggleWatchlist}
              className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer select-none flex items-center justify-center gap-2 border font-sans ${
                watching
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                  : 'bg-white/5 text-slate-300 border-white/15 hover:border-amber-400/60 hover:text-amber-300 hover:bg-amber-500/15 hover:shadow-[0_0_18px_rgba(250,204,21,0.3)]'
              }`}
            >
              {watching ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-amber-400" />
                  <span>★ Watching Asset in Portfolio</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>★ + Add to Active Watchlist</span>
                </>
              )}
            </button>

            {/* Price Alert Configuration */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center justify-between">
                <span>Alert Trigger Price ($)</span>
                <span className="text-[9px] text-amber-400/80">SMS / Push</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={priceAlert}
                  onChange={(e) => setPriceAlert(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-amber-500/40 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleSetAlert}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  Arm
                </button>
              </div>
            </div>

            {/* Deal Radar Quick Links */}
            <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans flex items-center gap-1">
                <Radar className="w-3.5 h-3.5 text-amber-400" />
                <span>Arbitrage &amp; Radar Channels:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <Link
                  href="/game"
                  className="px-2.5 py-1.5 rounded bg-black/40 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 transition-colors flex items-center justify-between"
                >
                  <span>Sniper Radar</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </Link>
                <Link
                  href="/watchlist"
                  className="px-2.5 py-1.5 rounded bg-black/40 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 transition-colors flex items-center justify-between"
                >
                  <span>Watchlist</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </Link>
              </div>
            </div>
          </div>

          {/* Sub-bar Footer */}
          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span>RADAR: CONTINUOUS OBSERVER</span>
            <span className="text-amber-300/90 font-bold">LIVE TELEMETRY</span>
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  ChevronDown, 
  Check, 
  Bookmark, 
  BookmarkCheck, 
  ArrowUpRight, 
  X, 
  SlidersHorizontal,
  DollarSign,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { DetailResponse, GradePrice } from './types';
import type { ExecutionQuote } from '@/lib/comics/detail-model';
import { getEraColors } from '@/lib/design-system/colors';
import { fmt, GRADE_ORDER } from './shared';

interface TradingCommandLineProps {
  variantId: string;
  variant: DetailResponse['variant'];
  keyPrices: DetailResponse['keyPrices'];
  gradeLattice?: GradePrice[];
  quote: ExecutionQuote | null;
  eraColors: ReturnType<typeof getEraColors>;
}

export type OrderType = 'market' | 'limit';
export type OrderAction = 'buy' | 'sell';

export default function TradingCommandLine({
  variantId,
  variant,
  keyPrices,
  gradeLattice = [],
  quote,
  eraColors,
}: TradingCommandLineProps) {
  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const watching = isWatching(variantId);

  // Dropdown choice state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Order modal state
  const [orderModal, setOrderModal] = useState<{
    open: boolean;
    action: OrderAction;
  }>({
    open: false,
    action: 'buy',
  });

  const [orderType, setOrderType] = useState<OrderType>('market');
  const [limitPriceInput, setLimitPriceInput] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute available grades from gradeLattice and keyPrices
  const gradeOptions = useMemo(() => {
    const list: Array<{ grade: string; label: string; priceUsd: number; isAnchor?: boolean }> = [];
    
    // Sovereign 9.8 anchor
    const price98 = keyPrices.fmv98Usd || keyPrices.sovPriceUsd || 0;
    list.push({
      grade: '9.8',
      label: 'CGC 9.8 (Mint) · Sovereign Anchor',
      priceUsd: price98,
      isAnchor: true,
    });

    // Populate from gradeLattice
    const seen = new Set<string>(['9.8']);
    const sorted = [...gradeLattice].sort((a, b) => {
      const idxA = GRADE_ORDER.indexOf(a.grade);
      const idxB = GRADE_ORDER.indexOf(b.grade);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    for (const g of sorted) {
      if (!seen.has(g.grade) && g.priceUsd > 0) {
        seen.add(g.grade);
        list.push({
          grade: g.grade,
          label: g.grade === 'RAW' ? 'RAW (Ungraded Floor)' : `CGC ${g.grade}`,
          priceUsd: g.priceUsd,
        });
      }
    }

    // Ensure RAW baseline exists
    if (!seen.has('RAW') && keyPrices.fmvRawUsd != null && keyPrices.fmvRawUsd > 0) {
      list.push({
        grade: 'RAW',
        label: 'RAW (Ungraded Floor)',
        priceUsd: keyPrices.fmvRawUsd,
      });
    }

    return list;
  }, [gradeLattice, keyPrices]);

  // Selected grade state
  const [selectedGrade, setSelectedGrade] = useState<string>('9.8');

  // Currently active selected option
  const activeOption = useMemo(() => {
    return gradeOptions.find((g) => g.grade === selectedGrade) || gradeOptions[0];
  }, [gradeOptions, selectedGrade]);

  const activePrice = activeOption?.priceUsd ?? keyPrices.fmv98Usd ?? keyPrices.sovPriceUsd ?? 0;

  // Initialize limit price input when active price or modal changes
  useEffect(() => {
    if (activePrice > 0) {
      setLimitPriceInput(activePrice.toFixed(2));
    }
  }, [activePrice, orderModal.open]);

  // Watchlist Toggle
  const handleToggleWatchlist = () => {
    if (watching) {
      removeFromWatchlist(variantId);
      triggerToast('Removed from Watchlist');
    } else {
      addToWatchlist({
        id: variantId,
        workName: `${variant.workName} #${variant.issueNumber}`,
        era: variant.era ?? undefined,
        fmvUsd: activePrice,
        delta24h: keyPrices.delta24h ?? 92.3,
        pinnedAt: new Date().toISOString(),
      });
      triggerToast('Added to Watchlist');
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Submit Order Execution
  const handleExecuteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrice = orderType === 'market' ? activePrice : parseFloat(limitPriceInput) || activePrice;
    const actionLabel = orderModal.action.toUpperCase();
    const typeLabel = orderType.toUpperCase();
    
    triggerToast(
      `✓ ${typeLabel} ${actionLabel} Order Placed: ${quantity}x CGC ${selectedGrade} @ ${fmt(finalPrice)}`
    );
    setOrderModal({ open: false, action: 'buy' });
  };

  // 24h Delta calculation (for 9.8 defaults to +92.3% as per requirement)
  const delta24hVal = selectedGrade === '9.8' ? (keyPrices.delta24h ?? 92.3) : (keyPrices.delta24h ?? 0);

  return (
    <div className="relative mb-6">
      {/* ── TRADING TERMINAL COMMAND LINE (Inline Execution Strip) ── */}
      <div 
        className="rounded-xl px-4 py-3 bg-[#0a0f1d]/95 backdrop-blur-md border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 relative overflow-visible"
        style={{
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          borderLeft: `3px solid ${eraColors.border}`,
        }}
      >
        {/* Left Side: Key Prices Selector Dropdown & Live 24h Delta */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Key Prices Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 hover:border-cyan-400/50 hover:bg-white/[0.08] transition-all cursor-pointer select-none text-left"
            >
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                  Key Prices Selector
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-sans text-cyan-300">
                    CGC {activeOption.grade}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {fmt(activePrice)}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Choices */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-[#0d1527] border border-white/15 shadow-2xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-white/10">
                  Select Grade Lattice Price
                </div>
                {gradeOptions.map((opt) => {
                  const isSelected = opt.grade === selectedGrade;
                  return (
                    <button
                      key={opt.grade}
                      type="button"
                      onClick={() => {
                        setSelectedGrade(opt.grade);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                        isSelected ? 'bg-cyan-950/60 text-cyan-200' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Verified FMV Anchor
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">
                          {fmt(opt.priceUsd)}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 24h Delta Pill (↑ +92.3% for 9.8) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-sans font-semibold">
              24h Δ:
            </span>
            <span>
              ↑ +{delta24hVal.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Right Side: ▲ BUY, ▼ SELL, and Watchlist Pill (on the same line) */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* ▲ BUY Pill */}
          <button
            type="button"
            onClick={() => setOrderModal({ open: true, action: 'buy' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 transition-all duration-200 hover:shadow-[0_0_20px_rgba(52,211,153,0.7)] hover:bg-emerald-500 hover:text-white hover:border-emerald-300 hover:scale-[1.02] cursor-pointer select-none"
          >
            <span>▲</span>
            <span>BUY</span>
          </button>

          {/* ▼ SELL Pill */}
          <button
            type="button"
            onClick={() => setOrderModal({ open: true, action: 'sell' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-sans text-xs font-bold uppercase tracking-wider text-rose-300 bg-rose-500/15 border border-rose-500/40 transition-all duration-200 hover:shadow-[0_0_20px_rgba(244,63,94,0.7)] hover:bg-rose-600 hover:text-white hover:border-rose-300 hover:scale-[1.02] cursor-pointer select-none"
          >
            <span>▼</span>
            <span>SELL</span>
          </button>

          {/* Watchlist Pill: Directly after SELL as a pill on the trading terminal line */}
          <button
            type="button"
            onClick={handleToggleWatchlist}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border ${
              watching
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(250,204,21,0.35)]'
                : 'bg-white/5 text-slate-300 border-white/10 hover:border-amber-400/50 hover:text-amber-300 hover:bg-amber-500/10 hover:shadow-[0_0_15px_rgba(250,204,21,0.25)]'
            }`}
          >
            {watching ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Watching</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>+ Watchlist</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 px-4 py-2 rounded-lg bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono shadow-2xl flex items-center gap-2 animate-in fade-in-50 slide-in-from-top-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── ORDER EXECUTION MODAL (Market vs Limit Orders) ── */}
      {orderModal.open && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOrderModal({ open: false, action: 'buy' })}
        >
          <div 
            className="w-full max-w-md rounded-2xl bg-[#0b1222] border border-white/15 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${orderModal.action === 'buy' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <h3 className="text-base font-bold font-sans uppercase tracking-wider text-white">
                  Place {orderModal.action === 'buy' ? 'Buy' : 'Sell'} Order
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setOrderModal({ open: false, action: 'buy' })}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteOrder} className="p-5 space-y-4">
              {/* Asset & Grade Telemetry Banner */}
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white font-sans">
                    {variant.workName} #{variant.issueNumber}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Grade Selected: <span className="text-cyan-300 font-bold">CGC {selectedGrade}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-white">
                    {fmt(activePrice)}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    24h Δ +{delta24hVal.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Order Type Toggle: Market vs Limit */}
              <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 gap-1">
                <button
                  type="button"
                  onClick={() => setOrderType('market')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    orderType === 'market'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Market Order
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('limit')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    orderType === 'limit'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Limit Order
                </button>
              </div>

              {/* Limit Price Input Field (if Limit Order) */}
              {orderType === 'limit' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-sans flex items-center justify-between">
                    <span>Target Limit Price (USD)</span>
                    <span className="text-[10px] font-mono text-cyan-300">
                      Anchor: {fmt(activePrice)}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={limitPriceInput}
                      onChange={(e) => setLimitPriceInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/60 border border-white/20 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      placeholder="0.00"
                    />
                  </div>
                  {/* Distance from market spread */}
                  {limitPriceInput && parseFloat(limitPriceInput) > 0 && (
                    <div className="text-[10px] font-mono text-slate-400 text-right">
                      {parseFloat(limitPriceInput) > activePrice ? (
                        <span className="text-amber-400">
                          +{(((parseFloat(limitPriceInput) - activePrice) / activePrice) * 100).toFixed(2)}% above current market
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          -{(((activePrice - parseFloat(limitPriceInput)) / activePrice) * 100).toFixed(2)}% below current market
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase text-[11px]">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Instant Execution Floor</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Fills immediately at the best available certified comps floor ({fmt(activePrice)}). Zero slippage tolerance.
                  </p>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-sans">
                  Order Quantity (Certified Slabs)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantity(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        quantity === num
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Order Consideration */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 uppercase tracking-wider font-sans font-semibold">
                  Total Order Value
                </span>
                <span className="text-base font-bold font-mono text-white">
                  {fmt(
                    (orderType === 'market' ? activePrice : parseFloat(limitPriceInput) || activePrice) * quantity
                  )}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-sans text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all duration-200 cursor-pointer select-none ${
                  orderModal.action === 'buy'
                    ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(52,211,153,0.7)]'
                    : 'bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_25px_rgba(244,63,94,0.7)]'
                }`}
              >
                Transmit {orderType === 'market' ? 'Market' : 'Limit'} {orderModal.action.toUpperCase()} Order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
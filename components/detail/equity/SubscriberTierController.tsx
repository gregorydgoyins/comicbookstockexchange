'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  Zap, 
  Lock, 
  Unlock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  Sliders
} from 'lucide-react';

export type SubscriberTier = 'explorer' | 'pro' | 'institutional';

interface SubscriberTierControllerProps {
  currentTier: SubscriberTier;
  onTierChange: (tier: SubscriberTier) => void;
}

export default function SubscriberTierController({
  currentTier,
  onTierChange,
}: SubscriberTierControllerProps) {
  const [showPerksDrawer, setShowPerksDrawer] = useState(false);

  const TIER_DETAILS = {
    explorer: {
      name: 'Explorer Tier',
      tag: 'Free Public Access',
      color: 'border-slate-500/30 text-slate-300 bg-slate-500/10',
      badgeColor: 'text-slate-400',
      description: 'Standard retail valuation, public CGC census counts, and basic price history line charts.',
      perks: [
        'Base SOV price & 9.8 apex benchmark',
        'Public census registered count',
        'Basic 82-month price trajectory line',
      ],
    },
    pro: {
      name: 'Pro Trader Tier',
      tag: 'Active Subscriber',
      color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
      badgeColor: 'text-cyan-400',
      description: 'Full technical simulation tools, OHLC candles, Bollinger Bands, RSI-14 momentum, and portfolio position tracking.',
      perks: [
        'Full Technical Engine: OHLC Candles, BB20, RSI-14 & MACD',
        'Personal Holding Position Manager & Unrealized P&L Tracker',
        'Multi-Grade Order Book & Continuous Market Spread Ladder',
        'Watchlist & Deal Radar integration',
      ],
    },
    institutional: {
      name: 'Institutional Alpha',
      tag: 'Sovereign Desk Access',
      color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
      badgeColor: 'text-amber-400',
      description: '25-Firm Clean Underwriting Quotes, Raw-to-Slab Arbitrage ROI Engine, and Cross-Authority Evidence Registry.',
      perks: [
        '25-Firm Market-Maker Quotes with Capital Adequacy Ratios',
        'Slab Arbitrage & Replacement Economics Decision Calculator',
        'Cross-Authority Evidence Registry (eBay, ComicBase, GoCollect, PSA, PGX)',
        'Verified All-Time High (ATH) Certificate Provenance Ledger',
      ],
    },
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#090f1d]/80 backdrop-blur-md p-3 sm:p-4 shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tier Selector Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Subscriber Tier View:</span>
          </span>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/50 border border-white/10">
            {(['explorer', 'pro', 'institutional'] as const).map((tier) => {
              const isActive = currentTier === tier;
              return (
                <button
                  key={tier}
                  onClick={() => onTierChange(tier)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? tier === 'institutional'
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : tier === 'pro'
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-white/20 text-white border border-white/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tier === 'explorer' && 'Explorer'}
                  {tier === 'pro' && 'Pro Trader'}
                  {tier === 'institutional' && 'Institutional Alpha'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier Description & Toggle Drawer Button */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${TIER_DETAILS[currentTier].color}`}>
            {TIER_DETAILS[currentTier].tag}
          </span>
          <button
            onClick={() => setShowPerksDrawer((prev) => !prev)}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span>Tier Entitlements</span>
            {showPerksDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Perks Drawer */}
      {showPerksDrawer && (
        <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
          {(['explorer', 'pro', 'institutional'] as const).map((tier) => {
            const data = TIER_DETAILS[tier];
            const isCurrent = currentTier === tier;
            return (
              <div 
                key={tier} 
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  isCurrent ? 'bg-black/40 border-cyan-500/40 shadow-md' : 'bg-white/[0.02] border-white/5 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono font-bold ${data.badgeColor}`}>{data.name}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">{data.description}</p>
                <ul className="space-y-1 text-[10px] font-mono text-slate-300">
                  {data.perks.map((p, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

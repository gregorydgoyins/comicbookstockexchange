'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  TrendingUp,
  ShieldCheck,
  Target,
  BarChart2,
  PieChart,
  Compass,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

import InvestmentThesisCard from './InvestmentThesisCard';
import MarketMathPanel from './MarketMathPanel';
import ScarcityIndexCard from './ScarcityIndexCard';
import RsiPanel from './RsiPanel';
import PriceStatsPanel from './PriceStatsPanel';
import NightOwlPanel from './NightOwlPanel';
import MarketSentimentCard from './MarketSentimentCard';
import PriceAnchorCard from './PriceAnchorCard';
import GradeDistributionCard from './GradeDistributionCard';
import MarketPositionCard from './MarketPositionCard';
import CollectorProfileCard from './CollectorProfileCard';

import GradingArbitrageTerminal from './GradingArbitrageTerminal';
import PortfolioAssetReplicationDesk from './PortfolioAssetReplicationDesk';
import { MultiPerspectivePanel, type PerspectiveData } from '@/components/detail/shared/MultiPerspectivePanel';
import { MarketTruthPanel } from '@/components/detail/shared/MarketTruthPanel';
import type { DetailResponse, MarketMathData } from './types';
import type { LastSale } from '@/lib/comics/detail-model';

export interface FundamentalValuationHubProps {
  fullVariant: any;
  keyPrices: any;
  fullCensusSummary: any;
  seriesObj: any;
  priceHistory: any;
  eraColors: any;
  marketMathData: any;
  seriesLabel: string;
  comic: any;
  gradeLattice: any;
  rawPrice: number | null;
  rawLattice: any;
  consensusFmv: number;
  effectivePrice: number;
  authoritativePublisher: string;
  perspectiveData: any;
  snapshotLatest: string | null;
  latestSale: any;
  salesObservationsCount: number;
  totalGradedCount: number;
  censusAtOrAbove90: number | null;
  censusSnapshotDate: string | null;
}

type WidgetCategory = 'ALL' | 'THESIS' | 'QUANT' | 'SCARCITY';

interface WidgetDescriptor {
  id: string;
  number: string;
  title: string;
  category: 'THESIS' | 'QUANT' | 'SCARCITY';
  categoryLabel: string;
  description: string;
  component: React.ReactNode;
}

/**
 * Fundamental Valuation Hub
 * 
 * Consolidates the 11 valuation intelligence cards and 4 execution/consensus desks
 * into a seamless, high-density CSS masonry architecture.
 * Eliminates all vertical gaps and duplicate panels, and adds widget index numbering
 * to enable structured evaluation of what stays and what goes.
 */
export default function FundamentalValuationHub(props: FundamentalValuationHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory>('ALL');

  const {
    fullVariant,
    keyPrices,
    fullCensusSummary,
    seriesObj,
    priceHistory,
    eraColors,
    marketMathData,
    seriesLabel,
    comic,
    gradeLattice,
    rawPrice,
    rawLattice,
    consensusFmv,
    effectivePrice,
    authoritativePublisher,
    perspectiveData,
    snapshotLatest,
    latestSale,
    salesObservationsCount,
    totalGradedCount,
    censusAtOrAbove90,
    censusSnapshotDate,
  } = props;

  // Define the 11 unique analytical widgets with metadata
  const widgets: WidgetDescriptor[] = useMemo(
    () => [
      {
        id: 'widget-thesis',
        number: '01',
        title: 'INVESTMENT THESIS',
        category: 'THESIS',
        categoryLabel: 'Macro Scenario',
        description: 'Bull, Bear, and Base scenario valuations with forward catalytic drivers.',
        component: (
          <InvestmentThesisCard
            variant={fullVariant}
            keyPrices={keyPrices}
            censusSummary={fullCensusSummary as any}
            series={seriesObj as any}
            priceHistory={priceHistory}
            eraColors={eraColors}
          />
        ),
      },
      {
        id: 'widget-math',
        number: '02',
        title: 'MARKET MATH & RISK',
        category: 'QUANT',
        categoryLabel: 'Financial Metrics',
        description: 'CAGR, annualized volatility, Sharpe ratio, and historical drawdown.',
        component: <MarketMathPanel data={marketMathData} eraColors={eraColors} />,
      },
      {
        id: 'widget-scarcity',
        number: '03',
        title: 'CENSUS SCARCITY INDEX',
        category: 'SCARCITY',
        categoryLabel: 'Supply Analytics',
        description: 'Graded population density, survival rates, and float scarcity tier.',
        component: (
          <ScarcityIndexCard
            censusSummary={fullCensusSummary as any}
            variant={fullVariant}
            eraColors={eraColors}
          />
        ),
      },
      {
        id: 'widget-rsi',
        number: '04',
        title: 'MOMENTUM RSI RADAR',
        category: 'QUANT',
        categoryLabel: 'Technical Regime',
        description: '14-period relative strength index and overbought/oversold bands.',
        component: <RsiPanel workName={seriesLabel} history={priceHistory} eraColors={eraColors} />,
      },
      {
        id: 'widget-stats',
        number: '05',
        title: '52-WEEK PRICE STATS',
        category: 'QUANT',
        categoryLabel: 'Trading Range',
        description: 'Trailing high/low channel, ATH multiple, and expansion metrics.',
        component: <PriceStatsPanel history={priceHistory} eraColors={eraColors} issueReferencePoints={null} />,
      },
      {
        id: 'widget-nightowl',
        number: '06',
        title: 'OFF-HOURS LIQUIDITY GAUGE',
        category: 'QUANT',
        categoryLabel: 'Market Depth',
        description: 'Secondary market-maker bid/ask spread stability across trading sessions.',
        component: (
          <NightOwlPanel
            eraColors={eraColors}
            gradeLattice={gradeLattice}
            instrumentIntelligence={null}
            intelligenceSynthesis={`${seriesLabel} #${comic.issue_number} demonstrates disciplined liquidity depth and stable sovereign grade spread characteristics across current secondary market trading.`}
          />
        ),
      },
      {
        id: 'widget-sentiment',
        number: '07',
        title: 'INSTITUTIONAL SENTIMENT',
        category: 'SCARCITY',
        categoryLabel: 'Market Positioning',
        description: 'Composite sentiment score, collector demand index, and holding conviction.',
        component: (
          <MarketSentimentCard
            keyPrices={keyPrices}
            censusSummary={fullCensusSummary as any}
            priceHistory={priceHistory}
            gradeLattice={gradeLattice}
            eraColors={eraColors}
          />
        ),
      },
      {
        id: 'widget-anchors',
        number: '08',
        title: 'VALUATION ANCHORS',
        category: 'SCARCITY',
        categoryLabel: 'Price Floors',
        description: 'Psychological price anchors, historical support, and key resistance tiers.',
        component: (
          <PriceAnchorCard
            keyPrices={keyPrices as any}
            gradeLattice={gradeLattice}
            priceHistory={priceHistory}
            eraColors={eraColors}
          />
        ),
      },
      {
        id: 'widget-distribution',
        number: '09',
        title: 'GRADE DISTRIBUTION HISTOGRAM',
        category: 'SCARCITY',
        categoryLabel: 'Census Curve',
        description: 'Population frequency by certified grade tier and sovereign apex ratio.',
        component: (
          <GradeDistributionCard
            censusSummary={fullCensusSummary as any}
            eraColors={eraColors}
          />
        ),
      },
      {
        id: 'widget-position',
        number: '10',
        title: 'SECTOR MARKET POSITION',
        category: 'THESIS',
        categoryLabel: 'Peer Comparison',
        description: 'Rank within series, era percentile, and relative market capitalization.',
        component: (
          <MarketPositionCard
            variant={fullVariant}
            series={seriesObj as any}
            keyPrices={keyPrices as any}
            censusSummary={fullCensusSummary as any}
            eraColors={eraColors}
          />
        ),
      },
      {
        id: 'widget-collector',
        number: '11',
        title: 'COLLECTOR & INVESTOR PROFILE',
        category: 'THESIS',
        categoryLabel: 'Buyer Persona',
        description: 'Target acquisition persona, optimal holding horizon, and liquidity match.',
        component: (
          <CollectorProfileCard
            variant={fullVariant}
            keyPrices={keyPrices}
            censusSummary={fullCensusSummary as any}
            gradeLattice={gradeLattice}
            eraColors={eraColors}
          />
        ),
      },
    ],
    [
      fullVariant,
      keyPrices,
      fullCensusSummary,
      seriesObj,
      priceHistory,
      eraColors,
      marketMathData,
      seriesLabel,
      comic,
      gradeLattice,
    ],
  );

  const filteredWidgets = useMemo(() => {
    if (selectedCategory === 'ALL') return widgets;
    return widgets.filter((w) => w.category === selectedCategory);
  }, [widgets, selectedCategory]);

  return (
    <div className="space-y-8 font-sans">
      {/* =========================================================================
          ZONE 2: INTERACTIVE VALUATION & ARBITRAGE DESKS (2-COLUMN MASONRY)
         ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 rounded-sm bg-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Valuation Desks &amp; Market Consensus
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded">
            4 Interactive Clearing Desks
          </span>
        </div>

        {/* 2-Column Masonry for Desks */}
        <div className="columns-1 lg:columns-2 gap-6 [column-fill:_balance]">
          {/* Desk 1: Raw-to-Slab Yield Engine */}
          <div className="break-inside-avoid mb-6">
            <GradingArbitrageTerminal
              series={comic.series}
              issue={String(comic.issue_number)}
              rawMarketPrice={rawPrice != null ? Number(rawPrice) : rawLattice['RAW'] != null ? Number(rawLattice['RAW']) : null}
              gradeMatrixFmv={rawLattice as any}
              accentColor={eraColors.border}
            />
          </div>

          {/* Desk 2: Portfolio Asset Replication */}
          <div className="break-inside-avoid mb-6">
            <PortfolioAssetReplicationDesk
              comicId={comic.id}
              series={comic.series}
              issue={String(comic.issue_number)}
              year={comic.publication_year ?? null}
              publisher={authoritativePublisher}
              rawPrice={rawPrice != null ? Number(rawPrice) : rawLattice['RAW'] != null ? Number(rawLattice['RAW']) : null}
              targetFmv98={consensusFmv > 0 ? consensusFmv : rawLattice['9.8'] != null ? Number(rawLattice['9.8']) : null}
              accentColor={eraColors.border}
            />
          </div>

          {/* Desk 3: Multi-Perspective Consensus */}
          <div className="break-inside-avoid mb-6">
            <MultiPerspectivePanel
              data={perspectiveData}
              marketValue={`$${effectivePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              accentColor={eraColors.border}
            />
          </div>

          {/* Desk 4: Ground-Truth Truth Panel */}
          <div className="break-inside-avoid mb-6">
            <MarketTruthPanel
              price98={consensusFmv > 0 ? consensusFmv : null}
              price98AsOf={snapshotLatest}
              lastSale={latestSale}
              salesCount={salesObservationsCount}
              census={totalGradedCount > 0 ? { total: totalGradedCount, ninePlus: censusAtOrAbove90, snapshotDate: censusSnapshotDate } : null}
              accentColor={eraColors.border}
              institutionalData={{
                tier: (comic as any).institutional_tier || (comic.panel_profits_data as any)?.institutional_tier || null,
                intrinsicFloor: Number((comic as any).intrinsic_floor || (comic.panel_profits_data as any)?.intrinsic_floor || 0) || null,
                timeValue: Number((comic as any).time_value || (comic.panel_profits_data as any)?.time_value || 0) || null,
                bidAskSpreadPct: Number((comic as any).bid_ask_spread_pct || (comic.panel_profits_data as any)?.bid_ask_spread_pct || 0) || null,
                liquidityScore: Number((comic as any).liquidity_score || (comic.panel_profits_data as any)?.liquidity_score || 0) || null,
                volatilityScore: Number((comic as any).volatility_score || (comic.panel_profits_data as any)?.volatility_score || 0) || null,
                marketSignal: (comic as any).market_signal || (comic.panel_profits_data as any)?.market_signal || null,
              }}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          ZONE 3: VALUATION & RISK INTELLIGENCE CARDS (CONSOLIDATED 3-COLUMN MASONRY)
         ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        {/* Category Filter Controller Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#080d19]/90 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <LayoutGrid className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Valuation Intelligence &amp; Risk Widgets
                </h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold">
                  {filteredWidgets.length} OF 11 ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Consolidated masonry view. Each widget is indexed to review what stays and what goes.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              All (11)
            </button>
            <button
              onClick={() => setSelectedCategory('THESIS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                selectedCategory === 'THESIS'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Thesis &amp; Position (3)
            </button>
            <button
              onClick={() => setSelectedCategory('QUANT')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                selectedCategory === 'QUANT'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Quant &amp; Risk (4)
            </button>
            <button
              onClick={() => setSelectedCategory('SCARCITY')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                selectedCategory === 'SCARCITY'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              Scarcity &amp; Census (4)
            </button>
          </div>
        </div>

        {/* 3-Column Pure Masonry Grid */}
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
          {filteredWidgets.map((w) => (
            <div key={w.id} className="break-inside-avoid mb-4 group relative">
              {/* Widget Identification Sash */}
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-[#0d1424]/90 border border-white/10 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                    {w.number}
                  </span>
                  <span className="font-bold text-slate-200 uppercase tracking-wider">
                    {w.title}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 uppercase font-bold">
                  {w.categoryLabel}
                </span>
              </div>

              {/* The Actual Analytical Widget */}
              <div>{w.component}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

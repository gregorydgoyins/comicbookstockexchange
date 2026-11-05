'use client';

import React, { useState, useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';

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
import { MultiPerspectivePanel } from '@/components/detail/shared/MultiPerspectivePanel';
import { MarketTruthPanel } from '@/components/detail/shared/MarketTruthPanel';

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
 * Implements a strict, zero-gap multi-column masonry distribution for both:
 * 1. The 4 interactive clearing & consensus desks (2 balanced columns)
 * 2. The 11 valuation intelligence cards (3 balanced columns on desktop, 2 on tablet, 1 on mobile)
 * 
 * Eliminates all Chromium CSS column balancing glitches, voids, and empty column blocks.
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

  // Define the 11 unique analytical widgets with metadata and numbering
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

  // Explicit column distribution (Guarantees ZERO gaps)
  // 3 Columns for Desktop
  const col3_0 = useMemo(() => filteredWidgets.filter((_, i) => i % 3 === 0), [filteredWidgets]);
  const col3_1 = useMemo(() => filteredWidgets.filter((_, i) => i % 3 === 1), [filteredWidgets]);
  const col3_2 = useMemo(() => filteredWidgets.filter((_, i) => i % 3 === 2), [filteredWidgets]);

  // 2 Columns for Tablet
  const col2_0 = useMemo(() => filteredWidgets.filter((_, i) => i % 2 === 0), [filteredWidgets]);
  const col2_1 = useMemo(() => filteredWidgets.filter((_, i) => i % 2 === 1), [filteredWidgets]);

  const renderWidgetCard = (w: WidgetDescriptor) => (
    <div key={w.id} className="relative group w-full">
      {/* Sleek integrated index pill in top-right of panel */}
      <div className="absolute top-2.5 right-10 z-10 pointer-events-none">
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm backdrop-blur-sm">
          #{w.number}
        </span>
      </div>
      {w.component}
    </div>
  );

  return (
    <div className="space-y-8 font-sans w-full">
      {/* =========================================================================
          ZONE 2: VALUATION DESKS & MARKET CONSENSUS (2-COLUMN ZERO-GAP MASONRY)
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

        {/* Desktop: 2-Column Split (Zero Gaps) */}
        <div className="hidden lg:grid grid-cols-2 gap-6 items-start">
          <div className="flex flex-col gap-6">
            <GradingArbitrageTerminal
              series={comic.series}
              issue={String(comic.issue_number)}
              rawMarketPrice={rawPrice != null ? Number(rawPrice) : rawLattice['RAW'] != null ? Number(rawLattice['RAW']) : null}
              gradeMatrixFmv={rawLattice as any}
              accentColor={eraColors.border}
            />
            <MultiPerspectivePanel
              data={perspectiveData}
              marketValue={`$${effectivePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              accentColor={eraColors.border}
            />
          </div>

          <div className="flex flex-col gap-6">
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

        {/* Mobile / Tablet: Single Column */}
        <div className="flex flex-col gap-6 lg:hidden">
          <GradingArbitrageTerminal
            series={comic.series}
            issue={String(comic.issue_number)}
            rawMarketPrice={rawPrice != null ? Number(rawPrice) : rawLattice['RAW'] != null ? Number(rawLattice['RAW']) : null}
            gradeMatrixFmv={rawLattice as any}
            accentColor={eraColors.border}
          />
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
          <MultiPerspectivePanel
            data={perspectiveData}
            marketValue={`$${effectivePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            accentColor={eraColors.border}
          />
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

      {/* =========================================================================
          ZONE 3: 11 VALUATION & RISK INTELLIGENCE CARDS (EXPLICIT ZERO-GAP MASONRY)
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
                Zero-gap masonry layout. Each widget is indexed to review what stays and what goes.
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

        {/* ── DESKTOP: 3 Explicit Columns (ZERO GAPS AT ALL) ── */}
        <div className="hidden xl:grid grid-cols-3 gap-4 items-start w-full">
          <div className="flex flex-col gap-4 w-full">
            {col3_0.map(renderWidgetCard)}
          </div>
          <div className="flex flex-col gap-4 w-full">
            {col3_1.map(renderWidgetCard)}
          </div>
          <div className="flex flex-col gap-4 w-full">
            {col3_2.map(renderWidgetCard)}
          </div>
        </div>

        {/* ── TABLET: 2 Explicit Columns (ZERO GAPS AT ALL) ── */}
        <div className="hidden md:grid xl:hidden grid-cols-2 gap-4 items-start w-full">
          <div className="flex flex-col gap-4 w-full">
            {col2_0.map(renderWidgetCard)}
          </div>
          <div className="flex flex-col gap-4 w-full">
            {col2_1.map(renderWidgetCard)}
          </div>
        </div>

        {/* ── MOBILE: 1 Column Stack ── */}
        <div className="flex flex-col gap-4 md:hidden w-full">
          {filteredWidgets.map(renderWidgetCard)}
        </div>
      </div>
    </div>
  );
}

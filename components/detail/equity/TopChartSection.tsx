'use client';

import React, { useState } from 'react';
import MarketIntelTriGlyph from './MarketIntelTriGlyph';
import PriceChartPanel from './PriceChartPanel';
import ExecutionPreviewModal from './ExecutionPreviewModal';
import type { DetailResponse, GradePrice, HistoryEntry } from './types';
import type { ChartSale } from './TradingChartPanel';
import type { ExecutionQuote } from '@/lib/comics/detail-model';
import type { getEraColors } from '@/lib/design-system/colors';

interface TopChartSectionProps {
  variantId: string;
  variant: DetailResponse['variant'];
  keyPrices: DetailResponse['keyPrices'];
  gradeLattice: GradePrice[];
  priceHistory: HistoryEntry[];
  censusSummary: DetailResponse['censusSummary'];
  eraColors: ReturnType<typeof getEraColors>;
  quote: ExecutionQuote | null;
  creatorNames?: string[];
  sales?: ChartSale[];
}

function TopChartSection({
  variantId,
  variant,
  keyPrices,
  gradeLattice,
  priceHistory,
  censusSummary,
  eraColors,
  quote,
  creatorNames = [],
  sales = [],
}: TopChartSectionProps) {
  const [execModal, setExecModal] = useState<{ open: boolean; action: 'buy' | 'sell' }>({
    open: false,
    action: 'buy',
  });
  const [tradeConfirmation, setTradeConfirmation] = useState<{ action: 'buy' | 'sell'; id: number } | null>(null);

  return (
    <div id="section-chart" className="space-y-6 mb-6">
      {/* ── TRI-GLYPH 1: MARKET INTELLIGENCE TRIAD (Key Prices, Grade Spread, Census Snapshot) ── */}
      <MarketIntelTriGlyph
        variantId={variantId}
        variant={variant}
        keyPrices={keyPrices}
        gradeLattice={gradeLattice}
        priceHistory={priceHistory}
        censusSummary={censusSummary}
        eraColors={eraColors}
      />

      {/* ── FULL-WIDTH 82-MONTH VALUATION CHART TERMINAL ── */}
      <div className="w-full">
        <PriceChartPanel
          history={priceHistory}
          eraColors={eraColors}
          gradeLattice={gradeLattice}
          sales={sales}
        />
      </div>

      {execModal.open && (
        <ExecutionPreviewModal
          variant={variant}
          quote={quote}
          onClose={() => setExecModal({ open: false, action: 'buy' })}
          onConfirm={() => {
            setTradeConfirmation({ action: execModal.action, id: Date.now() });
            setExecModal({ open: false, action: 'buy' });
          }}
          eraColors={eraColors}
          action={execModal.action}
        />
      )}
    </div>
  );
}

export default TopChartSection;

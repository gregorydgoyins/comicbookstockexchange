export interface GradePrice { grade: string; priceUsd: number; salesVolume: number | null; observedAt: string | null; }
export interface HistoryEntry { grade: string; priceUsd: number; observedAt: string; source?: string; salesVolume?: number; }
export interface RelatedIssue {
  id: string;
  productName: string;
  variantDescription: string | null;
  issueNumber: string;
  year: number;
  publicationEra: string | null;
  fmv98Usd: number | null;
  fmv96Usd: number | null;
  fmv94Usd: number | null;
  fmvRawUsd: number | null;
  sovPriceUsd: number | null;
  sovGrade: string | null;
  censusTotal: number | null;
  census98: number | null;
  coverImageUrl: string | null;
  delta24h?: number | null;
}
export interface OtherPrinting { id: string; productName: string; variantDescription: string | null; variantKey: string; artifactType: string | null; fmv98Usd: number | null; coverImageUrl: string | null; }
export interface SaleRecord { grade: string; priceUsd: number; soldAt: string; venue: string; sourceUrl: string | null; certNumber: string | null; confidenceScore: number; fmvAtGradeUsd: number | null; saleDeltaPct: number | null; pedigreeName?: string | null; }

export interface LifetimeStats {
  pricePoints: number;
  allTimeHighUsd: number;
  allTimeLowUsd: number;
  maxDrawdownPct: number;
  lifetimeCv: number;
  firstObservation: string;
  lastObservation: string;
  dataSpanDays: number;
  avgRecoveryPoints: number | null;
}

export interface TitanEvent {
  tier: number;
  tick: number;
  drawdown: number;
  stress: number | null;
  stressIndex?: number | null;
  type: string;
  overlayDuration: number;
  triggeredAt: string;
}

export interface TitanHistory {
  totalEvents: number;
  highestTier: number;
  mostRecentTick: number | null;
  mostRecentTier: number | null;
  mostRecentDrawdown: number | null;
  events: TitanEvent[];
}

export interface ScarTissue {
  volAdjustment: number;
  elasticityAdj: number;
  spreadAdj: number;
  hasScar: boolean;
}

export interface TimelinePoint { date: string; priceUsd: number; }

export interface MarketMathData {
  variantId: string;
  sovereignGrade: string | null;
  marketPriceClass?: string | null;
  isSovereign?: boolean | null;
  partial: boolean;
  thinData?: boolean;
  momentum: {
    roc30d: number | null;
    roc90d: number | null;
    roc120d: number | null;
    direction: string | null;
    currentPrice: number | null;
    grade: string;
  } | null;
  velocityBands: {
    mu: number; sigma: number;
    upper2: number; upper1: number;
    lower1: number; lower2: number;
    currentPrice: number | null;
    position: string; dataPoints: number;
  } | null;
  gradeArbitrageIndex: {
    maxSpreadPct: number;
    highGrade: string | null;
    lowGrade: string | null;
    label: string;
    confirmedGradeCount: number;
  } | null;
  liquidityConcentration: {
    hhi: number; totalVolume: number; label: string; gradeCount: number;
  } | null;
  censusPressure: {
    cpr: number; populationAtOrAboveSov: number;
    totalSalesVol: number; sovereignGrade: string; label: string;
  } | null;
  priceEfficiency: {
    efficiencyPct: number; high90d: number; low90d: number;
    label: string; dataPoints: number;
  } | null;
}

export interface TemporalMemory {
  lifetimeStats: LifetimeStats | null;
  principalHistory: TitanHistory;
  scarTissue: ScarTissue;
  timelineStrip: TimelinePoint[];
  anchorGrade: number | null;
  anchorPriceUsd: number | null;
  anchorSalesVolume: number | null;
  anchorConfidence: string | null;
}

export interface CulturalVideo {
  videoId: string; title: string; channel: string;
  score: number; rawScore?: number; weightedScore?: number;
  matchReason: string; duration: string | null;
}
export interface ArchiveVideoSlot {
  videoId: string; title: string; channel: string;
  thumbnailUrl: string; youtubeUrl: string;
  role: string; aiCaption: string;
}
export interface CulturalIntelligence {
  success: boolean;
  canonicalSignificance: {
    flags: string[]; era: string; eraColor: string; year: number;
    issueNumber: string; workName: string; publisher: string;
    isFirstIssue: boolean; premiumRatio: number;
    keyIssueScore: number; significanceLabel: string;
  };
  relatedAnalysis: {
    semanticQuery: string; videos: CulturalVideo[];
    count: number; pineconeOk: boolean;
    culturalDensity?: {
      cdiPercentile: string;
      sourceCount: number;
      matchCount: number;
    };
  };
  archiveSlots?: {
    left: ArchiveVideoSlot | null;
    center: ArchiveVideoSlot | null;
    right: ArchiveVideoSlot | null;
  };
  narrative?: {
    issueNarrative: string;
    storyArc: string;
    seriesHistory: string;
    historicalContext: string;
    collectorIntel?: string;
    marketSignal?: string;
    historicalSeries?: string;
    keyFacts?: string;
    assetMetadata?: string;
  } | null;
}

export interface AIIntelligenceBlocks {
  priceStory?: string;
  censusNarrative?: string;
  survivorBias?: string;
  creatorSignature?: string;
  intelligenceSynthesis?: string;
  anchorGradeRationale?: string;
}

export interface EquityTruthLayer {
  variantId: string;
  anchorGrade: number | null;
  anchorPriceUsd: number | null;
  anchorSalesVolume: number | null;
  anchorConfidence: string;
  sovGrade: number | null;
  sovPriceUsd: number | null;
  assetClass: string | null;
  price99Usd: number | null;
  price100Usd: number | null;
  ism99: number | null;
  ism100: number | null;
  ismMethod99: string | null;
  ismMethod100: string | null;
  censusTotalGraded: number | null;
  census98: number | null;
  census99: number | null;
  census100: number | null;
  censusScope: string | null;
  labelDistribution: Record<string, number>;
  graderSpread: Record<string, { multiplier: number; price_usd: number }>;
  scarcityTier: string | null;
  supplyAdjustment: number;
  computedAt: string;
}

export interface ArcStress {
  hasTradingHistory: boolean;
  maxDrawdownPct: number;
  peakVolatility: number;
  t3PlusEvents: number;
  principalInterventions: number;
  lifespanDays: number;
  marketTimelinePct: number;
  recoveryDays: number | null;
  recoveryVsMedianPct: number | null;
  isFullyRecovered: boolean;
}
export interface ArcRanking {
  structuralRank: number;
  totalArcs: number;
  canonTier: 'S' | 'A' | 'B' | 'C';
  resilienceQuartile: string;
  asi: number;
  structuralPosition?: string;
}
export interface ArcRevisionEntry {
  tick_number: number;
  prev_tier: string | null;
  new_tier: string;
  prev_asi: string | null;
  new_asi: string;
  delta_asi: string | null;
  prev_rank: number | null;
  new_rank: number;
  observed_at: string;
}
export interface ArcRecord {
  arcId: string; name: string; publisher: string; era: string;
  arcType: string; significanceWeight: number; issueCount: number;
  startIssueKey: string; endIssueKey: string; notes: string;
  partNumber: number; isFirst: boolean; isFinal: boolean; narrativeWeight: number;
  arcStress?: ArcStress | null;
  arcRanking?: ArcRanking | null;
  revisionLog?: ArcRevisionEntry[];
}
export interface ArcData {
  variantId: string;
  primaryArc: ArcRecord | null;
  secondaryArcs: ArcRecord[];
  totalArcs: number;
}

export interface CompletenessData {
  sections: { cover: boolean; census: boolean; gradeLattice: boolean; priceHistory: boolean; recentSales: boolean; liquidity: boolean };
  score: number; total: number; grade: string;
}

export interface DetailResponse {
  completeness?: CompletenessData;
  variant: {
    id: string; workId: string | null; issueId: string | null;
    productName: string; variantDescription: string | null; variantKey: string; artifactType?: string | null;
    assetClass: string | null; marketLane: string | null;
    isSovereign?: boolean | null; marketPriceClass?: string | null; certificationState?: string | null; editionForm?: string | null;
    productId: string; sourceSlug: string;
    issueNumber: string; year: number | null; productYear: number | null; yearDivergence: boolean; yearGap: number;
    workName: string; publisher: string;
    era: string; scarcityTier: string; coverImageUrl: string | null;
    coverSource: string | null; coverMeta?: { source: string | null; verified: boolean; eraVerified: boolean; adminVerified: boolean }; coverVerified: boolean; coverResolvedAt: string | null;
    totalGradesPriced: number; issueStatus: string;
    identityConfidence: number | null;
  };
  wikiSummary: string | null;
  series: { totalIssues: number; totalPriced: number; lastCrawled: string | null; category: string; };
  keyPrices: { fmv98Usd: number; fmv10Usd: number | null; fmvRawUsd: number | null; sovPriceUsd: number; sovGrade: string | null; premiumPct: number | null; gradeCount: number; observedAt: string | null; anchor9_8: number; display_fmv_usd: number | null; display_grade: string | null; delta24h?: number | null; };
  gradeLattice: GradePrice[];
  priceHistory: HistoryEntry[];
  otherPrintings: OtherPrinting[];
  seriesIssues: RelatedIssue[];
  recentSales: SaleRecord[];
  latestSaleImageUrl?: string | null;
  saleIntelligence: { totalSales: number; lastSaleDate: string | null; daysSinceLastSale: number | null; confidenceWeightedMeanPrice: number | null; } | null;
  instrumentIntelligence?: InstrumentIntelligence | null;
  instrumentStates: {
    sovereign: { grade: string; priceUsd: number; salesVolume?: number } | null;
    anchor:    { grade: string; priceUsd: number; salesVolume: number } | null;
    atomic:    { grade: string; priceUsd: number } | null;
    anchorToAtomicMultiple: number | null;
    sovereignToAtomicMultiple: number | null;
  } | null;
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
    floatConcentration: number | null;
    snapshotDate: string;
    histogram: { grade: string; count: number }[];
    scope: 'variant' | 'issue';
    isBaseVariant: boolean;
  } | null;
  temporalMemory: TemporalMemory;
  structuralBreak?: string | null;
  issueReferencePoints?: IssueReferencePoints | null;
  demandSignals?: {
    providers: {
      system: string;
      pullCount: number;
      wishlistCount: number;
      ownedCount: number;
      densityPercentile: number | null;
      observedAt: string;
    }[];
  } | null;
  externalFmvSurfaces?: {
    providers: Record<string, {
      grade: string;
      priceUsd: number;
      observedAt: string;
      sourceUrl: string | null;
      rawContentHash: string | null;
    }[]>;
  } | null;
  bibliographicCanon?: {
    sourceSystem: string;
    totalUnits: number;
    units: {
      sequenceNumber: number;
      unitType: string;
      title: string;
      feature: string;
      pageCount: number | null;
      genre: string;
      synopsis: string;
      credits: {
        name: string;
        role: string;
        isUncertain?: boolean;
      }[];
    }[];
  } | null;
  storyArcs?: {
    totalArcs: number;
    arcs: {
      arcId: string;
      name: string;
      publisher: string;
      era: string;
      arcType: string;
      significanceWeight: number;
      notes: string | null;
      partNumber: number;
      isFirst: boolean;
      isFinal: boolean;
      primaryFlag: boolean;
      narrativeWeight: number;
    }[];
  } | null;
  newsIntelligence?: {
    totalEvents: number;
    scope: 'ENTITY_ATTACHED' | 'MARKET_OVERVIEW';
    events: {
      id: string;
      headline: string;
      category: string;
      sourceName: string;
      publishedAt: string;
      summary: string;
      relevanceScore: number;
      sourceUrl: string | null;
      attachmentRole: string | null;
      possibleConsequence: string | null;
    }[];
  } | null;
}

export interface IssueReferencePoints {
  sovereignGrade: number | null;
  sovereignPriceUsd: number | null;
  anchorGrade: number | null;
  anchorPriceUsd: number | null;
  rarityGap: number | null;
}

export interface SpreadAnchor { buy: number; sell: number; spread: number; }
export interface SpreadStateData {
  liquidityScore?: number | null; spreadMethod: string;
  baseSpread?: number | null; currentSpread?: number | null;
  observedAnchors: Record<string, SpreadAnchor>;
}

export interface BollingerPoint { date: string; price: number; sma20: number; upperBand: number; lowerBand: number; }
export interface RsiPoint { date: string; rsi: number; price: number; }
export interface PriceStatPeriod { period: string; days: number; open: number; high: number; low: number; close: number; avg: number; change: number; changePercent: number; volume: number; volatility: number; }
export interface Creator { id?: string; name: string; role: string; bio: string | null; imageUrl?: string | null; notableWorks: string[]; activeYears: string | null; wikiUrl: string | null; }
export interface NewsItem { id: string; title: string; summary: string | null; url: string; source: string; publishedAt: string; aiScore?: number | null; }
export interface ComputedExecution {
  slippageBps: [number, number];
  fillProbability: number;
  fillDays: number | null;
  structuralRiskFlag: boolean;
  regime: 'CALM' | 'NORMAL' | 'ELEVATED' | 'PANIC' | null;
  policyVersion: string | null;
  baseSlippageBps: [number, number];
  baseFillProbability: number;
}

export interface MarketRegime {
  binaryRegime: 'CALM' | 'VOLATILE';
  fourStateRegime: 'CALM' | 'NORMAL' | 'ELEVATED' | 'PANIC';
  drawdown: number | null;
  tick: number;
  stressIndex: number | null;
  tectonicTier: number;
  tectonicLabel: string;
  panicDurationTicks: number;
  principalOverlayActive: boolean;
  principalOverlayTier: number;
  principalOverlayRemaining: number;
  principalOverlayTotal: number;
  scarVolAdjustment: number;
  scarElasticityAdj: number;
  scarSpreadAdj: number;
}

export interface InstrumentIntelligence {
  anchorClass: 'SOVEREIGN' | 'ATOMIC' | 'STD' | 'OTC';
  liquidityScore: number;
  liquidityTier: 'Deep' | 'Active' | 'Thin' | 'Dormant';
  expectedFillDays: number | null;
  volatilityPct: number | null;
  volatilityCv: number | null;
  volatilityRegime: 'CALM' | 'NORMAL' | 'ELEVATED' | 'PANIC' | null;
  computedExecution: ComputedExecution;
  marketRegime: MarketRegime | null;
}

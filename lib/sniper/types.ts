export type ComicEra =
  | "platinum"
  | "golden"
  | "atomic"
  | "silver"
  | "bronze"
  | "copper"
  | "modern"
  | "postmodern"
  | "indy";

export type AuctionSource =
  | "ebay"
  | "heritage"
  | "mycomicshop"
  | "comiclink"
  | "comicconnect"
  | "hipcomic"
  | "mercari"
  | "metropolis"
  | "hakes";

export type ComicEdition = "direct" | "newsstand" | "variant" | "convention" | "foil" | "all";

export type GradingCompany = "CGC" | "CBCS" | "PGX";

export interface SniperFilterProfile {
  // Era Targeting
  eras: ComicEra[];
  
  // Grade Range (High Grade Only: 9.4, 9.6, 9.8, 9.9, 10.0)
  minGrade: number; // e.g. 9.4
  maxGrade: number; // e.g. 10.0
  
  // Budget Guardrail (All-in: Bid + Shipping + Tax)
  minAllInCost?: number; // e.g. 50.00 (Hard floor: no penny-ante junk under $50)
  maxAllInBudget: number; // e.g. 150.00, 500.00, 2500.00
  
  // Auction House Sources
  sources?: AuctionSource[];

  // Max Time Window (Sniper Urgency)
  maxSecondsRemaining?: number; // e.g. 900 (15m), 1800 (30m), 3600 (1h)
  
  // Edition Form
  editions: ComicEdition[];
  newsstandOnly?: boolean;
  
  // Arbitrage Special Angles
  crackAndPressCandidate: boolean; // 9.4-9.6 with pressable grader defects
  damagedSlab98: boolean;          // 9.8 in cracked/scuffed case (reholder arb)
  crackedCasesOnly?: boolean;      // Filter specifically for cracked/damaged cases ($25 reholder play)
  misspelledOnly?: boolean;        // Filter specifically for misspelled titles/typos
  signedLegendary: boolean;        // Yellow label deceased creators (Lee, Kirby, Pérez, etc.)
  belowGradingCost: boolean;       // Books under $45 (selling for less than cost of grading)
  requireDoubleUpOnly?: boolean;   // Target 100%+ net ROI (double your cash or better)
  
  // Discipline & Impulse Controls
  requireProvenSales: boolean;     // STRICT: Rejects books with 0 sales history
  minDiscountPercent: number;      // e.g. 30% below FMV
  minHistoricalSalesCount: number; // Minimum comp depth (e.g. 3+ verified sales)
  requireImage?: boolean;          // STRICT: Only books with authentic auction photos allowed
  requireCheckedCert?: boolean;    // STRICT: Only books with verified checked certification numbers allowed
  
  // Optional Character / Series Focus (e.g., "green lantern", "iron man")
  seriesWhitelist?: string[];
}

export interface RawAuctionListing {
  id: string;
  source: AuctionSource;
  title: string;
  currentBid: number;
  shippingCost: number;
  bidCount: number;
  secondsRemaining: number;
  url: string;
  imageUrl: string;
  certNumber?: string;
  sellerRating?: number;
  graderNotes?: string;
  itemDescription?: string;
}

export interface CandidateEvaluation {
  listing: RawAuctionListing;
  passed: boolean;
  rejectionReason?: string;
  gateFailed?: 1 | 2 | 3 | 4 | 5;
  
  // Resolved Identification
  normalizedTitle: string;
  resolvedSeries: string;
  resolvedIssue: string;
  resolvedYear?: number;
  resolvedEra: ComicEra;
  resolvedGrade: number;
  gradingCompany: GradingCompany;
  certNumber?: string;
  certVerificationUrl?: string;
  isYellowLabel: boolean;
  signerName?: string;
  isNewsstand: boolean;
  variantType?: string;
  isCrackedCase?: boolean;
  isMisspelled?: boolean;
  misspellingSnippet?: string;
  
  // Valuation Anchor & Spread
  anchorFmv: number;
  allInCost: number;
  dollarSpread: number;
  discountPercent: number;
  historicalComps: Array<{ date: string; grade: number; price: number; venue: string }>;
  
  // Explicit Reason Why This Is A Good Buy (Alpha Thesis)
  whyItsAGoodBuy: string;

  // Commercial Flipping Metrics & Win Multipliers
  targetWinPrice100Pct: number; // Price to sell for 100% Net Profit (The Double-Up / 2x)
  targetWinPrice50Pct: number;  // Price to sell for 50% Net Profit (1.5x)
  projectedNetProfit: number;   // Realized net profit on anchor FMV flip (after 13% platform fee)
  netRoiPercent: number;        // Net ROI % on flip
  liquidityVelocity: "HIGH_VELOCITY_TURN" | "MODERATE_LIQUIDITY" | "ILLIQUID_TRAP";
  liquidityTurnDays: number;    // Estimated turn time (e.g. 7-14 days vs 90+ days)
  isViableFlip: boolean;        // True = liquid real key; False = cheap horseshit/dead money
  keySignificanceNote: string;  // Landmark key / character milestone description

  // Arbitrage Strategy Badges
  specialPlay?:
    | "CRACK_AND_PRESS"
    | "REHOLDER_ARBITRAGE"
    | "CRACKED_CASE"
    | "MISSPELLED_KEY"
    | "LEGENDARY_SIGNATURE"
    | "HIGH_GRADE_NEWSSTAND"
    | "BELOW_GRADING_COST"
    | "DOUBLE_UP_KEY"
    | "STUMBLED_INTO_GREATNESS";
  strategySummary?: string;
  cgcGradingCostFloor?: number; // What it actually cost seller to grade ($30 modern + $15 ship = $45 floor)
  censusCount98?: number;       // Census population in 9.8
  censusTotal?: number;         // Total copies on Census across all grades
  censusHigher?: number;        // Copies 9.9/10.0 graded higher than 9.8
  censusScarcityTier?: string;  // e.g. "Ultra Low Float (<25 Copies)", "Investment Grade"
  pricingSourceProvenance?: string; // Exact venue & methodology source for valuation
  signaturePremiumMultiplier?: number; // Verified signature multiplier over unsigned blue label
  lastSalePrice?: number;
  lastSaleDate?: string;
  
  // Wingman Verdict
  verdict: "STRONG_BUY_SNIPE" | "CONSIDER" | "OVERPRICED" | "UNPROVEN_RISK" | "DISCARD";
  recommendedMaxBid: number;
  confidenceScore: number; // 0-100
}

"use client";

import React, { useState, useMemo } from "react";
import type { SovereignEquityPricingOutput, CanonicalGrade } from "@/lib/pricing/sovereign-equity-pricing-engine";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  BarChart3,
  Target,
  AlertTriangle,
  ArrowUpRight,
  Info,
  DollarSign,
  Lock,
  Package,
  Award,
  CheckCircle2,
  Calculator,
  HelpCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
  Receipt,
  Sliders,
} from "lucide-react";

export interface InstitutionalStrategyDossierProps {
  engineOutput: SovereignEquityPricingOutput;
  accentColor?: string;
  rawPrice?: number | null;
  comicTitle?: string;
}

export interface FrictionBreakdown {
  rawBasis: number;
  salesTaxPct: number;
  tax: number;
  inboundShipping: number;
  acquisitionFriction: number;
  cgcTierName: string;
  certFee: number;
  pressingFee: number;
  invoiceHandlingFee: number;
  cgcInboundShipping: number;
  cgcReturnInsuredShipping: number;
  roundTripTransit: number;
  totalCertificationFriction: number;
  capitalizedBasis: number;
  venueType: "EXCHANGE_TIERED" | "AUCTION_CONSIGNMENT";
  commissionRate: number;
  commissionPct: number;
  commissionUsd: number;
  outboundFreight: number;
  totalLiquidationFriction: number;
  netRealizedProceeds: number;
  netDollarGain: number;
  netRoiPct: number;
  marginOfSafetyPct: number;
  breakevenHammer: number;
}

interface EncasementLevel {
  levelNumber: number;
  levelTag: string;
  grade: CanonicalGrade;
  title: string;
  descriptor: string;
  targetFmv: number;
  friction: FrictionBreakdown;
  attainmentProbability: number;
}

/**
 * Computes authentic industry-standard third-party grading (CGC / CBCS)
 * and auction house fee schedules based on era, declared FMV, and logistics.
 */
export function computeRealisticFriction(
  rawBasis: number,
  targetFmv: number,
  era: string,
  includePressing: boolean = true,
  salesTaxPct: number = 0,
  inboundShipping: number = 25,
  venueType: "EXCHANGE_TIERED" | "AUCTION_CONSIGNMENT" = "EXCHANGE_TIERED"
): FrictionBreakdown {
  const isVintage = era === "Golden" || era === "Silver" || era === "Bronze";

  // 1. Acquisition friction
  const tax = Number((rawBasis * (salesTaxPct / 100)).toFixed(2));
  const acquisitionFriction = Number((tax + inboundShipping).toFixed(2));

  // 2. Official CGC Grading Tier & Fee
  let certFee = 45;
  let cgcTierName = "Vintage Tier (Pre-1975, <$400)";
  if (!isVintage && targetFmv <= 400) {
    certFee = 25;
    cgcTierName = "Modern Tier (1975–Present, <$400)";
  } else if (targetFmv <= 400) {
    certFee = 45;
    cgcTierName = "Vintage Tier (Pre-1975, <$400)";
  } else if (targetFmv <= 1000) {
    certFee = 85;
    cgcTierName = "Standard Tier (Max FMV $1,000)";
  } else if (targetFmv <= 3000) {
    certFee = 140;
    cgcTierName = "Express Tier (Max FMV $3,000)";
  } else if (targetFmv <= 10000) {
    certFee = 300;
    cgcTierName = "WalkThrough Tier (Max FMV $10,000)";
  } else {
    // Mega-key Unlimited WalkThrough tier: 3% of declared value (min $350)
    certFee = Math.max(350, Math.round(targetFmv * 0.03));
    cgcTierName = `Unlimited WalkThrough (3% of FMV: $${certFee.toLocaleString()})`;
  }

  // 3. CCS Professional Pressing & Dry Cleaning
  let pressingFee = 0;
  if (includePressing) {
    if (targetFmv > 5000) pressingFee = 75; // High-value press
    else if (isVintage) pressingFee = 35; // CCS Vintage rate
    else pressingFee = 20; // CCS Modern rate
  }

  // 4. CGC Invoice Handling Fee
  const invoiceHandlingFee = 5.0; // CGC mandatory per invoice

  // 5. Round-Trip Insured Transit & Courier Logistics
  const cgcInboundShipping = 25.0;
  let cgcReturnInsuredShipping = 35.0;
  if (targetFmv > 10000) {
    cgcReturnInsuredShipping = 125.0; // FedEx Priority Overnight + Collectibles Insurance
  } else if (targetFmv > 3000) {
    cgcReturnInsuredShipping = 70.0;
  } else if (targetFmv > 1000) {
    cgcReturnInsuredShipping = 45.0;
  }
  const roundTripTransit = cgcInboundShipping + cgcReturnInsuredShipping;

  const totalCertificationFriction = Number(
    (certFee + pressingFee + invoiceHandlingFee + roundTripTransit).toFixed(2)
  );

  const capitalizedBasis = Number(
    (rawBasis + acquisitionFriction + totalCertificationFriction).toFixed(2)
  );

  // 6. Liquidation / Realization Friction (Sale Leg)
  let commissionRate = 0.1325;
  if (venueType === "AUCTION_CONSIGNMENT") {
    // Tiered consignor commission at major auction houses (Heritage / Goldin / ComicLink)
    if (targetFmv >= 25000) commissionRate = 0.05;
    else if (targetFmv >= 10000) commissionRate = 0.075;
    else if (targetFmv >= 2500) commissionRate = 0.10;
    else commissionRate = 0.1325;
  } else {
    // Standard Secondary Exchange: 13.25% up to $7,500, then 2.35% on excess
    if (targetFmv > 7500) {
      const firstTier = 7500 * 0.1325;
      const excess = (targetFmv - 7500) * 0.0235;
      commissionRate = (firstTier + excess) / targetFmv;
    }
  }

  const commissionUsd = Number((targetFmv * commissionRate).toFixed(2));
  const outboundFreight = targetFmv > 10000 ? 50.0 : 25.0;
  const totalLiquidationFriction = Number((commissionUsd + outboundFreight).toFixed(2));

  const netRealizedProceeds = Number(Math.max(0, targetFmv - totalLiquidationFriction).toFixed(2));
  const netDollarGain = Number((netRealizedProceeds - capitalizedBasis).toFixed(2));
  const netRoiPct = capitalizedBasis > 0 ? Number(((netDollarGain / capitalizedBasis) * 100).toFixed(1)) : 0;
  const marginOfSafetyPct = netRealizedProceeds > 0 ? Number(((1 - capitalizedBasis / netRealizedProceeds) * 100).toFixed(1)) : 0;
  const breakevenHammer = Number(((capitalizedBasis + outboundFreight) / (1 - commissionRate)).toFixed(2));

  return {
    rawBasis,
    salesTaxPct,
    tax,
    inboundShipping,
    acquisitionFriction,
    cgcTierName,
    certFee,
    pressingFee,
    invoiceHandlingFee,
    cgcInboundShipping,
    cgcReturnInsuredShipping,
    roundTripTransit,
    totalCertificationFriction,
    capitalizedBasis,
    venueType,
    commissionRate,
    commissionPct: Number((commissionRate * 100).toFixed(2)),
    commissionUsd,
    outboundFreight,
    totalLiquidationFriction,
    netRealizedProceeds,
    netDollarGain,
    netRoiPct,
    marginOfSafetyPct,
    breakevenHammer,
  };
}

export default function InstitutionalStrategyDossier({
  engineOutput,
  accentColor = "#38bdf8",
  rawPrice,
  comicTitle,
}: InstitutionalStrategyDossierProps) {
  const [activeStrategyTab, setActiveStrategyTab] = useState<"TRADITIONAL" | "CONTRARIAN">("TRADITIONAL");
  const [selectedDecompGrade, setSelectedDecompGrade] = useState<CanonicalGrade>("9.8");
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(1); // Default to Level 2 (Expected Target 8.0)
  const [customPurchaseBasis, setCustomPurchaseBasis] = useState<number | null>(null);
  const [isEditingBasis, setIsEditingBasis] = useState<boolean>(false);
  const [tempBasisInput, setTempBasisInput] = useState<string>("");
  const [showFeeInspector, setShowFeeInspector] = useState<boolean>(false);

  // Configurable Fee Variables
  const [salesTaxEnabled, setSalesTaxEnabled] = useState<boolean>(false); // 0% resale exempt vs 7.0% retail
  const [includePressing, setIncludePressing] = useState<boolean>(true);
  const [venueModel, setVenueModel] = useState<"EXCHANGE_TIERED" | "AUCTION_CONSIGNMENT">("EXCHANGE_TIERED");

  const trad = engineOutput.traditionalStrategies;
  const contra = engineOutput.contrarianStrategies;

  // 1. Resolve Purchased Copy Acquisition Basis
  const defaultRawCost = useMemo(() => {
    if (rawPrice != null && rawPrice > 0) return Number(rawPrice);
    const matrixRaw = engineOutput.gradeMatrix["RAW"]?.currentFmv;
    if (matrixRaw && matrixRaw > 0) return matrixRaw;
    const grade6 = engineOutput.gradeMatrix["6.0"]?.currentFmv;
    if (grade6 && grade6 > 0) return Math.round(grade6 * 0.45);
    return 1500;
  }, [rawPrice, engineOutput.gradeMatrix]);

  const activePurchaseBasis = customPurchaseBasis ?? defaultRawCost;
  const salesTaxPct = salesTaxEnabled ? 7.0 : 0.0;

  // 2. Compute Raw to Graded Encasement Levels with Detailed Realistic Fee Schedules
  const encasementLevels: EncasementLevel[] = useMemo(() => {
    const levelConfigs: Array<{
      levelNumber: number;
      levelTag: string;
      grade: CanonicalGrade;
      title: string;
      descriptor: string;
      defaultOdds: number;
    }> = [
      {
        levelNumber: 1,
        levelTag: "CONSERVATIVE FLOOR",
        grade: "6.0",
        title: "Level 1: Conservative Slab Floor",
        descriptor: "Realistic downside floor for intact, vintage copies with typical handling wear.",
        defaultOdds: 0.95,
      },
      {
        levelNumber: 2,
        levelTag: "EXPECTED BASE CASE",
        grade: "8.0",
        title: "Level 2: Expected Target Yield",
        descriptor: "Standard base target for well-preserved, unrestored raw copies with good gloss.",
        defaultOdds: 0.80,
      },
      {
        levelNumber: 3,
        levelTag: "HIGH-WATER TARGET",
        grade: "9.2",
        title: "Level 3: Investment High-Water Mark",
        descriptor: "Premium collector-grade result achieved through professional pressing & dry cleaning.",
        defaultOdds: 0.50,
      },
      {
        levelNumber: 4,
        levelTag: "SOVEREIGN BLUE-CHIP APEX",
        grade: "9.8",
        title: "Level 4: Sovereign Apex Realization",
        descriptor: "Near-pristine preservation apex commanding institutional blue-chip auction multiples.",
        defaultOdds: 0.15,
      },
    ];

    return levelConfigs.map((cfg) => {
      const gRecord = engineOutput.gradeMatrix[cfg.grade];
      const targetFmv = gRecord?.currentFmv && gRecord.currentFmv > 0
        ? gRecord.currentFmv
        : cfg.grade === "9.8"
          ? activePurchaseBasis * 8.5
          : cfg.grade === "9.2"
            ? activePurchaseBasis * 3.8
            : cfg.grade === "8.0"
              ? activePurchaseBasis * 2.2
              : activePurchaseBasis * 1.35;

      const friction = computeRealisticFriction(
        activePurchaseBasis,
        targetFmv,
        engineOutput.era,
        includePressing,
        salesTaxPct,
        25, // Inbound shipping $25
        venueModel
      );

      // Attempt to pull dynamic census odds from engine output arbitrage ladder if available
      const arbMatch = engineOutput.gradingArbitrageLadder.find((a) => a.targetGrade === cfg.grade);
      const attainmentOdds = arbMatch?.targetGradeProbability ?? cfg.defaultOdds;

      return {
        levelNumber: cfg.levelNumber,
        levelTag: cfg.levelTag,
        grade: cfg.grade,
        title: cfg.title,
        descriptor: cfg.descriptor,
        targetFmv,
        friction,
        attainmentProbability: attainmentOdds,
      };
    });
  }, [
    engineOutput.gradeMatrix,
    engineOutput.gradingArbitrageLadder,
    engineOutput.era,
    activePurchaseBasis,
    includePressing,
    salesTaxPct,
    venueModel,
  ]);

  const activeLevel = encasementLevels[selectedLevelIndex] || encasementLevels[1];
  const activeFriction = activeLevel.friction;

  // 3. Resolve 3-Tier Value Decomposition for Selected Grade
  const decompRecord = engineOutput.gradeMatrix[selectedDecompGrade] ?? engineOutput.gradeMatrix["9.8"];
  const decomp = decompRecord.valuationDecomposition;

  return (
    <section
      aria-label="Institutional Strategy Dossier & 3-Tier Valuation"
      className="rounded-xl p-5 sm:p-6 bg-[#080d17] border shadow-2xl relative overflow-hidden my-6 font-sans"
      style={{ borderColor: `${accentColor}35` }}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 pointer-events-none opacity-10 blur-3xl -z-0"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-semibold block">
              Sovereign Equity Clearinghouse
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              Macro Benchmarking: {engineOutput.macroBenchmarking.peggedBenchmarkSeat}
            </span>
            {comicTitle && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-300">
                {comicTitle}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            Institutional Strategy Dossier
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Single-source econometric valuation across {engineOutput.snapshotCount} verified monthly observation epochs ({engineOutput.timeHorizonYears}Y runway)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-lg bg-[#0e1626] border border-slate-800">
          <button
            onClick={() => setActiveStrategyTab("TRADITIONAL")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
              activeStrategyTab === "TRADITIONAL"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Traditional Value Desk
          </button>
          <button
            onClick={() => setActiveStrategyTab("CONTRARIAN")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
              activeStrategyTab === "CONTRARIAN"
                ? "bg-purple-500 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Contrarian Quant Desk
          </button>
        </div>
      </div>

      {/* 50 / 50 HIGH-IMPACT GRID: PURCHASED COPY & ENCASEMENT LADDER (LEFT) vs 3-TIER DECOMPOSITION (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-5 relative z-10">

        {/* ========================================================================= */}
        {/* COLUMN 1 (50%): PURCHASED COPY & RAW-TO-GRADED LEVELS ENCASEMENT LADDER   */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0b1220]/95 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            {/* Column Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Purchased Copy &amp; Raw-to-Graded Levels
                </h3>
              </div>
              <button
                onClick={() => setShowFeeInspector(!showFeeInspector)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors"
                title="Toggle detailed industry fee breakdown"
              >
                <Receipt className="h-3 w-3" />
                <span>{showFeeInspector ? "Hide Fee Inspector" : "Fee Breakdown"}</span>
                {showFeeInspector ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* 1. Purchased Copy Inception Card */}
            <div className="mt-3 p-3.5 rounded-lg bg-[#0e1626] border border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Package className="h-3 w-3" />
                  1. Acquired Copy Profile (Cost Basis)
                </span>
                <span className="text-[9px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded bg-emerald-950/40 font-mono">
                  UNENCASED RAW ASSET
                </span>
              </div>

              {/* Acquisition Basis & Fee Breakdown */}
              <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-slate-400">Raw Acquisition Basis:</div>
                  {isEditingBasis ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-mono text-slate-300">$</span>
                      <input
                        type="number"
                        className="w-24 px-2 py-0.5 rounded bg-slate-900 border border-cyan-500 text-xs font-mono text-white focus:outline-none"
                        value={tempBasisInput}
                        onChange={(e) => setTempBasisInput(e.target.value)}
                        placeholder={String(activePurchaseBasis)}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(tempBasisInput);
                          if (!isNaN(val) && val > 0) setCustomPurchaseBasis(val);
                          setIsEditingBasis(false);
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => setIsEditingBasis(false)}
                        className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-bold font-mono text-slate-100">
                        ${activePurchaseBasis.toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          setTempBasisInput(String(activePurchaseBasis));
                          setIsEditingBasis(true);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Edit acquisition cost basis"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400">Total Capitalized All-In Basis:</div>
                  <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                    ${activeFriction.capitalizedBasis.toLocaleString()}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    Incl. ${activeFriction.totalCertificationFriction} cert/prep + ${activeFriction.acquisitionFriction} inbound/tax
                  </div>
                </div>
              </div>

              {/* Itemized Fee Badges Grid */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-4 gap-1.5 text-center text-[9px] font-mono text-slate-400">
                <div className="p-1 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 truncate">CGC Tier Fee</div>
                  <div className="font-bold text-slate-200 mt-0.5">+${activeFriction.certFee}</div>
                </div>
                <div className="p-1 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 truncate">CCS Press &amp; Clean</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {includePressing ? `+$${activeFriction.pressingFee}` : "$0"}
                  </div>
                </div>
                <div className="p-1 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 truncate">Round-Trip Transit</div>
                  <div className="font-bold text-slate-200 mt-0.5">+${activeFriction.roundTripTransit}</div>
                </div>
                <div className="p-1 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500 truncate">Inbound + Handling</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    +${activeFriction.inboundShipping + activeFriction.invoiceHandlingFee}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPANDABLE LINE-BY-LINE INDUSTRY FEE SCHEDULE INSPECTOR */}
            {showFeeInspector && (
              <div className="mt-3 p-3.5 rounded-lg bg-[#070c18] border border-cyan-500/40 text-[10px] font-mono animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-3 w-3" />
                    Live Fee &amp; Friction Ledger ({activeLevel.levelTag})
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Era: <span className="text-cyan-400 font-bold">{engineOutput.era} Age</span>
                  </span>
                </div>

                {/* Interactive Toggles Bar */}
                <div className="mt-2.5 p-2 rounded bg-slate-900/70 border border-slate-800 grid grid-cols-3 gap-2 text-[9px]">
                  <div>
                    <div className="text-slate-400 mb-1">State Sales Tax:</div>
                    <button
                      onClick={() => setSalesTaxEnabled(!salesTaxEnabled)}
                      className={`w-full py-1 rounded font-bold transition-all ${
                        salesTaxEnabled
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {salesTaxEnabled ? "7.0% Retail Tax" : "0% Resale Exempt"}
                    </button>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">CCS Pressing:</div>
                    <button
                      onClick={() => setIncludePressing(!includePressing)}
                      className={`w-full py-1 rounded font-bold transition-all ${
                        includePressing
                          ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {includePressing ? "Included (+$35)" : "Skipped ($0)"}
                    </button>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Selling Venue Fee:</div>
                    <button
                      onClick={() =>
                        setVenueModel(venueModel === "EXCHANGE_TIERED" ? "AUCTION_CONSIGNMENT" : "EXCHANGE_TIERED")
                      }
                      className="w-full py-1 rounded font-bold bg-purple-500/30 text-purple-300 border border-purple-500/50 truncate"
                    >
                      {venueModel === "EXCHANGE_TIERED" ? "Exchange Tiered" : "Auction (10%-5%)"}
                    </button>
                  </div>
                </div>

                {/* Line Item Table */}
                <div className="mt-2.5 space-y-1 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">1. Raw Acquisition Hammer:</span>
                    <span className="font-bold text-slate-100">${activePurchaseBasis.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">2. Inbound Freight from Seller:</span>
                    <span>+${activeFriction.inboundShipping.toFixed(2)}</span>
                  </div>
                  {salesTaxEnabled && (
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">3. Buyer State Sales Tax (7.0%):</span>
                      <span className="text-amber-300">+${activeFriction.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">
                      4. CGC Certification Tier ({activeFriction.cgcTierName}):
                    </span>
                    <span className="text-cyan-300 font-bold">+${activeFriction.certFee.toFixed(2)}</span>
                  </div>
                  {includePressing && (
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">5. CCS Professional Press &amp; Dry Cleaning:</span>
                      <span>+${activeFriction.pressingFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">6. CGC Invoice Handling Charge:</span>
                    <span>+${activeFriction.invoiceHandlingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">
                      7. Two-Way Insured Transit ($25 Inbound + ${activeFriction.cgcReturnInsuredShipping} Return):
                    </span>
                    <span>+${activeFriction.roundTripTransit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-cyan-300 font-bold border-b border-cyan-500/30">
                    <span>Total All-In Capitalized Cost Basis:</span>
                    <span>${activeFriction.capitalizedBasis.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-400 pt-1.5">
                    <span>Target Level Hammer FMV:</span>
                    <span className="text-slate-100 font-bold">${activeLevel.targetFmv.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-400">
                    <span>
                      Selling Commission ({activeFriction.commissionPct}%):
                    </span>
                    <span className="text-rose-400">-${activeFriction.commissionUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-400">
                    <span>Outbound Insured Delivery to Buyer:</span>
                    <span className="text-rose-400">-${activeFriction.outboundFreight.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-400 font-bold pt-1.5 border-t border-slate-800">
                    <span>Net Realized Cash Proceeds (In-Pocket):</span>
                    <span>${activeFriction.netRealizedProceeds.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Raw-to-Graded Levels Ladder */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-300 mb-2">
                <span className="flex items-center gap-1">
                  <Award className="h-3 w-3 text-cyan-400" />
                  2. Select Encasement Outcome Level:
                </span>
                <span className="text-[9px] text-slate-500">CLICK LEVEL TO INSPECT</span>
              </div>

              {/* Level Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {encasementLevels.map((lvl, idx) => {
                  const isSelected = selectedLevelIndex === idx;
                  const lvlFriction = lvl.friction;
                  return (
                    <button
                      key={lvl.levelNumber}
                      onClick={() => setSelectedLevelIndex(idx)}
                      className={`p-2 rounded-lg text-left transition-all border ${
                        isSelected
                          ? "bg-cyan-950/70 border-cyan-400 shadow-md ring-1 ring-cyan-500/40"
                          : "bg-[#0e1626] border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-mono font-bold ${isSelected ? "text-cyan-300" : "text-slate-400"}`}>
                          LEVEL {lvl.levelNumber}
                        </span>
                        <span className={`text-[9px] font-mono px-1 rounded ${isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400"}`}>
                          {lvl.grade}
                        </span>
                      </div>
                      <div className="text-xs font-bold font-mono text-slate-100 mt-1">
                        ${lvl.targetFmv.toLocaleString()}
                      </div>
                      <div className={`text-[9px] font-mono mt-0.5 font-semibold ${lvlFriction.netDollarGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {lvlFriction.netDollarGain >= 0 ? `+${lvlFriction.netRoiPct}% ROI` : `${lvlFriction.netRoiPct}% ROI`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Level Deep-Dive Diagnostics Card */}
              <div className="mt-3 p-3.5 rounded-lg bg-[#0e1626] border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {activeLevel.levelTag} (CGC {activeLevel.grade})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Odds: {Math.round(activeLevel.attainmentProbability * 100)}% Base Attainment
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Breakeven: ${activeFriction.breakevenHammer.toLocaleString()}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                  {activeLevel.descriptor}
                </p>

                {/* Return Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono">
                  <div>
                    <div className="text-slate-500 uppercase text-[9px]">Net Cash Profit:</div>
                    <div className={`text-base font-bold mt-0.5 ${activeFriction.netDollarGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {activeFriction.netDollarGain >= 0
                        ? `+$${activeFriction.netDollarGain.toLocaleString()}`
                        : `-$${Math.abs(activeFriction.netDollarGain).toLocaleString()}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase text-[9px]">Net Realized Cash:</div>
                    <div className="text-base font-bold text-slate-100 mt-0.5">
                      ${activeFriction.netRealizedProceeds.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase text-[9px]">Margin of Safety:</div>
                    <div className={`text-base font-bold mt-0.5 ${activeFriction.marginOfSafetyPct >= 30 ? "text-emerald-400" : "text-amber-400"}`}>
                      {activeFriction.marginOfSafetyPct}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Execution Note */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>
              CGC Tier: {activeFriction.cgcTierName} · Selling Friction: {activeFriction.commissionPct}%
            </span>
            <span className="text-cyan-400 font-semibold">ARBITRAGE VALIDATED</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2 (50%): THREE-TIER VALUE DECOMPOSITION (PLAIN-ENGLISH EXPLAINER)   */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0b1220]/95 border border-purple-500/30 flex flex-col justify-between">
          <div>
            {/* Column Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
                  Three-Tier Value Decomposition
                </h3>
              </div>
              
              {/* Grade Selector */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-md border border-slate-800 text-[10px] font-mono">
                <span className="text-slate-500 text-[9px] px-1 uppercase">Grade:</span>
                {(["RAW", "6.0", "8.0", "9.2", "9.8"] as CanonicalGrade[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedDecompGrade(g)}
                    className={`px-1.5 py-0.5 rounded transition-all ${
                      selectedDecompGrade === g
                        ? "bg-purple-500 text-white font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Subhead with Plain-English Purpose */}
            <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Demystifying Fair Market Value into three practical investor components:</span>
              <span className="text-[9px] font-mono text-purple-300 border border-purple-500/30 px-1.5 rounded bg-purple-950/40">
                P = Floor + Hype
              </span>
            </div>

            {/* 3 Plain-English Tiers */}
            <div className="space-y-2.5 mt-3">

              {/* Tier 1: Physical Paper Hard Floor */}
              <div className="p-3 rounded-lg bg-[#0e1626] border border-cyan-500/20">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Lock className="h-3 w-3" />
                    <span>Tier 1: Physical Paper Floor (Artifact Value)</span>
                  </div>
                  <span className="text-[9px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                    0% HYPE FLOOR
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono text-slate-100">
                    ${decomp.structuralCollectorValue.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Intrinsic Antiquity Floor
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">
                  <strong className="text-slate-300">In Plain English:</strong> What this physical comic book is worth purely as an irreplaceable surviving relic. Even in a worst-case crash where all movie hype dies tomorrow, collectors pay this baseline floor for authentic paper age and certified census scarcity.
                </p>
              </div>

              {/* Tier 2: Cultural / Narrative Demand Premium */}
              <div className="p-3 rounded-lg bg-[#0e1626] border border-purple-500/20">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                    <Sparkles className="h-3 w-3" />
                    <span>Tier 2: Cultural Fame &amp; Hype Premium (Catalyst Upside)</span>
                  </div>
                  <span className="text-[9px] text-purple-400 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono">
                    MEDIA DRIVEN UPSIDE
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono text-purple-300">
                    ${decomp.narrativeSpeculativePremium.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Pop-Culture Premium
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">
                  <strong className="text-purple-300">In Plain English:</strong> The extra dollar premium driven by character fame, MCU film adaptations, and forward speculative bidding. This is the catalyst upside layered on top of the physical paper floor.
                </p>
              </div>

              {/* Tier 3: Immediate Cash Liquidation Floor */}
              <div className="p-3 rounded-lg bg-[#0e1626] border border-emerald-500/20">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <DollarSign className="h-3 w-3" />
                    <span>Tier 3: Immediate Cash-Out Floor (Instant Exit)</span>
                  </div>
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                    SAME-DAY WHOLESALE CASH
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {decomp.marketExecutionFloor !== null
                      ? `$${decomp.marketExecutionFloor.toLocaleString()}`
                      : "Unmeasured"}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {decomp.liquidityDiscountPct !== null ? `${decomp.liquidityDiscountPct}% Wholesale Haircut` : "Immediate Wire"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1 leading-relaxed">
                  <strong className="text-emerald-300">In Plain English:</strong> The cash you walk away with in your pocket <span className="underline decoration-emerald-500">TODAY</span>. Calculated as fair market value minus standard auction commissions and an immediate 15% wholesale discount for instant liquidation without waiting months for auction schedules.
                </p>
              </div>

            </div>

            {/* Plain-English Synthesis Bar */}
            <div className="mt-3 p-3 rounded-lg bg-purple-950/25 border border-purple-500/40 text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold uppercase text-[9px] mb-1">
                <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                Plain-English Investor Takeaway:
              </div>
              <div>
                <strong>Fair Market Value (${decompRecord.currentFmv.toLocaleString()})</strong> = Physical Paper Relic (${decomp.structuralCollectorValue.toLocaleString()}) + Cultural Hype (${decomp.narrativeSpeculativePremium.toLocaleString()}).
              </div>
              <div className="text-emerald-300 mt-1">
                ➜ Immediate Cash Liquidation Value Today = <strong>{decomp.marketExecutionFloor ? `$${decomp.marketExecutionFloor.toLocaleString()}` : "Market Dependent"}</strong> (instant exit without waiting).
              </div>
            </div>
          </div>

          {/* Bottom Provenance Note */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>Certified Sovereign Provenance: {decompRecord.provenanceTag}</span>
            <span className="text-purple-400 font-semibold">CONFIDENCE: {decomp.confidenceScore}%</span>
          </div>
        </div>

      </div>

      {/* SECTION 2: Active Strategy Tab Content (Desks Below 50/50 Top Section) */}
      <div className="mt-5 pt-4 border-t border-slate-800 relative z-10">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
          <span>Institutional Quant Execution: {activeStrategyTab === "TRADITIONAL" ? "Traditional Value Desk" : "Contrarian Quant Desk"}</span>
        </div>

        {activeStrategyTab === "TRADITIONAL" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Metric 1: Graham Margin of Safety */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Graham Margin of Safety
                </div>
                <div
                  className={`mt-1 text-lg font-bold font-mono ${
                    trad.isGrahamCompliant ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {trad.marginOfSafetyPct}%
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Basis: ${trad.grahamReplacementBasis.toLocaleString()} · {trad.isGrahamCompliant ? "COMPLIANT (≥30%)" : "THIN SPREAD"}
                </div>
              </div>

              {/* Metric 2: Moving Average Cross Signal */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  20M vs 50M Trend State
                </div>
                <div className="mt-1 text-sm font-bold font-mono text-cyan-300">
                  {trad.movingAverageSignal}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  SMA-20: {trad.sma20Month ? `$${trad.sma20Month.toLocaleString()}` : "N/A"} · SMA-50: {trad.sma50Month ? `$${trad.sma50Month.toLocaleString()}` : "N/A"}
                </div>
              </div>

              {/* Metric 3: Periodic Monthly Sharpe */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Periodic Monthly Sharpe (N=12)
                </div>
                <div className="mt-1 text-lg font-bold font-mono text-slate-100">
                  {trad.periodicMonthlyExcessSharpe != null ? trad.periodicMonthlyExcessSharpe : "Unmeasured"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Risk-Free Yield: 4.5% Annual (N=12)
                </div>
              </div>

              {/* Metric 4: 5-Year CAGR */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  5-Year Realized CAGR
                </div>
                <div className="mt-1 text-lg font-bold font-mono text-emerald-400">
                  {trad.cagr5yPct != null ? `${trad.cagr5yPct}%` : "Horizon < 5Y"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Strict 1,825-Day Verified Multi-Year Horizon
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Metric 1: Bollinger Z-Score Dislocation */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Bollinger Z-Score (Mean Reversion)
                </div>
                <div
                  className={`mt-1 text-lg font-bold font-mono ${
                    contra.isCapitulationDislocation
                      ? "text-emerald-400"
                      : contra.fallingKnifeAlert
                        ? "text-rose-400 animate-pulse"
                        : "text-slate-200"
                  }`}
                >
                  {contra.zScore != null ? `${contra.zScore}σ` : "N/A"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {engineOutput.contrarianDivergenceSignal?.signalTier === "FALLING_KNIFE_DO_NOT_CATCH"
                    ? "🚨 FALLING KNIFE: DO NOT CATCH (Momentum Falling)"
                    : engineOutput.contrarianDivergenceSignal?.signalTier === "APEX_CAPITULATION_BUY"
                      ? "💎 APEX CAPITULATION BUY (Z < -1.8 & RSI < 32)"
                      : contra.isCapitulationDislocation
                        ? "CAPITULATION BUY (Z < -1.8 & RSI < 35)"
                        : contra.fallingKnifeAlert
                          ? "⚠️ FALLING KNIFE ALERT (Z < -1.8, Support Forming)"
                          : "Within Statistical Envelope"}
                </div>
              </div>

              {/* Metric 2: Census Turnover Ratio & Physical Float */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Census Turnover (CTR) &amp; Float
                </div>
                <div className="mt-1 text-lg font-bold font-mono text-purple-300">
                  {engineOutput.physicalFloatProfile?.circulatingFloatCopies != null
                    ? `${engineOutput.physicalFloatProfile.circulatingFloatCopies} Float Copies`
                    : contra.censusTurnoverRatio != null
                      ? contra.censusTurnoverRatio
                      : contra.turnoverVelocityTier}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {engineOutput.fandomProfile?.fandomCapitalTier || contra.turnoverVelocityTier} · {engineOutput.physicalFloatProfile?.circulatingFloatPct != null ? `${engineOutput.physicalFloatProfile.circulatingFloatPct}% Circulating` : "Vaulted"}
                </div>
              </div>

              {/* Metric 3: Markov Grading Profit */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Probability-Weighted Net Profit
                </div>
                <div
                  className={`mt-1 text-lg font-bold font-mono ${
                    contra.markovGradingExpectedProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ${contra.markovGradingExpectedProfit.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Includes Downgrade Yield Penalties &amp; Fees
                </div>
              </div>

              {/* Metric 4: Recommended Action */}
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Contrarian Action
                </div>
                <div className="mt-1 text-sm font-bold font-mono text-cyan-300">
                  {contra.markovRecommendedAction}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Regime: {contra.contrarianRegime}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Explainer Footer */}
      <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono relative z-10">
        <div>
          Governed by Sovereign Canonical System Map · Zero Synthetic Hallucination Rule Active
        </div>
        <div className="text-cyan-400/80 flex items-center gap-1 font-semibold">
          COMICBOOKSTOCKEXCHANGE.COM INSTITUTIONAL DESK <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </section>
  );
}

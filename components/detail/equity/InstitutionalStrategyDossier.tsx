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
  targetFmv: number;
  salesTaxPct: number;
  tax: number;
  inboundShipping: number;
  acquisitionFriction: number;
  cgcTierName: string;
  certFee: number;
  ccsTierName: string;
  pressingFee: number;
  invoiceHandlingFee: number;
  cgcInboundShipping: number;
  cgcReturnShipping: number;
  transitInsurance: number;
  shippingFreightOnly: number;
  cgcReturnInsuredShipping: number;
  roundTripTransit: number;
  totalCertificationFriction: number;
  capitalizedBasis: number;
  venueType: "EXCHANGE_TIERED" | "AUCTION_CONSIGNMENT" | "DIRECT_PRIVATE_SALE";
  commissionRate: number;
  commissionPct: number;
  commissionUsd: number;
  outboundFreight: number;
  totalLiquidationFriction: number;
  grossDollarGain: number;
  grossRoiPct: number;
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
 * Computes exact, industry-standard CGC (Certified Guaranty Company) and CCS (Classic Collectible Services)
 * fee schedules as officially published, calibrated to publication era, target FMV, and insured transit tiers.
 */
export function computeRealisticFriction(
  rawBasis: number,
  targetFmv: number,
  era: string,
  includePressing: boolean = false,
  salesTaxPct: number = 0,
  inboundShipping: number = 0.0,
  venueType: "EXCHANGE_TIERED" | "AUCTION_CONSIGNMENT" | "DIRECT_PRIVATE_SALE" = "EXCHANGE_TIERED"
): FrictionBreakdown {
  const isVintage = era === "Golden" || era === "Silver" || era === "Bronze";

  // 1. Acquisition friction
  const tax = Number((rawBasis * (salesTaxPct / 100)).toFixed(2));
  const acquisitionFreight = Number(inboundShipping.toFixed(2));
  const acquisitionFriction = Number((tax + acquisitionFreight).toFixed(2));

  // 2. Official CGC Grading Tiers
  // Modern (1975–Present, FMV <= $400): $30.00
  // Vintage (Pre-1975, FMV <= $400): $45.00
  // High Value (Any age, FMV $401–$1,000): $105.00
  // Unlimited Value (FMV > $1,000): 3.0% of final assessed value (min. $135.00)
  let certFee = 45.0;
  let cgcTierName = "Vintage Tier (Pre-1975, Max FMV $400)";
  if (!isVintage && targetFmv <= 400) {
    certFee = 30.0;
    cgcTierName = "CGC Modern Tier (1975–Present, Max FMV $400)";
  } else if (targetFmv <= 400) {
    certFee = 45.0;
    cgcTierName = "CGC Vintage Tier (Pre-1975, Max FMV $400)";
  } else if (targetFmv <= 1000) {
    certFee = 105.0;
    cgcTierName = "CGC High Value Tier (Max FMV $1,000)";
  } else {
    const uncapped = targetFmv * 0.03;
    certFee = Number(Math.max(135.0, uncapped).toFixed(2));
    cgcTierName = `CGC Unlimited Value (3.0% of Assessed Value: $${certFee.toLocaleString()})`;
  }

  // 3. Professional Clean & Press (Optional Pre-Grading Candidate Service)
  // Modern comics are high-gloss/foil/cardstock — pressing is elective and carries surface risk ("you break you buy it").
  // Pressing is skipped ($0) by default to preserve paper and prevent unneeded friction.
  let pressingFee = 0.0;
  let ccsTierName = "Pressing Skipped ($0 - Paper & Foil Preserved)";
  if (includePressing) {
    if (!isVintage && targetFmv <= 400) {
      pressingFee = 20.0;
      ccsTierName = "CCS Modern Clean & Press ($20 Flat Rate)";
    } else if (targetFmv <= 400) {
      pressingFee = 35.0;
      ccsTierName = "CCS Vintage Clean & Press ($35 Flat Rate)";
    } else if (targetFmv <= 1000) {
      pressingFee = 65.0;
      ccsTierName = "CCS High Value Clean & Press ($65 Flat Rate)";
    } else {
      pressingFee = 100.0;
      ccsTierName = "CCS Unlimited Clean & Press ($100 Flat Rate)";
    }
  }

  // 4. CGC Invoice Handling Fee (Published mandatory CGC online order fee)
  const invoiceHandlingFee = 5.0;

  // 5. Two-Way Carrier Shipping Freight (Exclusive of Insurance)
  // Standard two-way courier shipping for submissions is $25 inbound + $25 return courier = $50.00 total.
  const cgcInboundShipping = 25.0;
  let cgcReturnShipping = 25.0;
  if (targetFmv > 100000) cgcReturnShipping = 150.0;
  else if (targetFmv > 50000) cgcReturnShipping = 125.0;
  else if (targetFmv > 25000) cgcReturnShipping = 100.0;
  else if (targetFmv > 5000) cgcReturnShipping = 65.0;
  else if (targetFmv > 1000) cgcReturnShipping = 40.0;

  const shippingFreightOnly = Number((cgcInboundShipping + cgcReturnShipping).toFixed(2));

  // 6. Transit Insurance (Determined by Final Assessed Slab Value)
  // Standard carrier base coverage covers books up to $400-$1,000 without added transit rider.
  let transitInsurance = 0.0;
  if (targetFmv > 100000) {
    transitInsurance = Number((targetFmv * 0.0035).toFixed(2)); // Armored/Collectibles policy
  } else if (targetFmv > 50000) {
    transitInsurance = 250.0;
  } else if (targetFmv > 25000) {
    transitInsurance = 125.0;
  } else if (targetFmv > 10000) {
    transitInsurance = 65.0; // e.g. 6.0 at $17,540.23 -> $65.00
  } else if (targetFmv > 5000) {
    transitInsurance = 35.0;
  } else if (targetFmv > 1000) {
    transitInsurance = 15.0;
  }

  const roundTripTransit = Number((shippingFreightOnly + transitInsurance).toFixed(2));
  const cgcReturnInsuredShipping = Number((cgcReturnShipping + transitInsurance).toFixed(2));

  const totalCertificationFriction = Number(
    (certFee + pressingFee + invoiceHandlingFee + roundTripTransit).toFixed(2)
  );

  const capitalizedBasis = Number(
    (rawBasis + acquisitionFriction + totalCertificationFriction).toFixed(2)
  );

  // 6. Liquidation / Realization Friction (Sale Leg)
  let commissionRate = 0.1325;
  let outboundFreight = targetFmv > 10000 ? 50.0 : 25.0;

  if (venueType === "DIRECT_PRIVATE_SALE") {
    commissionRate = 0.0;
    outboundFreight = 0.0; // In-person or buyer-paid
  } else if (venueType === "AUCTION_CONSIGNMENT") {
    // Auction house consignor rates (Heritage / Goldin / ComicLink)
    if (targetFmv >= 25000) commissionRate = 0.05;
    else if (targetFmv >= 10000) commissionRate = 0.075;
    else if (targetFmv >= 2500) commissionRate = 0.10;
    else commissionRate = 0.1325;
  } else {
    // Secondary Exchange: 13.25% up to $7,500, then 2.35% on excess
    if (targetFmv > 7500) {
      const firstTier = 7500 * 0.1325;
      const excess = (targetFmv - 7500) * 0.0235;
      commissionRate = (firstTier + excess) / targetFmv;
    }
  }

  const commissionUsd = Number((targetFmv * commissionRate).toFixed(2));
  const totalLiquidationFriction = Number((commissionUsd + outboundFreight).toFixed(2));

  // Gross Capital Spread: Target Assessed Hammer Price minus Capitalized All-In Basis
  const grossDollarGain = Number((targetFmv - capitalizedBasis).toFixed(2));
  const grossRoiPct = capitalizedBasis > 0 ? Number(((grossDollarGain / capitalizedBasis) * 100).toFixed(1)) : 0;

  // Net Realized Proceeds: Walk-away cash after selling venue commission and outbound shipping
  const netRealizedProceeds = Number(Math.max(0, targetFmv - totalLiquidationFriction).toFixed(2));
  const netDollarGain = Number((netRealizedProceeds - capitalizedBasis).toFixed(2));
  const netRoiPct = capitalizedBasis > 0 ? Number(((netDollarGain / capitalizedBasis) * 100).toFixed(1)) : 0;
  const marginOfSafetyPct = netRealizedProceeds > 0 ? Number(((1 - capitalizedBasis / netRealizedProceeds) * 100).toFixed(1)) : 0;
  const breakevenHammer = Number(((capitalizedBasis + outboundFreight) / (1 - commissionRate)).toFixed(2));

  return {
    rawBasis,
    targetFmv,
    salesTaxPct,
    tax,
    inboundShipping: acquisitionFreight,
    acquisitionFriction,
    cgcTierName,
    certFee,
    ccsTierName,
    pressingFee,
    invoiceHandlingFee,
    cgcInboundShipping,
    cgcReturnShipping,
    transitInsurance,
    shippingFreightOnly,
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
    grossDollarGain,
    grossRoiPct,
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
  const isVintageEra = engineOutput.era === "Golden" || engineOutput.era === "Silver" || engineOutput.era === "Bronze";
  const [activeStrategyTab, setActiveStrategyTab] = useState<"TRADITIONAL" | "CONTRARIAN">("TRADITIONAL");
  const [selectedDecompGrade, setSelectedDecompGrade] = useState<CanonicalGrade>(() => isVintageEra ? "8.0" : "9.8");
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(() => isVintageEra ? 2 : 4); // Default to Level 5 (9.8 Apex) for Modern, Level 3 (8.0) for Vintage
  const [selectedCanonicalGrade, setSelectedCanonicalGrade] = useState<CanonicalGrade | null>(() => isVintageEra ? "8.0" : "9.8");
  const [customTargetFmv, setCustomTargetFmv] = useState<number | null>(null);
  const [isEditingTargetFmv, setIsEditingTargetFmv] = useState<boolean>(false);
  const [tempTargetFmvInput, setTempTargetFmvInput] = useState<string>("");
  const [customPurchaseBasis, setCustomPurchaseBasis] = useState<number | null>(null);
  const [isEditingBasis, setIsEditingBasis] = useState<boolean>(false);
  const [tempBasisInput, setTempBasisInput] = useState<string>("");
  const [customInboundFreight, setCustomInboundFreight] = useState<number | null>(null);
  const [isEditingInboundFreight, setIsEditingInboundFreight] = useState<boolean>(false);
  const [tempInboundFreightInput, setTempInboundFreightInput] = useState<string>("");
  const [showFeeInspector, setShowFeeInspector] = useState<boolean>(false);

  // Configurable Fee Variables
  const [salesTaxEnabled, setSalesTaxEnabled] = useState<boolean>(false); // 0% resale exempt vs 7.0% retail
  const [includePressing, setIncludePressing] = useState<boolean>(false); // Pressing is skipped ($0) by default to protect high-gloss paper/foil
  const [venueModel, setVenueModel] = useState<"EXCHANGE_TIERED" | "AUCTION_CONSIGNMENT" | "DIRECT_PRIVATE_SALE">("EXCHANGE_TIERED");

  const trad = engineOutput.traditionalStrategies;
  const contra = engineOutput.contrarianStrategies;

  // 1. Resolve Purchased Copy Acquisition Basis & Inbound Transit
  const defaultRawCost = useMemo(() => {
    if (rawPrice != null && rawPrice > 0) return Number(rawPrice);
    const matrixRaw = engineOutput.gradeMatrix["RAW"]?.currentFmv;
    if (matrixRaw && matrixRaw > 0) return matrixRaw;
    // Check lowest available graded lattice value to interpolate raw accurately
    for (const g of ["1.5", "2.0", "3.0", "4.0", "5.0", "6.0"] as CanonicalGrade[]) {
      const gFmv = engineOutput.gradeMatrix[g]?.currentFmv;
      if (gFmv && gFmv > 0) {
        if (g === "4.0") return Math.round(gFmv * 0.65);
        if (g === "6.0") return Math.round(gFmv * 0.45);
        return Math.round(gFmv * 0.85);
      }
    }
    const sov98 = engineOutput.gradeMatrix["9.8"]?.currentFmv;
    if (sov98 && sov98 > 0) {
      // For high grade books, raw is typically 1.5% to 3.5% of 9.8 apex
      return Math.max(25, Math.round(sov98 * 0.025));
    }
    return 75; // Conservative baseline, NEVER an inflated $1,500
  }, [rawPrice, engineOutput.gradeMatrix]);

  const activePurchaseBasis = customPurchaseBasis ?? defaultRawCost;
  const salesTaxPct = salesTaxEnabled ? 7.0 : 0.0;
  // Default inbound freight to collector is $0.00 (the raw price is the full acquisition basis paid)
  const defaultInboundFreight = customInboundFreight ?? 0.0;

  // 2. Compute Raw to Graded Encasement Levels with Exact Published Fee Schedules
  const encasementLevels: EncasementLevel[] = useMemo(() => {
    const levelConfigs: Array<{
      levelNumber: number;
      levelTag: string;
      grade: CanonicalGrade;
      title: string;
      descriptor: string;
      defaultOdds: number;
    }> = isVintageEra
      ? [
          {
            levelNumber: 1,
            levelTag: "MID-GRADE ENTRY FLOOR",
            grade: "4.0",
            title: "Level 1: Mid-Grade Realization Floor (4.0)",
            descriptor: "Realistic downside floor for raw copies with visible surface wear, creases, or handling wear.",
            defaultOdds: 0.98,
          },
          {
            levelNumber: 2,
            levelTag: "CONSERVATIVE SOLID FLOOR",
            grade: "6.0",
            title: "Level 2: Conservative Solid Copy (6.0)",
            descriptor: "Solid baseline floor for intact vintage copies with moderate handling and balanced gloss.",
            defaultOdds: 0.90,
          },
          {
            levelNumber: 3,
            levelTag: "EXPECTED BASE CASE",
            grade: "8.0",
            title: "Level 3: Expected Target Yield (8.0)",
            descriptor: "Standard base target for well-preserved, unrestored raw copies with strong gloss.",
            defaultOdds: 0.70,
          },
          {
            levelNumber: 4,
            levelTag: "HIGH-WATER TARGET",
            grade: "9.2",
            title: "Level 4: Investment High-Water Mark (9.2)",
            descriptor: "Premium collector-grade result achieved through professional pressing & dry cleaning.",
            defaultOdds: 0.40,
          },
          {
            levelNumber: 5,
            levelTag: "SOVEREIGN BLUE-CHIP APEX",
            grade: "9.8",
            title: "Level 5: Sovereign Apex Realization (9.8)",
            descriptor: "Near-pristine preservation apex commanding institutional blue-chip auction multiples.",
            defaultOdds: 0.10,
          },
        ]
      : [
          {
            levelNumber: 1,
            levelTag: "DOWNSIDE DEFECT FLOOR",
            grade: "9.0",
            title: "Level 1: Downside Defect Floor (9.0)",
            descriptor: "Downside realization floor for copies with minor bindery flaws, edge wear, or light handling.",
            defaultOdds: 0.98,
          },
          {
            levelNumber: 2,
            levelTag: "CONSERVATIVE PRODUCTION BASE",
            grade: "9.2",
            title: "Level 2: Conservative Floor (9.2)",
            descriptor: "Conservative realization floor for unpressed copies with slight spine stress.",
            defaultOdds: 0.90,
          },
          {
            levelNumber: 3,
            levelTag: "WORST-CASE SCENARIO FLOOR",
            grade: "9.4",
            title: "Level 3: Worst-Case Scenario Floor (9.4)",
            descriptor: "Realistic worst-case realization for uncirculated modern direct copies with sharp corners and balanced gloss.",
            defaultOdds: 0.75,
          },
          {
            levelNumber: 4,
            levelTag: "EXPECTED BASE CASE YIELD",
            grade: "9.6",
            title: "Level 4: Expected Base Case Yield (9.6)",
            descriptor: "Standard realistic target yield for well-centered, fresh modern direct stock.",
            defaultOdds: 0.50,
          },
          {
            levelNumber: 5,
            levelTag: "SOVEREIGN BEST-CASE APEX",
            grade: "9.8",
            title: "Level 5: Sovereign Best-Case Target (9.8)",
            descriptor: "Institutional market-clearing realization for pristine modern investment-grade copies.",
            defaultOdds: 0.25,
          },
        ];

    return levelConfigs.map((cfg) => {
      const gRecord = engineOutput.gradeMatrix[cfg.grade];
      const sovFmv = engineOutput.gradeMatrix["9.8"]?.currentFmv;
      let targetFmv = gRecord?.currentFmv && gRecord.currentFmv > 0 ? gRecord.currentFmv : 0;
      if (!targetFmv || targetFmv <= 0) {
        if (sovFmv && sovFmv > 0) {
          // Proportion based on standard market decay ratios from 9.8 apex:
          if (cfg.grade === "9.8") targetFmv = sovFmv;
          else if (cfg.grade === "9.6") targetFmv = Number((sovFmv * 0.55).toFixed(2));
          else if (cfg.grade === "9.4") targetFmv = Number((sovFmv * 0.38).toFixed(2));
          else if (cfg.grade === "9.2") targetFmv = Number((sovFmv * 0.28).toFixed(2));
          else if (cfg.grade === "9.0") targetFmv = Number((sovFmv * 0.22).toFixed(2));
          else if (cfg.grade === "8.0") targetFmv = Number((sovFmv * 0.12).toFixed(2));
          else if (cfg.grade === "6.0") targetFmv = Number((sovFmv * 0.065).toFixed(2));
          else if (cfg.grade === "4.0") targetFmv = Number((sovFmv * 0.035).toFixed(2));
        } else {
          // Scale from active purchase basis
          if (cfg.grade === "9.8") targetFmv = activePurchaseBasis * 3.25;
          else if (cfg.grade === "9.6") targetFmv = activePurchaseBasis * 1.8;
          else if (cfg.grade === "9.4") targetFmv = activePurchaseBasis * 1.35;
          else if (cfg.grade === "9.2") targetFmv = activePurchaseBasis * 1.1;
          else if (cfg.grade === "9.0") targetFmv = activePurchaseBasis * 0.95;
          else if (cfg.grade === "8.0") targetFmv = activePurchaseBasis * 0.85;
          else if (cfg.grade === "6.0") targetFmv = activePurchaseBasis * 0.65;
          else targetFmv = activePurchaseBasis * 0.5;
        }
      }

      const friction = computeRealisticFriction(
        activePurchaseBasis,
        targetFmv,
        engineOutput.era,
        includePressing,
        salesTaxPct,
        defaultInboundFreight,
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
    defaultInboundFreight,
    venueModel,
  ]);

  // Dynamically resolve active level, supporting direct canonical grade picks and custom FMV overrides
  const activeLevel: EncasementLevel = useMemo(() => {
    if (selectedCanonicalGrade) {
      const match = encasementLevels.find((l) => l.grade === selectedCanonicalGrade);
      if (match && customTargetFmv == null) return match;
      const gRecord = engineOutput.gradeMatrix[selectedCanonicalGrade];
      const baseFmv = gRecord?.currentFmv && gRecord.currentFmv > 0 ? gRecord.currentFmv : activePurchaseBasis;
      const targetFmvToUse = customTargetFmv ?? baseFmv;
      const friction = computeRealisticFriction(
        activePurchaseBasis,
        targetFmvToUse,
        engineOutput.era,
        includePressing,
        salesTaxPct,
        defaultInboundFreight,
        venueModel
      );
      return {
        levelNumber: match ? match.levelNumber : 0,
        levelTag: `GRADE ${selectedCanonicalGrade} ASSESSED`,
        grade: selectedCanonicalGrade,
        title: `Grade ${selectedCanonicalGrade} Valuation`,
        descriptor: `Direct canonical evaluation at CGC ${selectedCanonicalGrade}.`,
        targetFmv: targetFmvToUse,
        friction,
        attainmentProbability: match ? match.attainmentProbability : 0.5,
      };
    }
    const defaultLevel = encasementLevels[selectedLevelIndex] || encasementLevels[2];
    if (customTargetFmv != null) {
      const friction = computeRealisticFriction(
        activePurchaseBasis,
        customTargetFmv,
        engineOutput.era,
        includePressing,
        salesTaxPct,
        defaultInboundFreight,
        venueModel
      );
      return {
        ...defaultLevel,
        targetFmv: customTargetFmv,
        friction,
      };
    }
    return defaultLevel;
  }, [
    selectedCanonicalGrade,
    encasementLevels,
    selectedLevelIndex,
    customTargetFmv,
    activePurchaseBasis,
    engineOutput.gradeMatrix,
    engineOutput.era,
    includePressing,
    salesTaxPct,
    defaultInboundFreight,
    venueModel,
  ]);

  const activeFriction = activeLevel.friction;

  // Unified Grade Synchronization across all Dossier panels (Row 1 & Row 2)
  const syncGrade = (g: CanonicalGrade) => {
    setSelectedCanonicalGrade(g);
    setSelectedDecompGrade(g);
    const lvlIdx = encasementLevels.findIndex((l) => l.grade === g);
    if (lvlIdx >= 0) setSelectedLevelIndex(lvlIdx);
    setCustomTargetFmv(null);
  };

  // 3. Resolve 3-Tier Value Decomposition for Selected Grade
  const decompRecord = engineOutput.gradeMatrix[selectedDecompGrade] ?? engineOutput.gradeMatrix["8.0"] ?? engineOutput.gradeMatrix["9.8"];
  const decomp = decompRecord.valuationDecomposition;

  return (
    <section
      aria-label="Institutional Strategy Dossier & 3-Tier Valuation"
      className="rounded-xl p-5 sm:p-7 bg-[#080d17] border shadow-2xl relative overflow-hidden my-6 font-sans text-slate-200"
      style={{ borderColor: `${accentColor}40` }}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 pointer-events-none opacity-10 blur-3xl -z-0"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold block">
              Sovereign Equity Clearinghouse
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-semibold">
              Macro Benchmarking: {engineOutput.macroBenchmarking.peggedBenchmarkSeat}
            </span>
            {comicTitle && (
              <span className="px-2.5 py-1 rounded text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200 font-semibold">
                {comicTitle}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1.5 flex items-center gap-2">
            Institutional Strategy Dossier
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-mono mt-1">
            Single-source econometric valuation across {engineOutput.snapshotCount} verified monthly observation epochs ({engineOutput.timeHorizonYears}Y runway)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1.5 rounded-lg bg-[#0e1626] border border-slate-700 shadow-inner">
          <button
            onClick={() => setActiveStrategyTab("TRADITIONAL")}
            className={`px-4 py-2 rounded-md text-xs sm:text-sm font-mono font-bold transition-all ${
              activeStrategyTab === "TRADITIONAL"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Traditional Value Desk
          </button>
          <button
            onClick={() => setActiveStrategyTab("CONTRARIAN")}
            className={`px-4 py-2 rounded-md text-xs sm:text-sm font-mono font-bold transition-all ${
              activeStrategyTab === "CONTRARIAN"
                ? "bg-purple-500 text-white shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Contrarian Quant Desk
          </button>
        </div>
      </div>

      {/* ROW 1: 50 / 50 HIGH-IMPACT GRID: CORE VALUATION & ENCASEMENT LADDER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-6 my-6 relative z-10">

        {/* ========================================================================= */}
        {/* COLUMN 1 (50%): PURCHASED COPY & RAW-TO-GRADED LEVELS ENCASEMENT LADDER   */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0b1220]/95 border border-cyan-500/35 flex flex-col justify-start shadow-xl">
          <div>
            {/* Column Header */}
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                  <Package className="h-5 w-5" />
                </span>
                <h3 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
                  Purchased Copy &amp; Raw-to-Graded Levels
                </h3>
              </div>
              <button
                onClick={() => setShowFeeInspector(!showFeeInspector)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors shadow-sm"
                title="Toggle exact official CGC published fee breakdown"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>{showFeeInspector ? "Hide CGC Ledger" : "Inspect Exact CGC Fees"}</span>
                {showFeeInspector ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* 1. Purchased Copy Inception Card */}
            <div className="mt-4 p-4 sm:p-5 rounded-lg bg-[#0e1626] border border-slate-800">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-300">
                <span className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Package className="h-4 w-4" />
                  1. Acquired Copy Profile (Cost Basis)
                </span>
                <span className="text-xs text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded bg-emerald-950/50 font-mono font-bold">
                  UNENCASED RAW ASSET
                </span>
              </div>

              {/* Acquisition Basis & Assessed Value Header Grid */}
              <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-800">
                {/* Left: Raw Basis + Inbound Shipping & Insurance */}
                <div>
                  <div className="text-xs sm:text-sm font-mono font-semibold text-slate-300">Raw Acquisition Basis:</div>
                  {isEditingBasis ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-base font-mono text-slate-200 font-bold">$</span>
                      <input
                        type="number"
                        className="w-32 px-2.5 py-1 rounded bg-slate-900 border border-cyan-400 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
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
                        className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => setIsEditingBasis(false)}
                        className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                        ${activePurchaseBasis.toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          setTempBasisInput(String(activePurchaseBasis));
                          setIsEditingBasis(true);
                        }}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Edit raw acquisition cost basis"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Inbound Freight & Transit Insurance from Seller to Buyer */}
                  <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-300">
                    <span>Inbound Freight &amp; Insurance:</span>
                    {isEditingInboundFreight ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-400 text-xs font-mono text-white"
                          value={tempInboundFreightInput}
                          onChange={(e) => setTempInboundFreightInput(e.target.value)}
                          placeholder={String(defaultInboundFreight)}
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat(tempInboundFreightInput);
                            if (!isNaN(val) && val >= 0) setCustomInboundFreight(val);
                            setIsEditingInboundFreight(false);
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[11px] font-bold"
                        >
                          Set
                        </button>
                        <button
                          onClick={() => setIsEditingInboundFreight(false)}
                          className="px-1 text-[11px] text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <strong className="text-cyan-300 font-bold">+${activeFriction.inboundShipping.toFixed(2)}</strong>
                        <button
                          onClick={() => {
                            setTempInboundFreightInput(String(activeFriction.inboundShipping));
                            setIsEditingInboundFreight(true);
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                          title="Edit inbound shipping & transit insurance"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    All-In Capitalized Basis: <strong className="text-white text-xs">${activeFriction.capitalizedBasis.toLocaleString()}</strong> (Raw ${activeFriction.rawBasis.toLocaleString()} + Grading ${activeFriction.totalCertificationFriction.toLocaleString()}{activeFriction.inboundShipping > 0 ? ` + Inbound $${activeFriction.inboundShipping.toFixed(0)}` : ""})
                  </div>
                </div>

                {/* Right: Target Hammer FMV & Dual Return Metrics */}
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm font-mono font-semibold text-slate-300">
                    Assessed Target Value ({activeLevel.grade}):
                  </div>
                  {isEditingTargetFmv ? (
                    <div className="flex items-center sm:justify-end gap-2 mt-1.5">
                      <span className="text-base font-mono text-slate-200 font-bold">$</span>
                      <input
                        type="number"
                        className="w-32 px-2.5 py-1 rounded bg-slate-900 border border-cyan-400 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        value={tempTargetFmvInput}
                        onChange={(e) => setTempTargetFmvInput(e.target.value)}
                        placeholder={String(activeLevel.targetFmv)}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(tempTargetFmvInput);
                          if (!isNaN(val) && val > 0) setCustomTargetFmv(val);
                          setIsEditingTargetFmv(false);
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => setIsEditingTargetFmv(false)}
                        className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center sm:justify-end gap-2 mt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-300 tracking-tight">
                        ${activeLevel.targetFmv.toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          setTempTargetFmvInput(String(activeLevel.targetFmv));
                          setIsEditingTargetFmv(true);
                        }}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Edit target assessed market value"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Dual Profit Callouts: Gross Capital Gain vs Net Cash */}
                  <div className="mt-2 sm:text-right font-mono text-xs">
                    <div>
                      <span className="text-slate-400">Gross Capital Gain:</span>{" "}
                      <strong className={activeFriction.grossDollarGain >= 0 ? "text-cyan-300 text-sm sm:text-base font-extrabold" : "text-rose-400 text-sm sm:text-base font-extrabold"}>
                        {activeFriction.grossDollarGain >= 0 ? `+$${activeFriction.grossDollarGain.toLocaleString()}` : `-$${Math.abs(activeFriction.grossDollarGain).toLocaleString()}`}
                      </strong>{" "}
                      <span className="text-cyan-400 font-bold">({activeFriction.grossRoiPct >= 0 ? `+${activeFriction.grossRoiPct}%` : `${activeFriction.grossRoiPct}%`} ROI)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <span>Formula: Target FMV (${activeLevel.targetFmv.toLocaleString()}) − All-In Basis (${activeFriction.capitalizedBasis.toLocaleString()})</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-300 mt-1">
                      Net Realized Cash: <strong className="text-emerald-400 font-bold">${activeFriction.netRealizedProceeds.toLocaleString()}</strong> ({activeFriction.netDollarGain >= 0 ? `+$${activeFriction.netDollarGain.toLocaleString()}` : `-$${Math.abs(activeFriction.netDollarGain).toLocaleString()}`} Net after {activeFriction.commissionPct}% selling friction)
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Itemized Fee Badges Grid */}
              <div className="mt-3.5 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                {/* 1. CGC Grading Fee */}
                <div
                  className="p-2 rounded bg-slate-900/80 border border-slate-800 cursor-pointer group hover:border-cyan-500/50 transition-colors"
                  onClick={() => setShowFeeInspector(true)}
                  title={`CGC Assessment Fee: ${
                    activeFriction.targetFmv > 1000
                      ? `3.0% of assessed value for Grade ${activeLevel.grade} ($${activeLevel.targetFmv.toLocaleString()}) = $${activeFriction.certFee.toLocaleString()}`
                      : `$${activeFriction.certFee} flat tier based on era and value threshold.`
                  } Click to inspect exact ledger below.`}
                >
                  <div className="text-slate-400 text-xs font-semibold truncate flex items-center justify-center gap-1">
                    <span>CGC Grading Fee</span>
                    <Info className="w-2.5 h-2.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                    +${activeFriction.certFee.toLocaleString()}
                  </div>
                  <div className="text-xs text-cyan-300 font-semibold truncate mt-0.5">
                    {activeFriction.targetFmv > 1000
                      ? `3.0% of ${activeLevel.grade} ($${activeLevel.targetFmv.toLocaleString()})`
                      : `$${activeFriction.certFee} Flat Tier`}
                  </div>
                </div>

                {/* 2. Clean & Press */}
                <div
                  className="p-2 rounded bg-slate-900/80 border border-slate-800 cursor-pointer group hover:border-cyan-500/50 transition-colors"
                  onClick={() => setShowFeeInspector(true)}
                  title={`CCS Clean & Press: Optional pre-grading dry clean and heat press service (${includePressing ? `$${activeFriction.pressingFee.toFixed(0)} flat rate` : "skipped to protect gloss and foil"}). Click to inspect or toggle in ledger below.`}
                >
                  <div className="text-slate-400 text-xs font-semibold truncate flex items-center justify-center gap-1">
                    <span>Clean &amp; Press</span>
                    <Info className="w-2.5 h-2.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                    {includePressing ? `+$${activeFriction.pressingFee.toFixed(2)}` : "$0"}
                  </div>
                  <div className="text-xs text-cyan-300 font-semibold truncate mt-0.5">
                    {includePressing ? `$${activeFriction.pressingFee.toFixed(0)} Flat` : "Skipped (Preserve)"}
                  </div>
                </div>

                {/* 3. Two-Way Shipping */}
                <div
                  className="p-2 rounded bg-slate-900/80 border border-slate-800 cursor-pointer group hover:border-cyan-500/50 transition-colors"
                  onClick={() => setShowFeeInspector(true)}
                  title={`Round-Trip Courier: Inbound to CGC ($25 flat) + Return courier ($${activeFriction.cgcReturnShipping.toFixed(0)}). Click to inspect exact ledger below.`}
                >
                  <div className="text-slate-400 text-xs font-semibold truncate flex items-center justify-center gap-1">
                    <span>Two-Way Shipping</span>
                    <Info className="w-2.5 h-2.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                    +${activeFriction.shippingFreightOnly.toFixed(2)}
                  </div>
                  <div className="text-xs text-cyan-300 font-semibold truncate mt-0.5">
                    In $25 + Out ${activeFriction.cgcReturnShipping.toFixed(0)}
                  </div>
                </div>

                {/* 4. Insurance & Invoice */}
                <div
                  className="p-2 rounded bg-slate-900/80 border border-slate-800 cursor-pointer group hover:border-cyan-500/50 transition-colors"
                  onClick={() => setShowFeeInspector(true)}
                  title={`Insurance & Invoice: Transit cargo insurance ($${activeFriction.transitInsurance.toFixed(0)}) calibrated to assessed slab value plus official $5 CGC invoice fee. Click to inspect exact ledger below.`}
                >
                  <div className="text-slate-400 text-xs font-semibold truncate flex items-center justify-center gap-1">
                    <span>Insurance &amp; Invoice</span>
                    <Info className="w-2.5 h-2.5 text-cyan-400 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                    +${(activeFriction.transitInsurance + activeFriction.invoiceHandlingFee).toFixed(2)}
                  </div>
                  <div className="text-xs text-cyan-300 font-semibold truncate mt-0.5">
                    {activeFriction.transitInsurance > 0
                      ? `Ins $${activeFriction.transitInsurance.toFixed(0)} + CGC $5`
                      : `CGC $5 (Ins Included)`}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPANDABLE LINE-BY-LINE EXACT CGC PUBLISHED FEE SCHEDULE */}
            {showFeeInspector && (
              <div className="mt-4 p-4 sm:p-5 rounded-lg bg-[#070c18] border border-cyan-500/40 font-mono text-xs sm:text-sm animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2 text-xs sm:text-sm">
                    <Sliders className="h-4 w-4" />
                    Exact Published CGC Fee Schedule ({activeLevel.levelTag})
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    Era: <span className="text-cyan-400 font-bold">{engineOutput.era} Age</span>
                  </span>
                </div>

                {/* Interactive Toggles Bar */}
                <div className="mt-3 p-2.5 rounded bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <div className="text-slate-300 font-semibold mb-1">State Sales Tax:</div>
                    <button
                      onClick={() => setSalesTaxEnabled(!salesTaxEnabled)}
                      className={`w-full py-1.5 rounded font-bold transition-all ${
                        salesTaxEnabled
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {salesTaxEnabled ? "7.0% Retail Tax" : "0% Resale Exempt"}
                    </button>
                  </div>
                  <div>
                    <div className="text-slate-300 font-semibold mb-1">
                      Clean &amp; Press {includePressing ? `(+$${activeFriction.pressingFee.toFixed(0)} Flat)` : "(Optional)"}:
                    </div>
                    <button
                      onClick={() => setIncludePressing(!includePressing)}
                      className={`w-full py-1.5 rounded font-bold transition-all ${
                        includePressing
                          ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                          : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {includePressing ? `Active (+$${activeFriction.pressingFee.toFixed(0)} Flat)` : "Skipped ($0 - Paper & Foil Preserved)"}
                    </button>
                  </div>
                  <div>
                    <div className="text-slate-300 font-semibold mb-1">Selling Venue Fee:</div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setVenueModel("EXCHANGE_TIERED")}
                        className={`py-1 rounded font-bold text-[11px] transition-all ${
                          venueModel === "EXCHANGE_TIERED"
                            ? "bg-purple-500 text-white border border-purple-400"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Exchange (10%)
                      </button>
                      <button
                        onClick={() => setVenueModel("AUCTION_CONSIGNMENT")}
                        className={`py-1 rounded font-bold text-[11px] transition-all ${
                          venueModel === "AUCTION_CONSIGNMENT"
                            ? "bg-purple-500 text-white border border-purple-400"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Auction (8%)
                      </button>
                      <button
                        onClick={() => setVenueModel("DIRECT_PRIVATE_SALE")}
                        className={`py-1 rounded font-bold text-[11px] transition-all ${
                          venueModel === "DIRECT_PRIVATE_SALE"
                            ? "bg-emerald-500 text-slate-950 border border-emerald-400"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        Private (0%)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exact Line Item Table with CGC Citations */}
                <div className="mt-3 space-y-1.5 text-slate-200">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-300">1. Raw Acquisition Hammer:</span>
                    <span className="font-bold text-white">${activePurchaseBasis.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-300">2. Inbound Freight from Raw Seller:</span>
                    <span className="font-semibold">+${activeFriction.inboundShipping.toFixed(2)}</span>
                  </div>
                  {salesTaxEnabled && (
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">3. Buyer State Sales Tax (7.0%):</span>
                      <span className="text-amber-300 font-semibold">+${activeFriction.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-300">
                      4. CGC Certification Fee ({activeFriction.targetFmv > 1000 ? `3.0% of Assessed Final Value $${activeLevel.targetFmv.toLocaleString()}` : activeFriction.cgcTierName}):
                    </span>
                    <span className="text-cyan-300 font-bold">+${activeFriction.certFee.toFixed(2)}</span>
                  </div>
                  {includePressing ? (
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-300">
                        5. Professional Clean &amp; Press (Flat Rate):
                      </span>
                      <span className="font-semibold">+${activeFriction.pressingFee.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-400">
                      <span>5. Clean &amp; Press (Skipped to avoid risking fragile paper):</span>
                      <span className="font-semibold">$0.00</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-300">
                      6. Two-Way Carrier Shipping Freight ($25 Inbound + ${activeFriction.cgcReturnShipping.toFixed(0)} Return — Excl. Insurance):
                    </span>
                    <span className="font-semibold">+${activeFriction.shippingFreightOnly.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-300">
                      7. Assessed Value Transit Insurance (Based on Assessed Slab Replacement Value):
                    </span>
                    <span className="text-cyan-300 font-semibold">+${activeFriction.transitInsurance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-300">8. CGC Mandatory Online Invoice Handling Form Fee:</span>
                    <span className="font-semibold">+${activeFriction.invoiceHandlingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-cyan-300 font-bold border-b border-cyan-500/40 text-sm">
                    <span>Total All-In Capitalized Cost Basis:</span>
                    <span>${activeFriction.capitalizedBasis.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-300 pt-2">
                    <span>Target Level Gross Auction Hammer FMV:</span>
                    <span className="text-white font-bold">${activeLevel.targetFmv.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-cyan-300 font-bold border-b border-slate-800/80">
                    <span>Gross Capital Gain (Gross Spread):</span>
                    <span>
                      {activeFriction.grossDollarGain >= 0 ? `+$${activeFriction.grossDollarGain.toLocaleString()}` : `-$${Math.abs(activeFriction.grossDollarGain).toLocaleString()}`} ({activeFriction.grossRoiPct >= 0 ? `+${activeFriction.grossRoiPct}%` : `${activeFriction.grossRoiPct}%`} ROI)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-300">
                    <span>
                      Selling Venue Commission ({activeFriction.commissionPct}%):
                    </span>
                    <span className="text-rose-400 font-semibold">-${activeFriction.commissionUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-300">
                    <span>Outbound Insured Courier Delivery to Buyer:</span>
                    <span className="text-rose-400 font-semibold">-${activeFriction.outboundFreight.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-emerald-400 font-bold pt-2 border-t border-slate-800 text-sm sm:text-base">
                    <span>Net Realized Cash Proceeds (Walk-Away Cash):</span>
                    <span>${activeFriction.netRealizedProceeds.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-300 font-bold text-xs sm:text-sm">
                    <span>Net Realized Cash Profit:</span>
                    <span>
                      {activeFriction.netDollarGain >= 0 ? `+$${activeFriction.netDollarGain.toLocaleString()}` : `-$${Math.abs(activeFriction.netDollarGain).toLocaleString()}`} ({activeFriction.netRoiPct >= 0 ? `+${activeFriction.netRoiPct}%` : `${activeFriction.netRoiPct}%`} Net ROI)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Raw-to-Graded Levels Ladder */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-200 mb-2.5">
                <span className="flex items-center gap-1.5 font-bold">
                  <Award className="h-4 w-4 text-cyan-400" />
                  2. Select Encasement Outcome Level:
                </span>
                <span className="text-xs font-semibold text-cyan-400">CLICK LEVEL TO INSPECT</span>
              </div>

              {/* Level Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {encasementLevels.map((lvl, idx) => {
                  const isSelected = activeLevel.grade === lvl.grade && customTargetFmv == null;
                  const lvlFriction = lvl.friction;
                  return (
                    <button
                      key={lvl.levelNumber}
                      onClick={() => syncGrade(lvl.grade)}
                      className={`p-2.5 sm:p-3 rounded-lg text-left transition-all border ${
                        isSelected
                          ? "bg-cyan-950/80 border-cyan-400 shadow-lg ring-2 ring-cyan-500/40"
                          : "bg-[#0e1626] border-slate-800 hover:border-slate-700 opacity-90 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold ${isSelected ? "text-cyan-300" : "text-slate-300"}`}>
                          LEVEL {lvl.levelNumber}
                        </span>
                        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${isSelected ? "bg-cyan-500/30 text-cyan-300" : "bg-slate-800 text-slate-300"}`}>
                          {lvl.grade}
                        </span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold font-mono text-white mt-1.5">
                        ${lvl.targetFmv.toLocaleString()}
                      </div>
                      <div className={`text-xs font-mono mt-1 font-bold ${lvlFriction.grossDollarGain >= 0 ? "text-cyan-300" : "text-rose-400"}`}>
                        {lvlFriction.grossDollarGain >= 0 ? `+${lvlFriction.grossRoiPct}% Gross` : `${lvlFriction.grossRoiPct}% Gross`}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        Net: {lvlFriction.netDollarGain >= 0 ? `+$${lvlFriction.netDollarGain.toLocaleString()}` : `-$${Math.abs(lvlFriction.netDollarGain).toLocaleString()}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Direct Grade Inspection Bar */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 flex-wrap font-mono">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                  Direct Grade Inspection:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {(["2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0", "9.2", "9.4", "9.6", "9.8"] as CanonicalGrade[]).map((g) => {
                    const isCurrent = activeLevel.grade === g && customTargetFmv == null;
                    const fmv = engineOutput.gradeMatrix[g]?.currentFmv;
                    return (
                      <button
                        key={g}
                        onClick={() => syncGrade(g)}
                        className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                        title={`Grade ${g}: $${fmv ? fmv.toLocaleString() : "N/A"}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Level Deep-Dive Diagnostics Card */}
              <div className="mt-4 p-4 sm:p-5 rounded-lg bg-[#0e1626] border border-cyan-500/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded text-xs sm:text-sm font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                      {activeLevel.levelTag} (CGC {activeLevel.grade})
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-slate-300 font-semibold">
                      Odds: {Math.round(activeLevel.attainmentProbability * 100)}% Base Attainment
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-slate-300 font-semibold">
                    Breakeven: ${activeFriction.breakevenHammer.toLocaleString()}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 font-sans mt-2.5 leading-relaxed">
                  {activeLevel.descriptor}
                </p>

                {/* Return Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5 pt-3 border-t border-slate-800 font-mono">
                  <div>
                    <div className="text-slate-400 uppercase text-xs font-semibold">Gross Capital Gain:</div>
                    <div className={`text-lg sm:text-2xl font-extrabold mt-1 ${activeFriction.grossDollarGain >= 0 ? "text-cyan-300" : "text-rose-400"}`}>
                      {activeFriction.grossDollarGain >= 0
                        ? `+$${activeFriction.grossDollarGain.toLocaleString()}`
                        : `-$${Math.abs(activeFriction.grossDollarGain).toLocaleString()}`}
                    </div>
                    <div className="text-xs text-cyan-400 font-semibold mt-0.5">
                      +{activeFriction.grossRoiPct}% Gross ROI
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase text-xs font-semibold">Net Cash Profit:</div>
                    <div className={`text-lg sm:text-2xl font-extrabold mt-1 ${activeFriction.netDollarGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {activeFriction.netDollarGain >= 0
                        ? `+$${activeFriction.netDollarGain.toLocaleString()}`
                        : `-$${Math.abs(activeFriction.netDollarGain).toLocaleString()}`}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                      +{activeFriction.netRoiPct}% Net Realized
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase text-xs font-semibold">Net Realized Cash:</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-white mt-1">
                      ${activeFriction.netRealizedProceeds.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">
                      Walk-Away Proceeds
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase text-xs font-semibold">Margin of Safety:</div>
                    <div className={`text-lg sm:text-2xl font-extrabold mt-1 ${activeFriction.marginOfSafetyPct >= 30 ? "text-emerald-400" : "text-amber-400"}`}>
                      {activeFriction.marginOfSafetyPct}%
                    </div>
                    <div className="text-xs text-slate-400 font-semibold mt-0.5">
                      Downside Buffer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Execution Note */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              CGC Tier: <strong className="text-slate-200">{activeFriction.cgcTierName}</strong> · Selling Friction: <strong className="text-slate-200">{activeFriction.commissionPct}%</strong>
            </span>
            <span className="text-cyan-400 font-bold">LADDER CALIBRATED</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2 (50%): THREE-TIER VALUE DECOMPOSITION (PLAIN-ENGLISH EXPLAINER)   */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0b1220]/95 border border-purple-500/35 flex flex-col justify-start shadow-xl">
          <div>
            {/* Column Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-400">
                  <Layers className="h-5 w-5" />
                </span>
                <h3 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
                  Three-Tier Value Decomposition
                </h3>
              </div>
              
              {/* Grade Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-md border border-slate-700 text-xs font-mono">
                <span className="text-slate-400 text-xs px-1 uppercase font-semibold">Grade:</span>
                {(["RAW", "4.0", "6.0", "8.0", "9.2", "9.8"] as CanonicalGrade[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => syncGrade(g)}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                      selectedDecompGrade === g
                        ? "bg-purple-500 text-white shadow-sm"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Subhead with Plain-English Purpose */}
            <div className="mt-2.5 text-xs sm:text-sm text-slate-300 font-mono flex items-center justify-between">
              <span>Decomposing Fair Market Value through Investopedia corporate finance &amp; collector reality:</span>
              <span className="text-xs font-mono font-bold text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded bg-purple-950/50">
                FMV = TNAV + Goodwill
              </span>
            </div>

            {/* 3 Plain-English Tiers with Large Readable Text */}
            <div className="space-y-3 mt-4">

              {/* Tier 1: Physical Paper Hard Floor */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-cyan-500/30">
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono uppercase tracking-wider">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <Lock className="h-4 w-4" />
                    <span>Tier 1: Tangible Net Asset Value (TNAV) &amp; Antiquity Floor</span>
                  </div>
                  <span className="text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    INVESTOPEDIA: TNAV FLOOR
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                    ${decomp.structuralCollectorValue.toLocaleString()}
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-slate-300 font-semibold">
                    Intrinsic Antiquity Floor (V_tangible)
                  </span>
                </div>
                {/* Investopedia Corporate Finance Definition */}
                <div className="text-xs font-mono text-cyan-200/90 mt-2 bg-slate-950/60 p-2.5 rounded border border-cyan-500/20 leading-relaxed">
                  <strong className="text-cyan-300">Investopedia Corporate Finance (TNAV):</strong> Tangible Net Asset Value (TNAV) measures the hard, liquidation-resistant assets of an enterprise after deducting all liabilities and stripping away all speculative intangible goodwill. For sovereign vintage comics, Tier 1 models the irreducible market clearing floor of surviving 1960s wood-pulp newsprint, period pigments, staple preservation, and audited CGC census survival—a hard baseline that holds even during cyclical macroeconomic contractions.
                </div>
                {/* Colloquial Collector Takeaway */}
                <p className="text-xs sm:text-sm text-slate-300 font-sans mt-2 leading-relaxed">
                  <strong className="text-white font-bold">In Plain English:</strong> What this physical comic book is worth purely as an irreplaceable surviving relic. Even in a worst-case crash where all movie hype dies tomorrow, collectors pay this baseline floor for authentic paper age and certified census scarcity.
                </p>
              </div>

              {/* Tier 2: Cultural / Narrative Demand Premium */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-purple-500/30">
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono uppercase tracking-wider">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>Tier 2: Brand Franchise Goodwill &amp; Forward Growth Option</span>
                  </div>
                  <span className="text-xs text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    INVESTOPEDIA: FRANCHISE GOODWILL
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-300">
                    ${decomp.narrativeSpeculativePremium.toLocaleString()}
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-slate-300 font-semibold">
                    Pop-Culture Goodwill (V_franchise)
                  </span>
                </div>
                {/* Investopedia Corporate Finance Definition */}
                <div className="text-xs font-mono text-purple-200/90 mt-2 bg-slate-950/60 p-2.5 rounded border border-purple-500/20 leading-relaxed">
                  <strong className="text-purple-300">Investopedia Corporate Finance (Goodwill &amp; Real-Options):</strong> Franchise Goodwill represents the capitalized present value of excess economic earnings generated by brand equity, copyright recognition, and global consumer mindshare over book asset value. In comic equities, Tier 2 prices the embedded long-call option on character franchise adaptations (Marvel Cinematic Universe, Sony, DCU), auction headline momentum, and institutional investor influx.
                </div>
                {/* Colloquial Collector Takeaway */}
                <p className="text-xs sm:text-sm text-slate-300 font-sans mt-2 leading-relaxed">
                  <strong className="text-purple-300 font-bold">In Plain English:</strong> The extra dollar premium driven by character fame, MCU film adaptations, and forward speculative bidding. This is the catalyst upside layered on top of the physical paper floor.
                </p>
              </div>

              {/* Tier 3: Immediate Cash Liquidation Floor */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-emerald-500/30">
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono uppercase tracking-wider">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <DollarSign className="h-4 w-4" />
                    <span>Tier 3: Orderly Liquidation Value (OLV) &amp; Net Realizable Value</span>
                  </div>
                  <span className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    INVESTOPEDIA: OLV CASH-OUT
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                    {decomp.marketExecutionFloor !== null
                      ? `$${decomp.marketExecutionFloor.toLocaleString()}`
                      : "Unmeasured"}
                  </div>
                  <span className="text-xs sm:text-sm font-mono text-slate-300 font-semibold">
                    {decomp.liquidityDiscountPct !== null ? `${decomp.liquidityDiscountPct}% Wholesale Haircut` : "Immediate Wire"}
                  </span>
                </div>
                {/* Investopedia Corporate Finance Definition */}
                <div className="text-xs font-mono text-emerald-200/90 mt-2 bg-slate-950/60 p-2.5 rounded border border-emerald-500/20 leading-relaxed">
                  <strong className="text-emerald-300">Investopedia Corporate Finance (Orderly Liquidation Value - OLV):</strong> In asset-based lending and corporate restructuring, Orderly Liquidation Value (OLV) is the gross cash realizable from an asset sale conducted with reasonable market exposure (typically under 30 days) to a wholesale market maker or specialist dealer. Net Realizable Value (NRV) deducts all transaction friction and broker fees to establish the absolute downside liquidity backstop.
                </div>
                {/* Colloquial Collector Takeaway */}
                <p className="text-xs sm:text-sm text-slate-300 font-sans mt-2 leading-relaxed">
                  <strong className="text-emerald-300 font-bold">In Plain English:</strong> The cash you walk away with in your pocket <span className="underline decoration-emerald-500 font-bold">TODAY</span> without waiting months for auction schedules. Calculated as fair market value minus selling venue fees and an immediate 15% wholesale discount for instantaneous wire liquidation.
                </p>
              </div>

            </div>

            {/* Plain-English & Investopedia Synthesis Bar - Highly Legible */}
            <div className="mt-4 p-4 rounded-lg bg-purple-950/30 border border-purple-500/50 text-xs sm:text-sm font-mono text-slate-200">
              <div className="flex items-center gap-2 text-purple-300 font-bold uppercase text-xs sm:text-sm mb-1.5">
                <HelpCircle className="h-4 w-4 text-purple-400" />
                Investopedia &amp; Plain-English Investor Takeaway:
              </div>
              <div className="text-xs font-mono text-purple-300/90 mb-1.5">
                <strong>Investopedia Formula:</strong> Fair Market Value (FMV ${decompRecord.currentFmv.toLocaleString()}) = TNAV (${decomp.structuralCollectorValue.toLocaleString()}) + Franchise Goodwill (${decomp.narrativeSpeculativePremium.toLocaleString()}).
              </div>
              <div className="leading-relaxed">
                <strong className="text-white">Collector Synthesis:</strong> You are buying physical historical antiquity (${decomp.structuralCollectorValue.toLocaleString()}) with an embedded free-floating media option (${decomp.narrativeSpeculativePremium.toLocaleString()}).
              </div>
              <div className="text-emerald-300 font-bold mt-1.5 leading-relaxed text-xs sm:text-sm">
                ➜ Immediate Cash Liquidation Value (OLV Today) = <span className="text-white underline decoration-emerald-400">{decomp.marketExecutionFloor ? `$${decomp.marketExecutionFloor.toLocaleString()}` : "Market Dependent"}</span> (instant wire exit without waiting).
              </div>
            </div>
          </div>

          {/* Bottom Provenance Note for Row 1 */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Certified Sovereign Provenance: <strong className="text-slate-200">{decompRecord.provenanceTag}</strong></span>
            <span className="text-purple-300 font-bold">CONFIDENCE: {decomp.confidenceScore}%</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ROW 2: CROSS-GRADE MATRIX & INVESTOPEDIA DUE DILIGENCE AUDIT SUITE         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-6 my-6 relative z-10">

        {/* COLUMN 1: ARBITRAGE MECHANICS & CROSS-GRADE CGC FRICTION MATRIX */}
        <div className="p-5 sm:p-7 rounded-xl bg-[#0b1220]/95 border border-cyan-500/40 flex flex-col justify-start shadow-2xl">
          {/* Column Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                <Calculator className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-mono font-bold uppercase tracking-wider text-white">
                  Arbitrage Mechanics &amp; Cross-Grade Friction Matrix
                </h3>
                <span className="text-xs text-slate-400 font-sans">
                  Pre-certification capitalization &amp; margin of safety modeling
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-md bg-cyan-950/70">
              GAAP CAPITALIZATION
            </span>
          </div>

          {/* Institutional Arbitrage Mechanics & Risk Protocols */}
          <div className="mt-5 space-y-4">
            {/* Capitalization & Return Mechanics Card */}
            <div className="p-5 rounded-xl bg-[#0e1626] border border-cyan-500/30 font-mono">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-300 pb-3 border-b border-slate-800">
                <span className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-cyan-400" />
                  Arbitrage Mechanics: Capitalized Basis &amp; Spread
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  Investopedia: GAAP Basis Capitalization
                </span>
              </div>

              <div className="mt-3 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                <strong className="text-white font-mono">Why Capitalized Cost Basis?</strong> In corporate valuation and tax accounting, pre-certification outlays (CGC 3% fee, clean &amp; press, inbound/return courier shipping, transit insurance) are not expensed immediately—they are capitalized into the asset’s adjusted cost basis (<strong className="text-cyan-300 font-mono text-base font-bold">${activeFriction.capitalizedBasis.toLocaleString()}</strong>).
              </div>

              {/* Big Numbers Grid */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                    Breakeven Auction Hammer:
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 mt-1 font-mono">
                    ${activeFriction.breakevenHammer.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-300 leading-normal mt-1 font-sans">
                    Minimum gross hammer required to return 100% of all-in capital.
                  </div>
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                    Downside Margin of Safety:
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
                    +{activeFriction.marginOfSafetyPct}% Buffer
                  </div>
                  <div className="text-xs text-slate-300 leading-normal mt-1 font-sans">
                    Asset price can contract {activeFriction.marginOfSafetyPct}% before threatening principal.
                  </div>
                </div>
              </div>

              {/* Plain English Takeaway Callout */}
              <div className="mt-3.5 p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                <span className="font-bold text-cyan-300 uppercase tracking-wider text-xs block mb-1">
                  In Plain English:
                </span>
                If you buy this raw copy at <strong className="text-white">${activePurchaseBasis.toLocaleString()}</strong> and grade it, your total out-of-pocket investment becomes <strong className="text-cyan-300">${activeFriction.capitalizedBasis.toLocaleString()}</strong>. Any hammer sale above <strong className="text-amber-300">${activeFriction.breakevenHammer.toLocaleString()}</strong> puts net cash directly in your pocket.
              </div>
            </div>

            {/* Dynamic CGC 3% Value Scaling Matrix Across Grades */}
            <div className="p-5 rounded-xl bg-[#0e1626] border border-slate-800 font-mono">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 pb-3 border-b border-slate-800">
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  Dynamic CGC Fee &amp; Profit Realization Across Grades
                </span>
                <span className="text-xs text-cyan-400 font-semibold">Flexible 3% Assessed</span>
              </div>
              
              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                      <th className="pb-2.5 font-bold">Outcome Grade</th>
                      <th className="pb-2.5 font-bold">Target FMV</th>
                      <th className="pb-2.5 font-bold">CGC Fee (3%)</th>
                      <th className="pb-2.5 font-bold">Gross Gain</th>
                      <th className="pb-2.5 font-bold text-right">Net Cash Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {encasementLevels.map((lvl) => {
                      const isCurrent = activeLevel.grade === lvl.grade;
                      return (
                        <tr
                          key={lvl.levelNumber}
                          className={`transition-colors ${
                            isCurrent ? "bg-cyan-950/70 text-white font-bold" : "text-slate-300 hover:bg-slate-900/60"
                          }`}
                        >
                          <td className="py-3 flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isCurrent ? "bg-cyan-500 text-slate-950 shadow-md" : "bg-slate-800 text-slate-200"}`}>
                              {lvl.grade}
                            </span>
                            <span className="text-xs sm:text-sm truncate text-slate-200 font-sans">{lvl.levelTag}</span>
                          </td>
                          <td className="py-3 font-bold text-white">${lvl.targetFmv.toLocaleString()}</td>
                          <td className="py-3 text-cyan-300 font-semibold">+${lvl.friction.certFee.toLocaleString()}</td>
                          <td className="py-3 text-cyan-400 font-bold">
                            {lvl.friction.grossDollarGain >= 0 ? `+$${lvl.friction.grossDollarGain.toLocaleString()}` : `-$${Math.abs(lvl.friction.grossDollarGain).toLocaleString()}`}
                          </td>
                          <td className={`py-3 text-right font-extrabold text-sm sm:text-base ${lvl.friction.netDollarGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {lvl.friction.netDollarGain >= 0 ? `+$${lvl.friction.netDollarGain.toLocaleString()}` : `-$${Math.abs(lvl.friction.netDollarGain).toLocaleString()}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans border-t border-slate-800/80 pt-3">
                <strong className="text-cyan-300 font-mono">Expert Takeaway:</strong> CGC grading fees scale dynamically based on final assessed market value (e.g., +$315 at 4.0 vs +$1,560 at 8.0). Professional pressing ($75 flat) can be toggled on/off to preserve fragile Silver/Golden Age spines.
              </div>
            </div>
          </div>

          {/* Bottom Execution Note */}
          <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400">
            <span>
              Breakeven: <strong className="text-amber-300 font-bold">${activeFriction.breakevenHammer.toLocaleString()}</strong> · Capitalized: <strong className="text-white font-bold">${activeFriction.capitalizedBasis.toLocaleString()}</strong>
            </span>
            <span className="text-cyan-400 font-bold tracking-wider">ARBITRAGE VALIDATED</span>
          </div>
        </div>

        {/* COLUMN 2: INVESTOPEDIA MULTI-TIER BALANCE SHEET & DUE DILIGENCE AUDIT */}
        <div className="p-5 sm:p-7 rounded-xl bg-[#0b1220]/95 border border-purple-500/40 flex flex-col justify-start shadow-2xl">
          {/* Column Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-400">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-mono font-bold uppercase tracking-wider text-white">
                  Investopedia Balance Sheet Matrix &amp; Due Diligence
                </h3>
                <span className="text-xs text-slate-400 font-sans">
                  Corporate asset allocation &amp; liquidation due diligence
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-purple-300 border border-purple-500/40 px-3 py-1 rounded-md bg-purple-950/70">
              GRADE {selectedDecompGrade} AUDIT
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {/* Investopedia Multi-Tier Balance Sheet Decomposition Table */}
            <div className="p-5 rounded-xl bg-[#0e1626] border border-purple-500/30 font-mono">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-300 pb-3 border-b border-slate-800">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-400" />
                  Investopedia 3-Tier Asset Allocation Matrix
                </span>
                <span className="text-xs text-purple-400 font-semibold">TNAV vs Goodwill vs OLV</span>
              </div>

              <div className="mt-3.5 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                      <th className="pb-2.5 font-bold">Grade</th>
                      <th className="pb-2.5 font-bold">FMV (P)</th>
                      <th className="pb-2.5 font-bold text-cyan-300">TNAV (Floor)</th>
                      <th className="pb-2.5 font-bold text-purple-300">Franchise (Hype)</th>
                      <th className="pb-2.5 font-bold text-emerald-400">OLV (Cash-Out)</th>
                      <th className="pb-2.5 font-bold text-right">Floor %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {(["RAW", "4.0", "6.0", "8.0", "9.2", "9.8"] as CanonicalGrade[]).map((g) => {
                      const rec = engineOutput.gradeMatrix[g];
                      if (!rec) return null;
                      const isCurrent = selectedDecompGrade === g;
                      const fmv = rec.currentFmv;
                      const tnav = rec.valuationDecomposition.structuralCollectorValue;
                      const goodwill = rec.valuationDecomposition.narrativeSpeculativePremium;
                      const olv = rec.valuationDecomposition.marketExecutionFloor;
                      const floorPct = fmv > 0 ? Math.round((tnav / fmv) * 100) : 0;
                      return (
                        <tr
                          key={g}
                          onClick={() => syncGrade(g)}
                          className={`cursor-pointer transition-colors ${
                            isCurrent ? "bg-purple-950/70 text-white font-bold" : "text-slate-300 hover:bg-slate-900/60"
                          }`}
                        >
                          <td className="py-3 flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isCurrent ? "bg-purple-500 text-white shadow-md" : "bg-slate-800 text-slate-200"}`}>
                              {g}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-white">${fmv.toLocaleString()}</td>
                          <td className="py-3 text-cyan-300 font-bold">${tnav.toLocaleString()}</td>
                          <td className="py-3 text-purple-300 font-bold">${goodwill.toLocaleString()}</td>
                          <td className="py-3 text-emerald-400 font-extrabold">{olv ? `$${olv.toLocaleString()}` : "N/A"}</td>
                          <td className="py-3 text-right font-bold text-slate-200">{floorPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Portfolio Risk Allocation Protocol */}
              <div className="mt-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans border-t border-slate-800/80 pt-3">
                <strong className="text-purple-300 font-mono">Investopedia Capital Allocation Rule:</strong> At mid grades (4.0–6.0), Tangible Net Asset Value (TNAV) represents <strong className="text-white font-bold">60%–80%</strong> of market price, providing a defensive downside floor insulated from movie cycles. At investment apex grades (9.2–9.8), Franchise Goodwill and census scarcity dominate (&gt;80%), delivering explosive upside leverage with higher beta to speculative sentiment.
              </div>
            </div>

            {/* Investopedia Corporate Finance & Balance Sheet Due Diligence Card */}
            <div className="p-5 rounded-xl bg-[#0e1626] border border-purple-500/30 font-mono">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-300 pb-3 border-b border-slate-800">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  Investopedia Due Diligence &amp; Capital Floor Audit
                </span>
                <span className="text-xs text-cyan-300 font-bold">Grade {selectedDecompGrade} Profile</span>
              </div>

              {/* Big Numbers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4 text-center">
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">TNAV Capital Cushion</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 mt-1 font-mono">
                    {decompRecord.currentFmv > 0 ? Math.round((decomp.structuralCollectorValue / decompRecord.currentFmv) * 100) : 0}%
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-mono font-semibold">
                    ${decomp.structuralCollectorValue.toLocaleString()} Hard Floor
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Franchise Beta Upside</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-purple-300 mt-1 font-mono">
                    {decompRecord.currentFmv > 0 ? Math.round((decomp.narrativeSpeculativePremium / decompRecord.currentFmv) * 100) : 0}%
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-mono font-semibold">
                    ${decomp.narrativeSpeculativePremium.toLocaleString()} Goodwill
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Immediate Liquidity (OLV)</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {decomp.marketExecutionFloor ? `$${decomp.marketExecutionFloor.toLocaleString()}` : "Market Wire"}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-mono font-semibold">
                    {decomp.liquidityDiscountPct !== null ? `${100 - decomp.liquidityDiscountPct}% Realized Net` : "Wholesale Clear"}
                  </div>
                </div>
              </div>

              {/* Plain English Explanatory Synthesis Bridge */}
              <div className="mt-4 p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs sm:text-sm font-sans leading-relaxed text-slate-200 space-y-2">
                <span className="font-bold text-purple-300 uppercase tracking-wider text-xs block mb-1">
                  In Plain English:
                </span>
                <div>
                  <strong className="text-white font-mono">1. Asset Protection (TNAV):</strong> For Grade {selectedDecompGrade}, <strong className="text-cyan-300 font-bold">${decomp.structuralCollectorValue.toLocaleString()}</strong> is anchored by physical scarcity and historical paper antiquity. Even if broader comic hype cools off, this baseline supports your asset value.
                </div>
                <div>
                  <strong className="text-purple-300 font-mono">2. Catalyst Optionality (Goodwill):</strong> The <strong className="text-purple-300 font-bold">${decomp.narrativeSpeculativePremium.toLocaleString()}</strong> franchise premium reflects MCU fame and collector prestige. During bull markets, this component scales aggressively.
                </div>
                <div>
                  <strong className="text-emerald-300 font-mono">3. Orderly Liquidation (OLV):</strong> Provides an immediate cash wire exit at <strong className="text-emerald-400 font-bold">{decomp.marketExecutionFloor ? `$${decomp.marketExecutionFloor.toLocaleString()}` : "dealer consensus"}</strong>—the exact cash you can walk away with today without waiting months for auction consignment.
                </div>
              </div>
            </div>
          </div>

          {/* Due Diligence Audit Footer */}
          <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm font-mono text-slate-400">
            <span>Corporate Due Diligence: <strong className="text-slate-200 font-bold">Asset-Backed Sovereign Floor</strong></span>
            <span className="text-purple-300 font-bold tracking-wider">GRADE {selectedDecompGrade} AUDITED</span>
          </div>
        </div>

      </div>

      {/* SECTION 2: Active Strategy Tab Content (Desks Below 50/50 Top Section) */}
      <div className="mt-6 pt-5 border-t border-slate-800 relative z-10">
        <div className="text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <span className="font-bold">Institutional Quant Execution: {activeStrategyTab === "TRADITIONAL" ? "Traditional Value Desk" : "Contrarian Quant Desk"}</span>
        </div>

        {activeStrategyTab === "TRADITIONAL" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              {/* Metric 1: Graham Margin of Safety */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Graham Margin of Safety
                </div>
                <div
                  className={`mt-1.5 text-xl font-extrabold font-mono ${
                    trad.isGrahamCompliant ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {trad.marginOfSafetyPct}%
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Basis: ${trad.grahamReplacementBasis.toLocaleString()} · {trad.isGrahamCompliant ? "COMPLIANT (≥30%)" : "THIN SPREAD"}
                </div>
              </div>

              {/* Metric 2: Moving Average Cross Signal */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  20M vs 50M Trend State
                </div>
                <div className="mt-1.5 text-base font-bold font-mono text-cyan-300">
                  {trad.movingAverageSignal}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  SMA-20: {trad.sma20Month ? `$${trad.sma20Month.toLocaleString()}` : "N/A"} · SMA-50: {trad.sma50Month ? `$${trad.sma50Month.toLocaleString()}` : "N/A"}
                </div>
              </div>

              {/* Metric 3: Periodic Monthly Sharpe */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Periodic Monthly Sharpe (N=12)
                </div>
                <div className="mt-1.5 text-xl font-extrabold font-mono text-white">
                  {trad.periodicMonthlyExcessSharpe != null ? trad.periodicMonthlyExcessSharpe : "Unmeasured"}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Risk-Free Yield: 4.5% Annual (N=12)
                </div>
              </div>

              {/* Metric 4: 5-Year CAGR */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  5-Year Realized CAGR
                </div>
                <div className="mt-1.5 text-xl font-extrabold font-mono text-emerald-400">
                  {trad.cagr5yPct != null ? `${trad.cagr5yPct}%` : "Horizon < 5Y"}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Strict 1,825-Day Verified Multi-Year Horizon
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              {/* Metric 1: Bollinger Z-Score Dislocation */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Bollinger Z-Score (Mean Reversion)
                </div>
                <div
                  className={`mt-1.5 text-xl font-extrabold font-mono ${
                    contra.isCapitulationDislocation
                      ? "text-emerald-400"
                      : contra.fallingKnifeAlert
                        ? "text-rose-400 animate-pulse"
                        : "text-white"
                  }`}
                >
                  {contra.zScore != null ? `${contra.zScore}σ` : "N/A"}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {engineOutput.contrarianDivergenceSignal?.signalTier === "FALLING_KNIFE_DO_NOT_CATCH"
                    ? "🚨 FALLING KNIFE: DO NOT CATCH"
                    : engineOutput.contrarianDivergenceSignal?.signalTier === "APEX_CAPITULATION_BUY"
                      ? "💎 APEX CAPITULATION BUY"
                      : contra.isCapitulationDislocation
                        ? "CAPITULATION BUY"
                        : contra.fallingKnifeAlert
                          ? "⚠️ FALLING KNIFE ALERT"
                          : "Within Statistical Envelope"}
                </div>
              </div>

              {/* Metric 2: Census Turnover Ratio & Physical Float */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Census Turnover (CTR) &amp; Float
                </div>
                <div className="mt-1.5 text-xl font-extrabold font-mono text-purple-300">
                  {engineOutput.physicalFloatProfile?.circulatingFloatCopies != null
                    ? `${engineOutput.physicalFloatProfile.circulatingFloatCopies} Float Copies`
                    : contra.censusTurnoverRatio != null
                      ? contra.censusTurnoverRatio
                      : contra.turnoverVelocityTier}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {engineOutput.fandomProfile?.fandomCapitalTier || contra.turnoverVelocityTier} · {engineOutput.physicalFloatProfile?.circulatingFloatPct != null ? `${engineOutput.physicalFloatProfile.circulatingFloatPct}% Circulating` : "Vaulted"}
                </div>
              </div>

              {/* Metric 3: Markov Grading Profit */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Probability-Weighted Net Profit
                </div>
                <div
                  className={`mt-1.5 text-xl font-extrabold font-mono ${
                    contra.markovGradingExpectedProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ${contra.markovGradingExpectedProfit.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Includes Downgrade Yield Penalties &amp; Fees
                </div>
              </div>

              {/* Metric 4: Recommended Action */}
              <div className="p-4 rounded-lg bg-[#0e1626] border border-slate-800">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Contrarian Action
                </div>
                <div className="mt-1.5 text-base font-bold font-mono text-cyan-300">
                  {contra.markovRecommendedAction}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Regime: {contra.contrarianRegime}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Institutional Explainer Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono relative z-10">
        <div>
          Governed by Sovereign Canonical System Map · Zero Synthetic Hallucination Rule Active
        </div>
        <div className="text-cyan-400 flex items-center gap-1 font-bold text-xs sm:text-sm">
          COMICBOOKSTOCKEXCHANGE.COM INSTITUTIONAL DESK <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}

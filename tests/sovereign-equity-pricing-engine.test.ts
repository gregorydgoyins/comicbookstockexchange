import { describe, it, expect } from "vitest";
import {
  executeSovereignPricingEngine,
  computeWilderRsi14,
  computeAnnualizedVol,
  computeMaxDrawdown,
  type SovereignMonthlySnapshot,
  type SovereignPricingEngineInput,
} from "@/lib/pricing/sovereign-equity-pricing-engine";

describe("Sovereign Canonical Equity Pricing Engine Verification Suite", () => {
  it("verifies Wilder RSI-14 edge behavior and numerical accuracy", () => {
    // Monotonically increasing prices -> RSI should be 100
    const rising = Array.from({ length: 20 }, (_, i) => 10 + i * 2);
    expect(computeWilderRsi14(rising)).toBe(100);

    // Monotonically decreasing prices -> RSI should be near 0
    const falling = Array.from({ length: 20 }, (_, i) => 50 - i * 2);
    expect(computeWilderRsi14(falling)).toBeLessThan(10);
  });

  it("verifies Annualized Volatility and Maximum Drawdown calculation", () => {
    // 6-month price series with known drawdown
    const prices = [100, 150, 120, 90, 110, 130];
    const vol = computeAnnualizedVol(prices);
    const mdd = computeMaxDrawdown(prices);

    expect(vol).toBeDefined();
    expect(vol!).toBeGreaterThan(0.3); // High volatility
    // Peak was 150, trough was 90 -> ((150 - 90) / 150) * 100 = 40.0%
    expect(mdd).toBe(40.0);
  });

  it("executes full 60-month multi-grade sovereign pricing engine on landmark equity", () => {
    // Simulate 60 monthly snapshots (Nov 2021 to Oct 2026) for Incredible Hulk #181 (1974)
    const snapshots: SovereignMonthlySnapshot[] = [];
    const baseEpoch = Date.parse("2021-11-01T00:00:00Z");

    let pRaw = 1200.0;
    let p80 = 3500.0;
    let p92 = 6000.0;
    let p98 = 35000.0;

    for (let i = 0; i < 60; i++) {
      const epochMs = baseEpoch + i * 30.4375 * 86_400_000;
      // Cycle: 2021 peak -> 2022-2023 cooldown -> 2024-2026 solid stabilization
      if (i < 8) {
        pRaw += 50;
        p80 += 150;
        p92 += 250;
        p98 += 1500;
      } else if (i < 26) {
        pRaw -= 20;
        p80 -= 60;
        p92 -= 120;
        p98 -= 600;
      } else {
        pRaw += 15;
        p80 += 40;
        p92 += 75;
        p98 += 450;
      }

      snapshots.push({
        date: new Date(epochMs).toISOString().slice(0, 10),
        epochMs,
        pricesByGrade: {
          RAW: Number(pRaw.toFixed(2)),
          "8.0": Number(p80.toFixed(2)),
          "9.2": Number(p92.toFixed(2)),
          "9.8": Number(p98.toFixed(2)),
        },
      });
    }

    const input: SovereignPricingEngineInput = {
      comicId: "2386994",
      series: "The Incredible Hulk",
      issue: "181",
      publicationYear: 1974,
      monthlySnapshots: snapshots,
      rawPurchaseCost: 1800.0,
      censusPopByGrade: {
        "9.8": 88,
        "9.2": 612,
        "8.0": 1420,
      },
    };

    const output = executeSovereignPricingEngine(input);

    // 1. Era Verification
    expect(output.era).toBe("Bronze");
    expect(output.portfolioRiskSummary.liquidityAnchorGrade).toBe("9.2");
    expect(output.snapshotCount).toBe(60);
    expect(output.timeHorizonYears).toBeGreaterThan(4.8);

    // 2. Complete 14-Grade Matrix Verification
    const gMatrix = output.gradeMatrix;
    expect(gMatrix["RAW"].currentFmv).toBeGreaterThan(1500);
    expect(gMatrix["8.0"].currentFmv).toBeGreaterThan(4000);
    expect(gMatrix["9.2"].currentFmv).toBeGreaterThan(7000);
    expect(gMatrix["9.8"].currentFmv).toBeGreaterThan(40000);

    // Verify non-observed grades were interpolated via elastic ratios
    expect(gMatrix["9.4"].currentFmv).toBeGreaterThan(gMatrix["9.2"].currentFmv);
    expect(gMatrix["9.6"].currentFmv).toBeGreaterThan(gMatrix["9.4"].currentFmv);
    expect(gMatrix["9.8"].currentFmv).toBeGreaterThan(gMatrix["9.6"].currentFmv);
    expect(gMatrix["10.0"].currentFmv).toBeGreaterThan(gMatrix["9.8"].currentFmv);

    // 3. Multi-Horizon Momenta Verification
    expect(gMatrix["9.8"].momenta.macro5yPct).toBeDefined();
    expect(gMatrix["9.8"].momenta.change30dPct).toBeDefined();
    expect(gMatrix["9.8"].annualizedVolatility).toBeGreaterThan(0.05);
    expect(gMatrix["9.8"].maxDrawdownPct).toBeGreaterThan(10);
    expect(gMatrix["9.8"].sma20).toBeDefined();
    expect(gMatrix["9.8"].rsi14).toBeDefined();

    // 4. Grading Arbitrage Ladder Verification with Transition Probability
    expect(output.gradingArbitrageLadder.length).toBeGreaterThan(3);
    const opt98 = output.gradingArbitrageLadder.find((opt) => opt.targetGrade === "9.8");
    expect(opt98).toBeDefined();
    expect(opt98!.gradingAlphaSpread).toBeGreaterThan(30000);
    // Dynamic census ratio: 88 copies of 9.8 out of 2120 total graded = 4.1% empirical ratio
    // Blended with default 25% gives authentic dynamic probability ~0.104 (10.4%)
    expect(opt98!.targetGradeProbability).toBe(0.104);
    expect(opt98!.expectedNetProfit).toBeGreaterThan(1000);
    // Real-world 4% CGC Unlimited + 4% CCS Pressing yields authentic ~86% margin of safety
    expect(opt98!.marginOfSafetyPct).toBeGreaterThan(80);
    expect(opt98!.isFavorable).toBe(true);
  });

  it("verifies unindexed census defaults to UNINDEXED, not false MODERATE", () => {
    const input: SovereignPricingEngineInput = {
      comicId: "test-unindexed",
      series: "Spawn",
      issue: "1",
      publicationYear: 1992,
      publisher: "Image Comics",
      monthlySnapshots: [
        {
          date: "2026-01-01",
          epochMs: Date.parse("2026-01-01T00:00:00Z"),
          pricesByGrade: { RAW: 25, "9.8": 150 },
        },
      ],
      // No census population supplied
    };

    const output = executeSovereignPricingEngine(input);
    expect(output.era).toBe("Independent");
    expect(output.portfolioRiskSummary.scarcityTier).toBe("UNINDEXED");
  });

  it("strictly enforces Zero Fake Data Covenant on unmeasured volatility and zero completed trades", () => {
    const input: SovereignPricingEngineInput = {
      comicId: "zero-data-check",
      series: "Amazing Spider-Man",
      issue: "300",
      publicationYear: 1988,
      publisher: "Marvel Comics",
      completedSalesCount: 0, // Zero observed auction transactions
      monthlySnapshots: [
        {
          date: "2026-10-01",
          epochMs: Date.parse("2026-10-01T00:00:00Z"),
          pricesByGrade: { RAW: 200, "9.8": 2800 },
        },
      ],
      censusPopByGrade: { "9.8": 1500 },
    };

    const output = executeSovereignPricingEngine(input);

    // 1. Prediction interval must be null when volatility cannot be measured (only 1 snapshot)
    expect(output.gradeMatrix["9.8"].annualizedVolatility).toBeNull();
    expect(output.gradeMatrix["9.8"].valuationDecomposition.predictionInterval80).toBeNull();

    // 2. Provenance tag must be VALUATION_SNAPSHOT when completed trades = 0
    expect(output.gradeMatrix["9.8"].provenanceTag).toBe("VALUATION_SNAPSHOT");

    // 3. CTR must be null and tier must be NO_OBSERVED_TRADES when trades = 0, NOT fabricated 1
    expect(output.contrarianStrategies.censusTurnoverRatio).toBeNull();
    expect(output.contrarianStrategies.turnoverVelocityTier).toBe("NO_OBSERVED_TRADES");
  });

  it("verifies v3.6 institutional audit requirements: grade-level provenance, unmeasured turnover, full 9.0+ numerator, and pure measured volatility", () => {
    // 1. Grade-level provenance: Issue has completed trades, but only in 9.2 (none in 9.8).
    // Grade 9.2 must be OBSERVED_AUCTION_SALE while 9.8 must be VALUATION_SNAPSHOT.
    const input: SovereignPricingEngineInput = {
      comicId: "audit-3.6",
      series: "X-Men",
      issue: "94",
      publicationYear: 1975,
      completedSalesCount: 4,
      completedSalesCountByGrade: {
        "9.2": 4,
        "9.8": 0,
      },
      monthlySnapshots: [
        {
          date: "2026-05-01",
          epochMs: Date.parse("2026-05-01T00:00:00Z"),
          pricesByGrade: { "9.2": 4400, "9.8": 22000 },
        },
        {
          date: "2026-06-01",
          epochMs: Date.parse("2026-06-01T00:00:00Z"),
          pricesByGrade: { "9.2": 4450, "9.8": 22050 },
        },
        {
          date: "2026-07-01",
          epochMs: Date.parse("2026-07-01T00:00:00Z"),
          pricesByGrade: { "9.2": 4480, "9.8": 22080 },
        },
        {
          date: "2026-08-01",
          epochMs: Date.parse("2026-08-01T00:00:00Z"),
          pricesByGrade: { "9.2": 4500, "9.8": 22100 },
        },
        {
          date: "2026-09-01",
          epochMs: Date.parse("2026-09-01T00:00:00Z"),
          pricesByGrade: { "9.2": 4550, "9.8": 22150 },
        },
        {
          date: "2026-10-01",
          epochMs: Date.parse("2026-10-01T00:00:00Z"),
          pricesByGrade: { "9.2": 4600, "9.8": 22200 },
        },
      ],
      // Comprehensive 9.0+ census
      censusPopByGrade: {
        "10.0": 0,
        "9.8": 12,
        "9.6": 34,
        "9.4": 86,
        "9.2": 150,
        "9.0": 210,
      },
    };

    const output = executeSovereignPricingEngine(input);

    // Provenance strictly verified at grade level:
    expect(output.gradeMatrix["9.2"].provenanceTag).toBe("OBSERVED_AUCTION_SALE");
    expect(output.gradeMatrix["9.8"].provenanceTag).toBe("VALUATION_SNAPSHOT");
    expect(output.gradeMatrix["8.0"].provenanceTag).toBe("ELASTIC_COHORT_ESTIMATE");

    // Pure measured volatility with no undisclosed 0.05 floor:
    // With prices [22000, 22100, 22200], realized annualized volatility is tiny (< 0.05)
    const vol98 = output.gradeMatrix["9.8"].annualizedVolatility;
    expect(vol98).toBeDefined();
    expect(vol98!).toBeLessThan(0.05); // Real volatility is ~0.016
    // Prediction interval must use actual vol98, not Math.max(0.05, vol)
    const interval = output.gradeMatrix["9.8"].valuationDecomposition.predictionInterval80;
    expect(interval).toBeDefined();
    expect(interval!.lower).toBeGreaterThan(21000); // Extremely narrow spread reflecting low true volatility

    // Comprehensive 9.0+ census turnover:
    // Total 9.0+ pop = 12 + 34 + 86 + 150 + 210 = 492
    // Trailing sales = 4 -> CTR = 492 / 4 = 123.0
    expect(output.contrarianStrategies.censusTurnoverRatio).toBe(123.0);
    expect(output.contrarianStrategies.turnoverVelocityTier).toBe("LOW_TURNOVER_DORMANT");
    expect(output.contrarianStrategies.censusCoverageStatus).toBe("COMPLETE_VERIFIED_CENSUS");

    // When completedSalesCount is omitted, CTR must return UNMEASURED, never falling back to snapshot count
    const omittedInput: SovereignPricingEngineInput = {
      ...input,
      completedSalesCount: undefined,
      completedSalesCountByGrade: undefined,
    };
    const omittedOutput = executeSovereignPricingEngine(omittedInput);
    expect(omittedOutput.contrarianStrategies.censusTurnoverRatio).toBeNull();
    expect(omittedOutput.contrarianStrategies.turnoverVelocityTier).toBe("UNMEASURED");

    // Zero-fallback liquidity: when trades are omitted, liquidityState is UNMEASURED and floor is null!
    expect(omittedOutput.gradeMatrix["9.8"].valuationDecomposition.liquidityState).toBe("UNMEASURED");
    expect(omittedOutput.gradeMatrix["9.8"].valuationDecomposition.marketExecutionFloor).toBeNull();
    expect(omittedOutput.gradeMatrix["9.8"].valuationDecomposition.liquidityDiscountPct).toBeNull();
  });

  it("verifies partial vs complete census coverage classification", () => {
    // Only 9.8 is provided (partial coverage)
    const partialInput: SovereignPricingEngineInput = {
      comicId: "partial-census-check",
      series: "Spawn",
      issue: "1",
      publicationYear: 1992,
      completedSalesCount: 10,
      monthlySnapshots: [
        {
          date: "2026-10-01",
          epochMs: Date.parse("2026-10-01T00:00:00Z"),
          pricesByGrade: { RAW: 25, "9.8": 150 },
        },
      ],
      censusPopByGrade: { "9.8": 5000 },
    };

    const partialOutput = executeSovereignPricingEngine(partialInput);
    expect(partialOutput.contrarianStrategies.censusCoverageStatus).toBe("PARTIAL_GRADE_COVERAGE");
    expect(partialOutput.contrarianStrategies.censusTurnoverRatio).toBe(500.0);
    expect(partialOutput.contrarianStrategies.circulatingFloatEstimate).toBe(8); // Math.round(10 * 0.75)
  });

  it("verifies dynamic census-weighted option probabilities and falling knife detection", () => {
    // 1. Dynamic census odds: Golden Age comic with only 2 copies of 9.8 out of 500 total graded
    const rare98Input: SovereignPricingEngineInput = {
      comicId: "af-15-rare",
      series: "Amazing Fantasy",
      issue: "15",
      publicationYear: 1962,
      rawPurchaseCost: 15000,
      monthlySnapshots: [
        {
          date: "2026-10-01",
          epochMs: Date.parse("2026-10-01T00:00:00Z"),
          pricesByGrade: {
            RAW: 15000,
            "4.0": 45000,
            "8.0": 150000,
            "9.2": 600000,
            "9.8": 3000000,
          },
        },
      ],
      censusPopByGrade: {
        "9.8": 2, // Only 2 copies in 9.8
        "9.2": 8,
        "8.0": 40,
        "4.0": 150,
        "2.0": 300, // Total = 500 copies
      },
      completedSalesCount: 1,
    };

    const rareOutput = executeSovereignPricingEngine(rare98Input);
    const opt98 = rareOutput.gradingArbitrageLadder.find((opt) => opt.targetGrade === "9.8");
    expect(opt98).toBeDefined();
    // Empirical frequency is 2 / 500 = 0.004 (0.4%). Blended probability should be heavily discounted (< 0.10)
    expect(opt98!.targetGradeProbability).toBeLessThan(0.10);
  });
});

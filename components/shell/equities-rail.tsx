"use client";

import * as React from "react";
import type { SovereignEquityItem } from "@/lib/equity/canonical-equities";
import type { MarketIndexRecord } from "@/lib/market/indices";
import type { EquityItem, EquityResponse } from "@/lib/equity/ticker-types";
import { lookupReferenceFmv, isProvenSovereignCopy } from "@/lib/pricing/reference-benchmarks";
import { formatComicEquityTicker } from "@/lib/equity/ticker-formatting";
import {
  resolveHistoricalKeyBadge,
  resolveHistoricalScarcityTier,
  resolveHistoricalMarketClass,
} from "@/lib/equity/significance-classifier";
import { TickerHeader } from "@/components/tickers/ticker-header";
import { EquityCard } from "@/components/tickers/equity-card";

const CARD_W = 227; // 215px card + 12px gap
const SCROLL_SPEED = 150; // px/s (rapid live trading floor ticker motion)
const RAIL_TOTAL = 485_291; // rows in rail_books: every comic with a cover and a price, no floor
const RAIL_STEP = 80;

interface EquitiesRailProps {
  items: SovereignEquityItem[];
  indices?: MarketIndexRecord[];
  /** Pre-built covered-book cards (server seed). Takes precedence over `items`. */
  seedItems?: EquityItem[];
  initialOffset?: number;
}

export function EquitiesRail({ items: initialItems = [], seedItems, indices = [], initialOffset }: EquitiesRailProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const fetchCount = React.useRef(0);
  const seedOffset = initialOffset ?? (initialItems[0]?.seatNumber ? initialItems[0].seatNumber - 1 : 0);
  const nextOffset = React.useRef(seedOffset);
  const [selectedEra, setSelectedEra] = React.useState<string | null>(null);

  // Convert initial SovereignEquityItem[] to EquityItem[] for instant first-paint
  const initialEquityItems = React.useMemo<EquityItem[]>(() => {
    if (seedItems && seedItems.length > 0) return seedItems;
    return initialItems.map((item, idx) => {
      const eraKey = (item.productionAge || item.originEra || "modern").toLowerCase().replace(/_age$/, "").replace(/\s+age$/, "");
      const fmv = item.referenceFmvUsd || 0;
      const itemGrade = item.referenceGrade ? String(item.referenceGrade).trim() : null;

      const bench = lookupReferenceFmv(item.seatNumber, item.title, item.canonicalIssueId);
      const isTrulySovereign = !item.variant && isProvenSovereignCopy(itemGrade || "", bench, {
        isVariant: Boolean(item.variant),
        variantName: item.variant,
      });

      // Enforce Price Firewall: Scarcity Tier & Market Class gated by Historical & Cultural Significance
      const keyBadge = item.keyBadge || resolveHistoricalKeyBadge(item.series, item.issueNumber);
      const tier = resolveHistoricalScarcityTier({
        year: item.year,
        era: eraKey,
        keyBadge,
        isSovereign: isTrulySovereign,
        variant: item.variant,
      });
      const marketClass = resolveHistoricalMarketClass({
        isSovereign: isTrulySovereign,
        fmv,
        keyBadge,
        year: item.year,
        era: eraKey,
        variant: item.variant,
      });
      const effectiveAssetClass = isTrulySovereign ? "SOV" : marketClass;

      const cleanTicker = (
        item.ticker &&
        !item.ticker.startsWith("CE70") &&
        !/^(RAW|SOV|STD|OTC|PREMIUM)$/i.test(item.ticker) &&
        !item.ticker.includes("seat")
      )
        ? item.ticker.replace(/^\$/, "").replace(/\.(SOV|ANC|STD|OTC|PREMIUM)$/i, "").trim()
        : formatComicEquityTicker(item.series, item.issueNumber);

      const vLower = (item.variant || "").toLowerCase();
      const editionForm = vLower.includes("newsstand")
        ? "NEWSSTAND"
        : vLower.includes("print")
        ? "REPRINT"
        : item.variant
        ? "VARIANT"
        : "DIRECT";

      return {
        entryId: `eq-${item.id || idx}`,
        coverImageUrl: item.coverUrl || null,
        pricing: {
          fmv_usd: fmv,
          grade: itemGrade,
          delta_24: item.deltaPercent ?? null,
          delta_30: null,
          delta_90: null,
          asset_class: effectiveAssetClass,
        },
        identity: {
          assetId: cleanTicker,
          productName: item.variant
            ? `${item.series} #${item.issueNumber} [${item.variant}]`
            : `${item.series} #${item.issueNumber}`,
          year: item.year || null,
          publisher: item.publisher || (item.lineage.includes("DC") ? "DC Comics" : item.lineage.includes("Marvel") ? "Marvel" : "Independent"),
          variant: item.variant || null,
          productionAge: eraKey,
          scarcityTier: tier,
          detailUrl: `/comics/${encodeURIComponent(cleanTicker || item.canonicalIssueId || item.id)}`,
          assetClass: effectiveAssetClass,
          marketPriceClass: marketClass,
          isSovereign: isTrulySovereign,
          certificationState: isTrulySovereign ? "SOVEREIGN_BLUE_LABEL" : "OBSERVED",
          editionForm,
          coverVerified: Boolean(item.coverUrl),
          yearDivergence: false,
          coverSuppressReason: null,
          identityConfidence: isTrulySovereign ? 100 : (item as any).identityConfidence ?? null,
          quarantined: false,
          keyBadge,
        },
      };
    });
  }, [initialItems, seedItems]);

  const [items, setItems] = React.useState<EquityItem[]>(initialEquityItems);
  const [meta, setMeta] = React.useState<{
    tickId: number;
    totalEligible: number;
    eraTotals: Record<string, number>;
    scarcityTotals: Record<string, number>;
  } | null>(() => {
    if (!initialEquityItems.length) return null;
    const eraTotals: Record<string, number> = {};
    const scarcityTotals: Record<string, number> = {};
    for (const item of initialEquityItems) {
      const era = item.identity.productionAge;
      eraTotals[era] = (eraTotals[era] || 0) + 1;
      const tier = item.identity.scarcityTier;
      scarcityTotals[tier] = (scarcityTotals[tier] || 0) + 1;
    }
    return {
      tickId: 1,
      totalEligible: initialEquityItems.length,
      eraTotals,
      scarcityTotals,
    };
  });

  const [errored, setErrored] = React.useState(false);
  const [noSignalFilter, setNoSignalFilter] = React.useState(false);

  // Mythic tier (≥$50K) count for the Heritage Vault badge
  const HERITAGE_VAULT_THRESHOLD = 50_000;
  const heritageItems = React.useMemo(
    () => items.filter((i) => i && (i.pricing?.fmv_usd ?? 0) >= HERITAGE_VAULT_THRESHOLD),
    [items]
  );
  const tradeableItems = React.useMemo(
    () => items,
    [items]
  );
  const noSignalCount = React.useMemo(
    () => items.filter((i) => i?.identity?.identityConfidence === 0).length,
    [items]
  );

  const displayItems = React.useMemo(() => {
    if (noSignalFilter) {
      return tradeableItems.filter((i) => i?.identity?.identityConfidence === 0);
    }
    if (selectedEra) {
      const byEra = tradeableItems.filter((i) => i?.identity?.productionAge === selectedEra);
      if (byEra.length > 0) return byEra;
    }
    return tradeableItems.length > 0 ? tradeableItems : items;
  }, [tradeableItems, items, noSignalFilter, selectedEra]);

  // Adjust duration dynamically without resetting visual position
  React.useLayoutEffect(() => {
    if (!trackRef.current || displayItems.length === 0) return;
    const duration = (displayItems.length * CARD_W) / SCROLL_SPEED;
    const elapsedSeconds = (Date.now() / 1000) % duration;
    trackRef.current.style.animationDuration = `${duration}s`;
    trackRef.current.style.animationDelay = `-${elapsedSeconds}s`;
    trackRef.current.style.animationPlayState = "running";
  }, [displayItems.length]);

  // Sequential batch loader supporting up to 10,000 batches (continuous rotation across 38,957 verified catalog)
  const fetchBatch = React.useCallback(async (overrideOffset?: number, overrideEra?: string | null) => {
    try {
      const targetEra = overrideEra !== undefined ? overrideEra : selectedEra;
      const offset = overrideOffset !== undefined ? overrideOffset : nextOffset.current;
      void targetEra; // era is applied client-side on the loaded batch
      const url = `/api/equity/covered?limit=${RAIL_STEP}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: EquityResponse = await res.json();

      const newItems = json.items ?? [];
      if (newItems.length > 0) {
        // startTransition prevents re-render hiccups on the GPU compositor thread
        React.startTransition(() => {
          setItems(newItems);
        });

        setMeta({
          tickId: json.tickId,
          totalEligible: json.totalEligible,
          eraTotals: json.eraTotals ?? {},
          scarcityTotals: json.scarcityTotals ?? {},
        });
        setErrored(false);

        fetchCount.current += 1;
        const next = json.nextOffset ?? ((offset + newItems.length) % (json.totalEligible || RAIL_TOTAL));
        nextOffset.current = next;
        try {
          sessionStorage.setItem("pp_rail_offset", String(next));
        } catch {
          // Ignore storage quota or disabled storage
        }
      }
    } catch {
      setErrored(true);
    }
  }, [selectedEra]);

  const handleSelectEra = React.useCallback((era: string | null) => {
    setSelectedEra(era);
    nextOffset.current = 0;
    fetchBatch(0, era);
  }, [fetchBatch]);

  const handleNextBatch = React.useCallback(() => {
    fetchBatch();
  }, [fetchBatch]);

  React.useEffect(() => {
    // Check if user has an existing queue offset in sessionStorage
    try {
      const stored = sessionStorage.getItem("pp_rail_offset");
      if (stored !== null) {
        // Advance by 260 comics on page reload so user gets a piece of the next batch!
        const nextReloadOffset = (parseInt(stored, 10) + 260) % RAIL_TOTAL;
        nextOffset.current = nextReloadOffset;
        sessionStorage.setItem("pp_rail_offset", String(nextReloadOffset));
        fetchBatch(nextReloadOffset);
        return;
      }
    } catch {}

    // First visit in session: seed with the SSR offset and stage the next 260 chunk
    const nextStep = (seedOffset + RAIL_STEP) % RAIL_TOTAL;
    nextOffset.current = nextStep;
    try {
      sessionStorage.setItem("pp_rail_offset", String(nextStep));
    } catch {}

    if (initialEquityItems.length === 0) {
      fetchBatch(seedOffset);
    }
  }, [fetchBatch, initialEquityItems.length, seedOffset]);

  // Pause on hover via direct DOM style manipulation — zero React re-renders
  const handleEnter = React.useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
  }, []);

  const handleLeave = React.useCallback(() => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "running";
  }, []);

  const listToRender = displayItems.length > 0 ? displayItems : initialEquityItems;

  return (
    <aside
      aria-label="Sovereign Comic Equity Surveillance Rail"
      className="border-b border-slate-800/80 bg-[#070A11] text-xs text-slate-300 shadow-md select-none overflow-hidden"
    >
      {/* ── Ticker Header ── */}
      <TickerHeader
        showing={listToRender.length}
        total={meta?.totalEligible ?? listToRender.length}
        stalled={errored}
        eraCounts={meta?.eraTotals ?? {}}
        scarcityCounts={meta?.scarcityTotals ?? {}}
        noSignalFilter={noSignalFilter}
        noSignalCount={noSignalCount}
        heritageCount={heritageItems.length}
        selectedEra={selectedEra}
        onSelectEra={handleSelectEra}
        onNextBatch={handleNextBatch}
        onRetry={() => fetchBatch()}
        onToggleNoSignal={() => setNoSignalFilter((f) => !f)}
      />

      {/* ── Continuously Animated Sovereign Comic Constituents Marquee Rail ── */}
      <div
        className="equities-marquee relative min-w-0 overflow-hidden py-3 bg-[#05070C]"
        role="region"
        aria-label="Sovereign Comic Constituents Ticker"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {/* Left & Right Ambient Fade Scrims */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#05070C] via-[#05070C]/80 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#05070C] via-[#05070C]/80 to-transparent z-20" />

        {listToRender.length > 0 && (
          <div
            ref={trackRef}
            className="equities-marquee-track flex w-max items-center will-change-transform"
            style={{
              display: "flex",
              width: "max-content",
              willChange: "transform",
              animation: `panel-profits-equities-marquee 120s linear infinite`,
              backfaceVisibility: "hidden",
            }}
          >
            {(["a", "b"] as const).map((copy) => (
              <div key={copy} style={{ display: "flex", gap: "12px", paddingLeft: "16px", paddingRight: "12px", flexShrink: 0 }}>
                {listToRender.map((item, i) => (
                  <EquityCard
                    key={`${copy}-${item.entryId || item.identity?.assetId || i}`}
                    item={item}
                    index={copy === "a" ? i : i + listToRender.length}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
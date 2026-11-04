/**
 * pricecharting-adapter.ts
 * ========================
 * Authoritative schema translator for PriceCharting API JSON responses.
 *
 * PriceCharting re-uses its video-game database schema for comics:
 * - `loose-price`: RAW / Ungraded
 * - `cib-price`: CGC 4.0 (VG)
 * - `new-price`: CGC 6.0 (Fine)
 * - `graded-price`: CGC 8.0 (VF)
 * - `box-only-price`: CGC 9.2 (NM-)
 * - `manual-only-price`: CGC 9.8 (NM/MT)
 * - `bgs-10-price`: CGC 10.0 (Gem Mint)
 *
 * And custom condition slots:
 * - `condition-9-price`: CGC 2.0 (Good)
 * - `condition-13-price`: CGC 3.0 (Good/VG)
 * - `condition-14-price`: CGC 5.0 (VG/Fine)
 * - `condition-15-price`: CGC 7.0 (Fine/VF)
 * - `condition-16-price`: CGC 9.0 (VF/NM)
 * - `condition-17-price`: CGC 9.4 (Near Mint)
 * - `condition-10-price`: CGC 9.6 (NM+)
 * - `condition-18-price`: CGC 9.8 Sell / Market Ask
 *
 * Dealer retail margins:
 * - `retail-loose-buy` / `retail-loose-sell`: Dealer bid/ask on RAW
 * - `retail-cib-buy` / `retail-cib-sell`: Dealer bid/ask on CGC 4.0
 * - `retail-new-buy` / `retail-new-sell`: Dealer bid/ask on CGC 6.0
 */

export interface PriceChartingRawJson {
  id: string;
  status: string;
  "product-name"?: string;
  "console-name"?: string;
  "release-date"?: string;
  "sales-volume"?: string | number;
  upc?: string;
  genre?: string;

  // Video-game named columns
  "loose-price"?: number;
  "cib-price"?: number;
  "new-price"?: number;
  "graded-price"?: number;
  "box-only-price"?: number;
  "manual-only-price"?: number;
  "bgs-10-price"?: number;

  // Custom condition slots
  "condition-9-price"?: number;
  "condition-10-price"?: number;
  "condition-13-price"?: number;
  "condition-14-price"?: number;
  "condition-15-price"?: number;
  "condition-16-price"?: number;
  "condition-17-price"?: number;
  "condition-18-price"?: number;

  // Dealer Quotes
  "retail-loose-buy"?: number;
  "retail-loose-sell"?: number;
  "retail-cib-buy"?: number;
  "retail-cib-sell"?: number;
  "retail-new-buy"?: number;
  "retail-new-sell"?: number;
}

export interface TranslatedComicPricing {
  id: string;
  productName: string;
  series: string;
  releaseDate: string | null;
  /** Rolling 365-day total units sold across all grades */
  salesVolumeYearly: number;
  upc: string | null;

  /** Standard 10-point grade ladder in USD */
  grades: {
    "10.0": number | null;
    "9.8": number | null;
    "9.8_sell": number | null;
    "9.6": number | null;
    "9.4": number | null;
    "9.2": number | null;
    "9.0": number | null;
    "8.0": number | null;
    "7.0": number | null;
    "6.0": number | null;
    "5.0": number | null;
    "4.0": number | null;
    "3.0": number | null;
    "2.0": number | null;
    RAW: number | null;
  };

  /** Dealer Bid / Ask Quotes in USD */
  dealerQuotes: {
    raw: { bid: number | null; ask: number | null; spreadPct: number | null };
    grade4_0: { bid: number | null; ask: number | null; spreadPct: number | null };
    grade6_0: { bid: number | null; ask: number | null; spreadPct: number | null };
  };
}

function centsToUsd(cents: number | undefined | null): number | null {
  if (cents == null || isNaN(cents) || cents <= 0) return null;
  return Number((cents / 100).toFixed(2));
}

function calcSpreadPct(bid: number | null, ask: number | null): number | null {
  if (!bid || !ask || ask <= bid) return null;
  return Number((((ask - bid) / ask) * 100).toFixed(2));
}

export function translatePriceChartingJson(raw: PriceChartingRawJson): TranslatedComicPricing {
  const rawBid = centsToUsd(raw["retail-loose-buy"]);
  const rawAsk = centsToUsd(raw["retail-loose-sell"]);
  const cibBid = centsToUsd(raw["retail-cib-buy"]);
  const cibAsk = centsToUsd(raw["retail-cib-sell"]);
  const newBid = centsToUsd(raw["retail-new-buy"]);
  const newAsk = centsToUsd(raw["retail-new-sell"]);

  const cleanSeries = (raw["console-name"] || "")
    .replace(/^Comic Books\s+/i, "")
    .trim();

  return {
    id: String(raw.id),
    productName: raw["product-name"] || "",
    series: cleanSeries,
    releaseDate: raw["release-date"] || null,
    salesVolumeYearly: Number(raw["sales-volume"]) || 0,
    upc: raw.upc || null,

    grades: {
      "10.0": centsToUsd(raw["bgs-10-price"]),
      "9.8": centsToUsd(raw["manual-only-price"]),
      "9.8_sell": centsToUsd(raw["condition-18-price"]),
      "9.6": centsToUsd(raw["condition-10-price"]),
      "9.4": centsToUsd(raw["condition-17-price"]),
      "9.2": centsToUsd(raw["box-only-price"]),
      "9.0": centsToUsd(raw["condition-16-price"]),
      "8.0": centsToUsd(raw["graded-price"]),
      "7.0": centsToUsd(raw["condition-15-price"]),
      "6.0": centsToUsd(raw["new-price"]),
      "5.0": centsToUsd(raw["condition-14-price"]),
      "4.0": centsToUsd(raw["cib-price"]),
      "3.0": centsToUsd(raw["condition-13-price"]),
      "2.0": centsToUsd(raw["condition-9-price"]),
      RAW: centsToUsd(raw["loose-price"]),
    },

    dealerQuotes: {
      raw: {
        bid: rawBid,
        ask: rawAsk,
        spreadPct: calcSpreadPct(rawBid, rawAsk),
      },
      grade4_0: {
        bid: cibBid,
        ask: cibAsk,
        spreadPct: calcSpreadPct(cibBid, cibAsk),
      },
      grade6_0: {
        bid: newBid,
        ask: newAsk,
        spreadPct: calcSpreadPct(newBid, newAsk),
      },
    },
  };
}

/**
 * Live fetch and translate directly from PriceCharting API
 */
export async function fetchLivePriceChartingProduct(productId: string | number): Promise<TranslatedComicPricing | null> {
  const token = process.env.PRICECHARTING_API_TOKEN || "c55ed4dcafdda6cad5e1c011a97696e1e0a285d5";
  const url = `https://www.pricecharting.com/api/product?t=${token}&id=${productId}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 }, // 5 min cache
    });
    if (!res.ok) return null;
    const raw: PriceChartingRawJson = await res.json();
    if (raw.status !== "success") return null;
    return translatePriceChartingJson(raw);
  } catch (err) {
    console.error(`[PriceChartingAPI] Failed to fetch product ${productId}:`, err);
    return null;
  }
}

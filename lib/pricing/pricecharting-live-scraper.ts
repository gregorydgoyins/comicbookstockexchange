import { normalizeGradeLabel } from './historical-chronology';

export interface LivePricePoint {
  observedAt: string;
  priceUsd: number;
  grade: string;
  source: string;
}

/**
 * Format series and issue into PriceCharting's canonical URL slug structure:
 * e.g. "Fantastic Four", "1", 1961 -> "fantastic-four-1-1961"
 * e.g. "Tales of Suspense", "39", 1963 -> "tales-of-suspense-39-1963"
 */
function toPriceChartingSlug(series: string, issue: string, year?: number | null): string {
  const cleanSeries = series
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanIssue = String(issue).trim();
  const yearSuffix = year ? `-${year}` : '';
  return `${cleanSeries}-${cleanIssue}${yearSuffix}`;
}

/**
 * PriceCharting category slugs:
 * e.g. "Fantastic Four" -> "comic-books-fantastic-four"
 */
function toPriceChartingCategory(series: string): string {
  const cleanSeries = series
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `comic-books-${cleanSeries}`;
}

// In-memory cache for live observations (TTL: 1 hour)
const liveTimelineCache = new Map<string, { timestamp: number; points: LivePricePoint[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Fetches authentic historical observations directly from PriceCharting's public 5-year timeline.
 * PriceCharting embeds 64 monthly observation points in `VGPC.chart_data` across tracks:
 * - manualonly: 9.8 / Sovereign Grade
 * - boxonly: 9.6 / Near Mint+
 * - graded: 9.0 / Very Fine/Near Mint
 * - new: 8.0 / Very Fine
 * - cib: 6.0 / Fine
 * - used: 2.0-4.0 / Good to Very Good (Raw / Loose)
 */
export async function fetchLivePriceChartingTimeline(
  series: string,
  issue: string,
  year?: number | null,
  sourceId?: string | number | null
): Promise<LivePricePoint[]> {
  const cacheKey = sourceId ? `id:${sourceId}` : `${series}:${issue}:${year || ''}`;

  const cached = liveTimelineCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.points;
  }

  // If sourceId is available, direct ID fetch is 100% reliable and avoids slug mismatch
  const targetUrl = sourceId
    ? `https://www.pricecharting.com/game/${sourceId}`
    : `https://www.pricecharting.com/game/${toPriceChartingCategory(series)}/${toPriceChartingSlug(series, issue, year)}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    const match = html.match(/VGPC\.chart_data\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
      return [];
    }

    const chartData = JSON.parse(match[1]) as Record<string, Array<[number, number]>>;
    const points: LivePricePoint[] = [];

    // Map PriceCharting condition tracks to comic industry standard grades:
    const trackMapping: Record<string, string> = {
      manualonly: '9.8',
      boxonly: '9.6',
      graded: '9.0',
      new: '8.0',
      cib: '6.0',
      used: '4.0',
    };

    for (const [track, gradeLabel] of Object.entries(trackMapping)) {
      const seriesPoints = chartData[track];
      if (!Array.isArray(seriesPoints)) continue;

      for (const [epochMs, priceCents] of seriesPoints) {
        if (!priceCents || priceCents <= 0) continue;
        const observedAt = new Date(epochMs).toISOString().slice(0, 10);
        const priceUsd = Number((priceCents / 100).toFixed(2));

        points.push({
          observedAt,
          priceUsd,
          grade: gradeLabel,
          source: 'PRICECHARTING_LONGITUDINAL',
        });
      }
    }

    // Sort observations chronologically
    points.sort((a, b) => a.observedAt.localeCompare(b.observedAt));

    liveTimelineCache.set(cacheKey, { timestamp: Date.now(), points });
    return points;
  } catch (err) {
    console.warn(`[PriceChartingLive] Failed to fetch timeline for ${series} #${issue} (ID: ${sourceId}):`, err);
    return [];
  }
}

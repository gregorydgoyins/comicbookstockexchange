import { NextResponse } from "next/server";
import { normalizeAuctionTitle, parseAndFilterListing } from "@/lib/sniper/anti-bullshit";
import { resolveAuthoritativePublisher } from "@/lib/comics/publisher-authority";
import { lookupSqliteCover, lookupSqliteGallery } from "@/lib/comics/sqlite-covers";
import { type GoCollectPrice } from "@/lib/sniper/gocollect-prices";
import type { GradeCensus } from "@/lib/sniper/census-population";
import { readLiveListings } from "@/lib/sniper/market-store";
import { RawAuctionListing } from "@/lib/sniper/types";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { dedupeSales, saleStats, seriesKey, type SaleObs } from "@/lib/sniper/candles";
import { gradeNum, benchmarkSalesForBook, resolveAuctionDbMetadata } from "@/lib/sniper/auction-metadata";


const RESP_TTL_MS = 30_000;
const respCache = new Map<string, { at: number; p: Promise<{ status: number; body: string }> }>();

export async function GET(request: Request) {
  const key = new URL(request.url).search;
  const hit = respCache.get(key);
  if (hit && Date.now() - hit.at < RESP_TTL_MS) {
    const r = await hit.p;
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "server-timing": lastTiming, "cache-control": r.status === 200 ? "public, s-maxage=30, stale-while-revalidate=120" : "no-store" } });
  }
  const p = computeGET(request).then(async (res) => { lastTiming = res.headers.get("server-timing") ?? ""; return { status: res.status, body: await res.text() }; });
  respCache.set(key, { at: Date.now(), p });
  p.then((r) => { if (r.status !== 200) respCache.delete(key); }).catch(() => respCache.delete(key));
  if (respCache.size > 50) respCache.delete(respCache.keys().next().value as string);
  const r = await p;
  return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "server-timing": lastTiming, "cache-control": r.status === 200 ? "public, s-maxage=30, stale-while-revalidate=120" : "no-store" } });
}

let lastTiming = "";
const SALES_TTL_MS = 5 * 60_000;
const salesCache = new Map<string, { at: number; map: Map<string, SaleObs[]> }>();

async function computeGET(request: Request) {
  const tStart = Date.now();
  const marks: string[] = [];
  const mark = (n: string, since: number) => marks.push(`${n};dur=${Date.now() - since}`);
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q");
  const sourceFilter = searchParams.get("source");
  const publisherFilter = searchParams.get("publisher");
  const angleFilter = searchParams.get("angle");
  const minGradeParam = searchParams.get("minGrade");
  const minGrade = minGradeParam ? parseFloat(minGradeParam) : 0.5;

  try {
    // Live auctions come from the Sniper store, populated by scheduled snapshots across ComicConnect, Metropolis, Hake's, and eBay.
    const tRead = Date.now();
    // Never trigger a venue collector from a user request. The scheduled
    // snapshot worker owns collection; an empty store is a valid fast response.
    const { items: stored, asOf } = await readLiveListings();
    mark("readListings", tRead);
    const combinedAuctions: RawAuctionListing[] = stored;
    const fetchedAtMs = Date.now(); // seconds remaining were computed from each lot's end time just now

    // 4. Apply dynamic filters if query parameters provided
    let filteredAuctions = combinedAuctions;

    // Filter by search query (title or series match)
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      filteredAuctions = filteredAuctions.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        (item.itemDescription && item.itemDescription.toLowerCase().includes(q))
      );
    }

    // Filter by source (e.g. heritage, mycomicshop, comicconnect, atomicavenue)
    if (sourceFilter && sourceFilter.trim().length > 0) {
      const src = sourceFilter.toLowerCase().trim();
      filteredAuctions = filteredAuctions.filter((item) => item.source.toLowerCase() === src);
    }

    // Filter by publisher (e.g. dc, marvel, image, dark horse, kodansha, viz, lev gleason)
    if (publisherFilter && publisherFilter.trim().length > 0) {
      const pub = publisherFilter.toLowerCase().trim();
      filteredAuctions = filteredAuctions.filter((item) => {
        const itemPub = (item.gcdMetadata?.publisher || "").toLowerCase();
        return itemPub.includes(pub) || item.title.toLowerCase().includes(pub);
      });
    }

    // Filter by special strategy angle
    if (angleFilter && angleFilter.trim().length > 0) {
      const angle = angleFilter.toLowerCase().trim();
      if (angle === "cracked_case" || angle === "reholder") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /crack|scuff|reholder|damaged|shell/i.test(item.title) ||
          /crack|scuff|reholder|damaged|shell/i.test(item.itemDescription || "")
        );
      } else if (angle === "typo" || angle === "misspelled") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /spidre|avenegr|batamn|wovlerine|thng|fantatsic|punsiher|catwman|daredevl/i.test(item.title)
        );
      } else if (angle === "manga") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /akira|dragon ball|one piece|ghost in the shell|nausica[aä]|naruto|bleach|manga/i.test(item.title)
        );
      } else if (angle === "cpv") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /canadian|cpv|75¢|95¢|\$1\.00|alpha flight|captain canuck/i.test(item.title)
        );
      } else if (angle === "foreign") {
        filteredAuctions = filteredAuctions.filter((item) =>
          item.source.includes("ebay_") ||
          /\b(?:french|german|uk\s*edition|editions?\s*lug|special\s*strange|semic|2000\s*ad|captain\s*britain|topolino)\b/i.test(item.title)
        );
      } else if (angle === "placeholder_85") {
        filteredAuctions = filteredAuctions.filter((item) =>
          item.resolvedGrade !== undefined && item.resolvedGrade <= 9.2 && item.resolvedGrade >= 8.5
        );
      }
    }

    // Filter by minimum grade (only if explicitly specified)
    if (minGradeParam && !isNaN(minGrade) && minGrade > 0.5) {
      filteredAuctions = filteredAuctions.filter((item) => {
        if (item.resolvedGrade !== undefined) {
          return item.resolvedGrade >= minGrade;
        }
        const parsed = parseAndFilterListing(item.title);
        return parsed.grade != null && parsed.grade >= minGrade;
      });
    }

    // Filter by listing type (auctions vs buy it now)
    const typeParam = searchParams.get("type");
    if (typeParam === "bin" || typeParam === "buy_it_now") {
      filteredAuctions = filteredAuctions.filter((item) =>
        Boolean(item.isBuyItNow || item.listingType === "BuyItNow")
      );
    } else if (typeParam === "auction" || typeParam === "auctions") {
      filteredAuctions = filteredAuctions.filter((item) =>
        !item.isBuyItNow && item.listingType !== "BuyItNow"
      );
    }

    if (filteredAuctions.length > 0) {
      const tSales = Date.now();
      const salesBySeriesKey = new Map<string, SaleObs[]>();
      try {
        const keys = Array.from(
          new Set(
            filteredAuctions
              .map((it) => {
                const p = parseAndFilterListing(String(it.title || ""));
                return p.extractedSeries && p.extractedSeries !== "Unknown Series"
                  ? seriesKey(p.extractedSeries, p.extractedIssue || "1")
                  : null;
              })
              .filter((k): k is string => Boolean(k))
          )
        );
        const salesCacheKey = keys.slice().sort().join("|");
        const cachedSales = salesCache.get(salesCacheKey);
        if (cachedSales && Date.now() - cachedSales.at < SALES_TTL_MS) {
          for (const [k, v] of cachedSales.map) salesBySeriesKey.set(k, v);
        } else if (keys.length > 0) {
          const db: any = createAdminServerClient();
          const keyChunks: string[][] = [];
          for (let i = 0; i < keys.length; i += 100) {
            keyChunks.push(keys.slice(i, i + 100));
          }
          const [sChunkResults, { data: gRows }] = await Promise.all([
            Promise.all(
              keyChunks.map((chunk) =>
                db
                  .from("sniper_sales")
                  .select("series_key,sold_at,price_usd,grade,venue,source,confirmed,url")
                  .in("series_key", chunk)
                  .limit(1000)
              )
            ),
            db
              .from("graded_sales_observations")
              .select("title_name,issue_number_raw,sale_price,sale_date,grade_numeric,native_grade_text,venue,evidence_path,currency")
              .gt("sale_price", 0)
              .not("sale_date", "is", null)
              .limit(1000),
          ]);
          for (const res of sChunkResults) {
            for (const s of res?.data ?? []) {
              const list = salesBySeriesKey.get(s.series_key) ?? [];
              list.push({
                date: s.sold_at,
                price: Number(s.price_usd),
                grade: s.grade != null ? Number(s.grade) : null,
                venue: s.venue,
                source: s.source,
                confirmed: !!s.confirmed,
                url: s.url ?? undefined,
              });
              salesBySeriesKey.set(s.series_key, list);
            }
          }
          for (const g of gRows ?? []) {
            if (g.currency && g.currency !== "USD") continue;
            const k = seriesKey(String(g.title_name || ""), String(g.issue_number_raw || "1"));
            if (!k) continue;
            const list = salesBySeriesKey.get(k) ?? [];
            list.push({
              date: String(g.sale_date),
              price: Number(g.sale_price),
              grade: g.grade_numeric != null ? Number(g.grade_numeric) : gradeNum(g.native_grade_text),
              venue: g.venue || "graded register",
              source: "graded_sales_observations",
              confirmed: true,
              url: g.evidence_path ?? undefined,
            });
            salesBySeriesKey.set(k, list);
          }
          salesCache.set(salesCacheKey, { at: Date.now(), map: new Map(salesBySeriesKey) });
          if (salesCache.size > 20) salesCache.delete(salesCache.keys().next().value as string);
        }
      } catch {}
      mark("salesQueries", tSales);

      const cleanGraderNotes = (raw?: string | null): string | undefined => {
        if (!raw) return undefined;
        const cleaned = raw
          .replace(/A\s+15%\s+BUYER'?S\s+PREMIUM\s*\(MINIMUM\s*\$19\.00\)\s*WILL\s+BE\s+ADDED\s+TO\s+THIS\s+ITEM\s+AT\s+CONCLUSION\s+OF\s+THE\s+AUCTION\.?/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        return cleaned.length > 0 ? cleaned : undefined;
      };

      // Enrichment is performed by scheduled workers, never in this request.
      // Preserve already captured census and price data on each listing.
      const censusByItem = new Map<unknown, GradeCensus | null>(
        filteredAuctions.map((item) => [item, item.censusValue ?? null] as const),
      );
      const gcByItem = new Map<unknown, GoCollectPrice | null>(
        filteredAuctions.map((item) => [item, item.gocollectPrice ?? null] as const),
      );

      const updatedAuctions = filteredAuctions.map((item) => {
        const isBin = Boolean(item.isBuyItNow || item.listingType === "BuyItNow" || (item.buyItNowPrice && item.buyItNowPrice > 0));

        // Real time remaining: venue's end time as of the fetch, minus the time since the fetch. No simulated cycle.
        // Buy It Now listings have no end time; 86400 is a placeholder the page does not display.
        const secs = isBin ? 86400 : Math.max(0, Math.round(Number(item.secondsRemaining ?? 0) - (Date.now() - fetchedAtMs) / 1000));

        const rawTitle = String(item.title || "");
        const cleanTitle = normalizeAuctionTitle(rawTitle);
        const formatTimeStr = (s: number) => {
          if (s <= 0) return "Ending now";
          if (s < 60) return `${s}s left`;
          const m = Math.floor(s / 60);
          const remSecs = s % 60;
          if (m < 60) return `${m}m ${remSecs > 0 ? remSecs + "s " : ""}left`;
          const h = Math.floor(m / 60);
          return `${h}h ${m % 60}m left`;
        };

        const parsed = parseAndFilterListing(rawTitle);
        const effectiveGrade = item.resolvedGrade ?? parsed.grade ?? undefined;
        const sKey = parsed.extractedSeries && parsed.extractedSeries !== "Unknown Series"
          ? seriesKey(parsed.extractedSeries, parsed.extractedIssue || "1")
          : "";
        const dbMeta = resolveAuctionDbMetadata(rawTitle, effectiveGrade, sKey ? salesBySeriesKey.get(sKey) : undefined);
        const resolvedFmv = dbMeta.fmv ?? ((item.anchorFmv && item.anchorFmv > 0)
          ? item.anchorFmv
          : (item.fairMarketValue && item.fairMarketValue > 0)
            ? item.fairMarketValue
            : undefined);

        const resolvedPub = dbMeta.publisher || item.gcdMetadata?.publisher || undefined;

        const realTimeBid = Number(item.currentBid || 0);
        const realTimeBidCount = Number(item.bidCount ?? 0);

        const catalogCover = item.imageUrl ? "" : (lookupSqliteCover(parsed.extractedSeries, parsed.extractedIssue) || "");
        const resolvedCover = item.imageUrl || catalogCover;

        const normalizeUrl = (u: string): string => {
          if (!u) return "";
          let curr = u.trim();
          while (curr.includes("%25")) {
            try { curr = decodeURI(curr); } catch { break; }
          }
          try { return encodeURI(decodeURI(curr)); } catch { return curr; }
        };

        const safeCoverUrl = normalizeUrl(resolvedCover);

        const galleryList: string[] = [];
        const seenUrls = new Set<string>();
        const addGallery = (u?: string | null) => {
          if (!u) return;
          const norm = normalizeUrl(u);
          if (norm && !seenUrls.has(norm)) {
            seenUrls.add(norm);
            galleryList.push(norm);
          }
        };

        addGallery(safeCoverUrl);
        if (item.galleryImages && Array.isArray(item.galleryImages)) {
          for (const img of item.galleryImages) addGallery(img);
        }
        if (!item.imageUrl && catalogCover) {
          addGallery(catalogCover);
          for (const img of lookupSqliteGallery(parsed.extractedSeries, parsed.extractedIssue)) addGallery(img);
        }

        // Census is exact per-grade data from cgc_population. Not found = undefined (shown as unavailable).
        const gc = censusByItem.get(item) ?? null;
        const resolvedCensusTotal = gc?.total;
        const resolvedCensusHigher = gc?.higher;
        const resolvedCensus98 = gc?.atGrade;

        const cleanedNotes = cleanGraderNotes(item.graderNotes);
        const cleanedDesc = cleanGraderNotes(item.itemDescription);

        return {
          ...item,
          normalizedTitle: cleanTitle,
          graderNotes: cleanedNotes,
          itemDescription: cleanedDesc,
          year: dbMeta.year ?? item.year ?? parsed.extractedYear,
          era: dbMeta.era ?? item.era ?? parsed.extractedEra,
          imageUrl: safeCoverUrl,
          galleryImages: galleryList.length > 0 ? galleryList : [safeCoverUrl],
          currentBid: isBin ? (item.buyItNowPrice ?? item.currentBid) : realTimeBid,
          bidCount: isBin ? 0 : realTimeBidCount,
          secondsRemaining: secs,
          timeLeftStr: isBin ? "Buy It Now · Available" : formatTimeStr(secs),
          anchorFmv: resolvedFmv,
          fairMarketValue: resolvedFmv,
          historicalComps: dbMeta.historicalComps.length > 0 ? dbMeta.historicalComps : item.historicalComps,
          pricingSourceProvenance: dbMeta.pricingSourceProvenance ?? item.pricingSourceProvenance ?? undefined,
          censusTotal: resolvedCensusTotal,
          censusHigher: resolvedCensusHigher,
          censusCount98: resolvedCensus98,
          gocollectPrice: gcByItem.get(item) ?? undefined,
          listingType: isBin ? "BuyItNow" : "Auction",
          isBuyItNow: isBin,
          buyItNowPrice: isBin ? (item.buyItNowPrice ?? item.currentBid) : undefined,
          gcdMetadata: {
            ...item.gcdMetadata,
            publisher: resolvedPub,
          },
        };
      });

      const liveAuctions = updatedAuctions.filter((a) => a.secondsRemaining > 0 && Boolean(a.imageUrl));
      const activeVenues = Array.from(new Set(liveAuctions.map((a) => a.source)));
      return NextResponse.json({
        success: true,
        count: liveAuctions.length,
        auctions: liveAuctions,
        venues: activeVenues,
        source: "ebay_browse_api",
        dataAsOf: asOf,
        fetchedAt: new Date().toISOString(),
      }, { headers: { "server-timing": [...marks, `total;dur=${Date.now() - tStart}`].join(", ") } });
    }

    return NextResponse.json({
      success: true,
      count: 0,
      auctions: [],
      venues: [],
      source: "ebay_browse_api",
      dataAsOf: asOf,
      message: asOf
        ? "No live eBay listings match the active filters."
        : "No eBay listings are stored yet. The snapshot job has not completed a run; check /api/sniper/status.",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Live auctions route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message || "Failed to load live auctions",
        auctions: [],
      },
      { status: 500 }
    );
  }
}

/**
 * scripts/ingest_all_news.ts
 *
 * Comprehensive High-Volume Ingestion Engine for Panel Profits.
 * Ingests from:
 * 1. 403 Curated & Industry RSS/Atom Feeds (Primary, Curated Channels, Extended Sources)
 * 2. 5 Multi-Wire APIs (NewsData, Perigon, TheNewsAPI, AskNews, NewsAPI)
 *
 * Filters using precision comic relevance gates and deduplicates syndicated wire clones.
 * Persists directly into Supabase public.pp_news_stories.
 */

import { SOURCES, fetchFeedSource, deduplicateNewsStories, type NewsStory } from "../lib/news/feed";
import { fetchAllWireStories } from "../lib/news/wire-apis";
import { isRelevantComicStory, evaluateArticleQuality } from "../lib/news/self-healing";
import { createAdminServerClient } from "../lib/supabase/admin";

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        const val = await fn(items[index]);
        results[index] = { status: "fulfilled", value: val };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export async function runFullNewsIngest() {
  console.log("=== STARTING COMPREHENSIVE NEWS & LORE INGESTION ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Total Curated Feeds to poll: ${SOURCES.length}`);

  const startTime = Date.now();

  // 1. Fetch all 403 syndicated RSS/Atom channels with 30-worker concurrency
  console.log("\n[1/3] Polling 403 RSS/Atom channels concurrently...");
  const feedBatches = await mapConcurrent(SOURCES, 30, fetchFeedSource);
  const rssRows = feedBatches.flatMap((res) => (res.status === "fulfilled" ? res.value : []));
  console.log(`[1/3] Completed RSS fetch: retrieved ${rssRows.length} relevant items across channels.`);

  // 2. Fetch Multi-Wire APIs
  console.log("\n[2/3] Polling Multi-Wire APIs (NewsData, Perigon, TheNewsAPI, AskNews, NewsAPI)...");
  let wireRows: any[] = [];
  try {
    wireRows = await fetchAllWireStories();
    console.log(`[2/3] Completed Wire APIs fetch: retrieved ${wireRows.length} wire items.`);
  } catch (err) {
    console.error("[2/3] Wire API fetch encountered error:", err);
  }

  // 3. Unify, filter, and topic-deduplicate
  console.log("\n[3/3] Deduplicating and gating raw items...");
  const allRaw = [...rssRows, ...wireRows];
  console.log(`Total combined candidates: ${allRaw.length}`);

  // Story key exact dedup map first
  const exactMap = new Map<string, (typeof allRaw)[0]>();
  for (const item of allRaw) {
    if (!exactMap.has(item.story_key)) {
      exactMap.set(item.story_key, item);
    }
  }

  const distinctKeyRows = Array.from(exactMap.values());
  console.log(`Distinct exact keys: ${distinctKeyRows.length}`);

  // Topic-level deduplication to collapse syndicated clones
  const pseudoStories: NewsStory[] = distinctKeyRows.map((r, i) => ({
    id: `temp-${i}`,
    source: r.source,
    sourceUrl: r.source_url,
    category: r.category,
    headline: r.headline,
    author: r.author,
    summary: r.summary,
    url: r.url,
    imageUrl: r.image_url,
    publishedAt: r.published_at,
    ingestedAt: new Date().toISOString(),
    archivedAt: null,
  }));

  const dedupedStories = deduplicateNewsStories(pseudoStories);
  console.log(`Unique distinct story topics after deduplication: ${dedupedStories.length}`);

  // Map back to database insert rows
  const dedupedUrls = new Set(dedupedStories.map((s) => s.url));
  const rowsToInsert = distinctKeyRows
    .filter((r) => dedupedUrls.has(r.url))
    .map((r) => ({
      story_key: r.story_key,
      source: r.source,
      source_url: r.source_url,
      category: r.category,
      headline: r.headline,
      author: r.author,
      summary: r.summary,
      url: r.url,
      image_url: r.image_url,
      published_at: r.published_at,
      ingested_at: new Date().toISOString(),
      archived_at: null,
    }));

  console.log(`Final validated payload to upsert into Supabase: ${rowsToInsert.length}`);

  let inserted = 0;
  let updated = 0;
  let errorCount = 0;
  let finalTotal = 0;

  // Resilient persistence engine: Try direct Postgres connection, fallback to Supabase HTTPS REST API
  let pgClient: any = null;
  const DIRECT_URL =
    process.env.CLEAN_DATABASE_URL ||
    process.env.SUPABASE_DIRECT_URL ||
    process.env.DATABASE_URL;

  if (DIRECT_URL) {
    try {
      const { Client: PgClient } = await import("pg");
      const candidatePg = new PgClient({
        connectionString: DIRECT_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3500,
      });
      await candidatePg.connect();
      pgClient = candidatePg;
      console.log("[Ingestion] Connected via direct Postgres client.");
    } catch (err: any) {
      console.warn(`[Ingestion] Direct Postgres connection unavailable (${err.message}). Seamlessly switching to Supabase HTTPS client.`);
    }
  }

  if (pgClient) {
    try {
      for (const r of rowsToInsert) {
        try {
          const res = await pgClient.query(
            `INSERT INTO public.pp_news_stories (
              story_key, source, source_url, category, headline, summary,
              url, image_url, published_at, ingested_at, author
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)
            ON CONFLICT (story_key) DO UPDATE SET
              summary = COALESCE(EXCLUDED.summary, public.pp_news_stories.summary),
              image_url = COALESCE(EXCLUDED.image_url, public.pp_news_stories.image_url),
              author = COALESCE(EXCLUDED.author, public.pp_news_stories.author),
              ingested_at = now()
            RETURNING (xmax = 0) AS is_insert;`,
            [
              r.story_key,
              r.source,
              r.source_url,
              r.category,
              r.headline,
              r.summary,
              r.url,
              r.image_url,
              r.published_at,
              r.author,
            ]
          );
          if (res.rows[0]?.is_insert) {
            inserted++;
          } else {
            updated++;
          }
        } catch {
          errorCount++;
        }
      }

      const totalCountRes = await pgClient.query("SELECT count(*) FROM public.pp_news_stories WHERE archived_at IS NULL;");
      finalTotal = Number(totalCountRes.rows[0]?.count) || 0;
    } finally {
      await pgClient.end();
    }
  } else {
    // Cloud-native HTTPS REST API fallback (dual-stack IPv4/IPv6 compatible)
    console.log("[Ingestion] Persisting records via Supabase HTTPS REST API in batches of 50...");
    const supabase = createAdminServerClient();
    const BATCH_SIZE = 50;

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const chunk = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from("pp_news_stories")
        .upsert(chunk, { onConflict: "story_key" })
        .select("story_key");

      if (error) {
        console.warn(`[Ingestion] Batch ${i / BATCH_SIZE + 1} upsert warning:`, error.message);
        errorCount += chunk.length;
      } else {
        inserted += data?.length ?? chunk.length;
      }
    }

    const { count } = await supabase
      .from("pp_news_stories")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null);
    finalTotal = count || 0;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n=== COMPREHENSIVE INGESTION COMPLETE ===");
  console.log(`Elapsed time: ${durationSec}s`);
  console.log(`RSS items: ${rssRows.length}`);
  console.log(`Upserted stories: newly inserted ${inserted}, updated ${updated} (errors: ${errorCount})`);
  console.log(`Total active stories in pp_news_stories: ${finalTotal}`);
}

if (process.argv[1]?.endsWith("ingest_all_news.ts")) {
  runFullNewsIngest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal ingest error:", err);
      process.exit(1);
    });
}

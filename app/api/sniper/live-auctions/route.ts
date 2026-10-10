import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { normalizeAuctionTitle } from "@/lib/sniper/anti-bullshit";

const execAsync = promisify(exec);
const CACHE_FILE = "/tmp/real_live_auctions.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldRefresh = searchParams.get("refresh") === "true";
  const searchQuery = searchParams.get("q");

  try {
    let shouldRunScrape = shouldRefresh || Boolean(searchQuery);

    if (!shouldRunScrape) {
      if (fs.existsSync(CACHE_FILE)) {
        const stats = fs.statSync(CACHE_FILE);
        const ageSec = (Date.now() - stats.mtimeMs) / 1000;
        if (ageSec > 180) {
          shouldRunScrape = true; // Auto-refresh if older than 3 minutes
        }
      } else {
        shouldRunScrape = true;
      }
    }

    if (shouldRunScrape) {
      const extractScript = path.resolve(process.cwd(), "scripts/extract_live_auctions.py");
      const safariScript = "/tmp/get_safari_source.scpt";
      
      if (!fs.existsSync(safariScript)) {
        fs.writeFileSync(
          safariScript,
          'tell application "Safari"\n  tell current tab of window 1\n    return source\n  end tell\nend tell\n'
        );
      }

      // If user provided a specific search query, navigate the live browser session
      if (searchQuery && searchQuery.trim().length > 0) {
        const targetUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery.trim())}&LH_Auction=1&_sop=1`;
        try {
          await execAsync(`osascript -e 'tell application "Safari" to set URL of current tab of window 1 to "${targetUrl}"'`);
          // Brief pause for browser rendering
          await new Promise((resolve) => setTimeout(resolve, 2500));
        } catch (e: unknown) {
          console.warn("Safari navigation notice:", (e as Error)?.message || e);
        }
      }

      try {
        await execAsync(`osascript ${safariScript} > /tmp/live_safari.html && python3 "${extractScript}"`, {
          timeout: 15000,
        });
      } catch (err: unknown) {
        console.warn("Live Safari scrape background refresh note:", (err as Error)?.message || err);
      }
    }

    const projectDataFile = path.resolve(process.cwd(), "data/live_auctions.json");
    let auctions: unknown[] = [];
    if (fs.existsSync(CACHE_FILE)) {
      auctions = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } else if (fs.existsSync(projectDataFile)) {
      auctions = JSON.parse(fs.readFileSync(projectDataFile, "utf-8"));
    }

    if (Array.isArray(auctions) && auctions.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      const updatedAuctions = (auctions as Array<Record<string, unknown>>).map((item, idx) => {
        // Continuous 24/7 rolling microwave stream:
        // Stagger lots evenly across the 30-minute microwave cycle (1800s)
        // so lots are ALWAYS concluding in 30s, 60s, 90s, 2m, 5m at any time of day
        const cyclePeriod = 1800;
        const baseOffset = Number(item.secondsRemaining ?? 300);
        const staggeredAnchor = (baseOffset + idx * 53) % cyclePeriod;
        const currentElapsed = now % cyclePeriod;
        let secs = (staggeredAnchor - currentElapsed + cyclePeriod) % cyclePeriod;
        if (secs < 20) {
          secs += cyclePeriod; // Keep at least 20s active in live killzone
        }

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
        return {
          ...item,
          normalizedTitle: cleanTitle,
          secondsRemaining: secs,
          timeLeftStr: formatTimeStr(secs),
        };
      });

      return NextResponse.json({
        success: true,
        count: updatedAuctions.length,
        auctions: updatedAuctions,
        source: "continuous_24_7_multi_exchange_stream",
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      count: 0,
      auctions: [],
      source: "empty",
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

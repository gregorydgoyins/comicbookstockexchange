import Link from "next/link";
import Image from "next/image";
import { SystemClock } from "./system-clock";
import { PrimaryNav } from "./primary-nav";
import { PlayerSettings } from "./player-settings";
import { MarketClocks } from "./market-clocks";
import { HeaderAuth, HeaderOperatorBadge } from "./header-auth";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090A0E]/95 backdrop-blur-md">
      {/* Top Compact Identity Row */}
      <div className="border-b border-slate-800/50 px-4 py-1.5 bg-[#06070A]">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/brand/panel-profits-mark.svg" alt="ComicBookStockExchange.com" width={28} height={28} className="h-7 w-7 shrink-0" priority />
            <div className="flex items-center gap-1.5 text-[11px] tracking-wider">
              <span className="text-slate-100 font-bold uppercase tracking-wider">COMICBOOKSTOCKEXCHANGE.COM</span>
              <span className="text-slate-600">·</span>
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest hidden sm:inline">
                AUTONOMOUS COMIC EQUITY EXCHANGE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <SystemClock />
            <PlayerSettings />
            <Link
              href="/sniper"
              className="flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider text-amber-400 bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-900/60 transition-colors"
              title="Private Owner Desk: Collector Deal Radar & Microwave Sniper"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DEAL RADAR</span>
            </Link>
            <HeaderOperatorBadge />
          </div>
        </div>
      </div>

      <MarketClocks />

      <div className="px-4">
        <div className="flex min-h-12 w-full items-center justify-between gap-4">
          <PrimaryNav />

          {/* Right Action: Account or Sign In */}
          <div className="flex items-center gap-2">
            <HeaderAuth />
          </div>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { Database, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#07080B] py-6 text-xs text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-600 text-[8px] font-bold text-white">
              CBSE
            </span>
            <span className="text-slate-200 uppercase tracking-wider font-bold">COMICBOOKSTOCKEXCHANGE.COM</span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] text-slate-400">AUTONOMOUS COMIC EQUITY EXCHANGE &amp; VALUATION CLEARINGHOUSE</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 text-[11px] text-slate-400">
            <Link href="/" className="hover:text-slate-200 transition-colors">DASHBOARD</Link>
            <Link href="/market" className="hover:text-slate-200 transition-colors">MARKETS</Link>
            <Link href="/equities" className="hover:text-slate-200 transition-colors">EQUITIES</Link>
            <Link href="/comics" className="hover:text-slate-200 transition-colors">CATALOG</Link>
            <Link href="/wiki" className="hover:text-slate-200 transition-colors">ENCYCLOPEDIA</Link>
            <Link href="/lexicon" className="hover:text-slate-200 transition-colors">LEXICON</Link>
            <Link href="/news" className="hover:text-slate-200 transition-colors">INTELLIGENCE</Link>
            <Link href="/collection" className="hover:text-slate-200 transition-colors">PORTFOLIO</Link>
            <Link href="/watchlist" className="hover:text-slate-200 transition-colors">WATCHLIST</Link>
          </div>
        </div>

        <div className="border-t border-slate-800/40 pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-emerald-400" />
            <span>OPERATIONAL DATABASE: PANEL PROFITS CLEAN (3,481,445 CANONICAL RECORDS)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-purple-400" />
            <span>PROVENANCE: PANEL PROFITS · COMICBASE · GRAND COMICS DATABASE</span>
          </div>
          <div>
            <span>TYPOGRAPHY: HIND 300 CANON</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

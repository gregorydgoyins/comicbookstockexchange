'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Newspaper, TrendingUp, BarChart2, Activity, Bookmark, BookmarkCheck, X } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { GradePrice, HistoryEntry } from './types';
import { fmt, GRADE_ORDER } from './shared';
import { classifyNewsItem, scoreNewsItem, buildKeywords, getSourceColor, normalizeNewsRow, type RawNewsRow, type ScoredNewsItem as NewsItem } from './newsUtils';
import { useWatchlist } from '@/hooks/useWatchlist';
import { buildEquityUrl } from '@/lib/urlBuilder';

interface CensusSummary {
  totalGraded: number;
  highGradeCount: number;
  snapshotDate: string;
  histogram: { grade: string; count: number }[];
}

interface KeyPrices {
  fmv98Usd: number;
  fmv10Usd: number;
  fmvRawUsd: number;
  sovPriceUsd: number;
  sovGrade: string | null;
  premiumPct: number | null;
  gradeCount: number;
  observedAt: string | null;
  anchor9_8: number;
  display_fmv_usd: number | null;
  display_grade: string | null;
  delta24h?: number | null;
}


export default function DetailSidebar({
  variantId,
  workName,
  era,
  publisher,
  creatorNames = [],
  eraColors,
  keyPrices,
  gradeLattice,
  priceHistory,
  censusSummary,
  detailUrl,
  onOpenExecModal,
  hasQuote = false,
  tradeConfirmation = null,
  showNewsFeed = false,
  showWatchlistCard = false,
  showQuickActions = false,
}: {
  variantId?: string;
  workName: string;
  era?: string;
  publisher: string;
  creatorNames?: string[];
  eraColors: ReturnType<typeof getEraColors>;
  keyPrices: KeyPrices;
  gradeLattice: GradePrice[];
  priceHistory: HistoryEntry[];
  censusSummary: CensusSummary | null | undefined;
  detailUrl?: string;
  onOpenExecModal?: (action: 'buy' | 'sell') => void;
  hasQuote?: boolean;
  tradeConfirmation?: { action: 'buy' | 'sell'; id: number } | null;
  showNewsFeed?: boolean;
  showWatchlistCard?: boolean;
  showQuickActions?: boolean;
}) {
  const accent = eraColors.border;
  const { entries: watchlist, isWatching, toggleWatchlist } = useWatchlist();

  const currentIsWatched = variantId ? isWatching(variantId) : false;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastAction, setToastAction] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    if (!tradeConfirmation) return;
    setToastAction(tradeConfirmation.action);
    setToastVisible(true);
    const timer = setTimeout(() => setToastVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [tradeConfirmation?.id]);

  const { data: newsData } = useQuery<{ success: boolean; data: RawNewsRow[]; count: number }>({
    queryKey: ['news-latest'],
    queryFn: async () => {
      const res = await fetch('/api/news/latest');
      if (!res.ok) return { success: false, data: [], count: 0 };
      return res.json();
    },
    staleTime: 120000,
  });

  const newsItems: NewsItem[] = (newsData?.data ?? [] as RawNewsRow[]).map(normalizeNewsRow);

  const baseKeywords = useMemo(() => buildKeywords(workName, publisher), [workName, publisher]);
  const topNews = useMemo(() => {
    const scored = newsItems.map(item => ({ item, score: scoreNewsItem(item, baseKeywords, creatorNames) })).sort((a, b) => b.score - a.score);
    const relevant = scored.filter(s => s.score > 0).slice(0, 5);
    const fill = scored.filter(s => s.score === 0).slice(0, Math.max(0, 5 - relevant.length));
    return [...relevant, ...fill].slice(0, 5);
  }, [newsItems, baseKeywords, creatorNames]);

  const sortedGrades = useMemo(() =>
    [...gradeLattice]
      .sort((a, b) => {
        const ai = GRADE_ORDER.indexOf(a.grade), bi = GRADE_ORDER.indexOf(b.grade);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .filter(g => g.priceUsd > 0)
      .slice(0, 8),
    [gradeLattice]
  );

  const priceMomentum = useMemo(() => {
    if (priceHistory.length < 4) return null;
    const sorted = [...priceHistory].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    const recent = sorted.slice(-4);
    const older = sorted.slice(0, Math.max(1, sorted.length - 4));
    const recentAvg = recent.reduce((s, h) => s + h.priceUsd, 0) / recent.length;
    const olderAvg = older.reduce((s, h) => s + h.priceUsd, 0) / older.length;
    if (olderAvg === 0) return null;
    const pct = ((recentAvg - olderAvg) / olderAvg) * 100;
    if (pct >= 5) return { pct, color: '#4ade80', arrow: '↑' };
    if (pct <= -5) return { pct, color: '#f87171', arrow: '↓' };
    return { pct, color: '#fbbf24', arrow: '→' };
  }, [priceHistory]);

  const maxGradePrice = sortedGrades[0]?.priceUsd ?? 0;

  const sectionHead = (label: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-2 mb-2.5 pb-2" style={{ borderBottom: `1px solid ${accent}30` }}>
      <span style={{ color: accent }}>{icon}</span>
      <span
        className="text-xs uppercase tracking-widest font-semibold font-sans text-slate-200"
        style={{ letterSpacing: '0.12em' }}
      >
        {label}
      </span>
    </div>
  );

  const card = (children: React.ReactNode) => (
    <div
      className="rounded-xl border border-white/10 bg-[#0a0f1d]/85 backdrop-blur-md shadow-md p-3.5 sm:p-4"
      style={{
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">

      {/* ── WATCHLIST ── */}
      {showWatchlistCard && variantId && card(
        <>
          {sectionHead('Watchlist', currentIsWatched ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />)}

          {/* Add / Remove current equity */}
          <button
            onClick={() => toggleWatchlist({
              id: variantId,
              workName,
              era,
              fmvUsd: keyPrices.display_fmv_usd ?? keyPrices.fmv98Usd ?? undefined,
              delta24h: keyPrices.delta24h,
              pinnedAt: new Date().toISOString(),
            })}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg cursor-pointer text-xs uppercase tracking-wider font-semibold font-sans transition-all duration-200 hover:scale-[1.01]"
            style={{
              border: currentIsWatched ? '1px solid rgba(250,204,21,0.5)' : `1px solid ${accent}40`,
              backgroundColor: currentIsWatched ? 'rgba(250,204,21,0.12)' : `${accent}15`,
              color: currentIsWatched ? '#facc15' : accent,
              boxShadow: currentIsWatched ? '0 0 12px rgba(250,204,21,0.2)' : 'none',
            }}
          >
            {currentIsWatched
              ? <><BookmarkCheck className="w-3.5 h-3.5" /> Watching</>
              : <><Bookmark className="w-3.5 h-3.5" /> Add to Watchlist</>}
          </button>

          {/* Watchlist items */}
          {watchlist.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2.5">
              {watchlist.map((entry) => {
                const isCurrent = entry.id === variantId;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                    style={{
                      backgroundColor: isCurrent ? `${accent}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isCurrent ? `${accent}40` : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Link
                      href={buildEquityUrl(entry.id)}
                      style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}
                    >
                      <div className="text-xs font-sans font-medium text-slate-200 truncate" style={{ color: isCurrent ? accent : undefined }}>
                        {entry.workName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.fmvUsd != null && entry.fmvUsd > 0 && (
                          <span className="text-xs font-mono font-bold" style={{ color: isCurrent ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                            {fmt(entry.fmvUsd)}
                          </span>
                        )}
                        {entry.delta24h != null && (
                          <span className="text-[10px] font-mono font-bold" style={{ color: entry.delta24h > 0 ? '#4ade80' : entry.delta24h < 0 ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                            {entry.delta24h > 0 ? '+' : ''}{entry.delta24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => toggleWatchlist(entry)}
                      title="Remove from watchlist"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── KEY PRICES ── */}
      {card(
        <>
          {sectionHead('Key Prices', <TrendingUp className="w-3.5 h-3.5" />)}
          <div className="flex flex-col gap-2">
            {/* SOV price — the confirmed sovereign price */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300 font-sans" style={{ letterSpacing: '0.06em' }}>
                SOV Price
              </span>
              <span className="text-sm font-bold font-mono" style={{ color: accent }}>
                {keyPrices.sovPriceUsd > 0 ? fmt(keyPrices.sovPriceUsd) : '—'}
              </span>
            </div>
            {/* 9.8 FMV — fair-market value at the sovereign grade */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300 font-sans" style={{ letterSpacing: '0.06em' }}>
                9.8 FMV
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {keyPrices.fmv98Usd > 0 ? fmt(keyPrices.fmv98Usd) : '—'}
              </span>
            </div>
            {/* RAW — ungraded baseline */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300 font-sans" style={{ letterSpacing: '0.06em' }}>
                RAW
              </span>
              <span className="text-sm font-bold font-mono text-slate-400">
                {keyPrices.fmvRawUsd > 0 ? fmt(keyPrices.fmvRawUsd) : '—'}
              </span>
            </div>
            {/* Delta 24h */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-sans" style={{ letterSpacing: '0.06em' }}>
                24h Δ
              </span>
              {keyPrices.delta24h != null ? (
                <span className={`text-xs font-bold font-mono ${keyPrices.delta24h > 0 ? 'text-emerald-400' : keyPrices.delta24h < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {keyPrices.delta24h > 0 ? '↑ +' : keyPrices.delta24h < 0 ? '↓ ' : ''}{keyPrices.delta24h.toFixed(2)}%
                </span>
              ) : priceMomentum ? (
                <span className="text-xs font-bold font-mono" style={{ color: priceMomentum.color }}>
                  {priceMomentum.arrow} {priceMomentum.pct > 0 ? '+' : ''}{priceMomentum.pct.toFixed(1)}%
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-500">—</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── QUICK ACTIONS ── */}
      {showQuickActions && onOpenExecModal && hasQuote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onOpenExecModal('buy')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg cursor-pointer text-xs font-sans font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 transition-all duration-200 hover:shadow-[0_0_22px_rgba(52,211,153,0.7)] hover:bg-emerald-500 hover:text-white hover:border-emerald-300 hover:scale-[1.02] select-none"
            >
              ▲ BUY
            </button>
            <button
              onClick={() => onOpenExecModal('sell')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg cursor-pointer text-xs font-sans font-bold uppercase tracking-widest text-rose-300 bg-rose-500/15 border border-rose-500/40 transition-all duration-200 hover:shadow-[0_0_22px_rgba(244,63,94,0.7)] hover:bg-rose-600 hover:text-white hover:border-rose-300 hover:scale-[1.02] select-none"
            >
              ▼ SELL
            </button>
          </div>

          {/* ── TRADE CONFIRMATION TOAST ── */}
          {toastVisible && (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: '4px',
                backgroundColor: toastAction === 'buy' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${toastAction === 'buy' ? 'rgba(74,222,128,0.30)' : 'rgba(248,113,113,0.30)'}`,
                animation: 'fadeIn 160ms ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: toastAction === 'buy' ? '#4ade80' : '#f87171',
                  boxShadow: `0 0 5px ${toastAction === 'buy' ? '#4ade80' : '#f87171'}`,
                }} />
                <span style={{
                  fontSize: '9px', fontFamily: 'Hind, sans-serif',
                  color: toastAction === 'buy' ? '#4ade80' : '#f87171',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {toastAction === 'buy' ? 'Buy' : 'Sell'} order acknowledged
                </span>
              </div>
              <button
                onClick={() => setToastVisible(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer',
                  border: 'none', background: 'none', padding: 0,
                  color: 'rgba(255,255,255,0.25)',
                  transition: 'color 120ms',
                }}
                className="pp-hover-color-muted"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── GRADE SPREAD MINI ── */}
      {sortedGrades.length > 0 && card(
        <>
          {sectionHead('Grade Spread', <BarChart2 className="w-3 h-3" />)}
          <div className="flex flex-col gap-0.5">
            {sortedGrades.map((g, idx) => {
              const isTop = g.grade === '9.8';
              const barW = maxGradePrice > 0 ? Math.min(100, Math.max(3, (g.priceUsd / maxGradePrice) * 100)) : 0;
              const hasVol = (g.salesVolume ?? 0) > 0;
              return (
                <div key={`${g.grade}-${idx}`} className="flex items-center gap-2 py-0.5">
                  <span style={{ fontSize: '9px', color: isTop ? accent : 'rgba(255,255,255,0.5)', fontFamily: 'monospace', width: '36px', flexShrink: 0 }}>
                    {g.grade === 'RAW' ? 'RAW' : g.grade}
                  </span>
                  <div className="flex-1 relative h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: `${barW}%`, backgroundColor: isTop ? accent : `${accent}50` }} />
                  </div>
                  <span style={{ fontSize: '10px', color: isTop ? '#fff' : 'rgba(255,255,255,0.65)', fontFamily: 'monospace', width: '60px', textAlign: 'right', flexShrink: 0 }}>
                    {fmt(g.priceUsd)}
                  </span>
                  <span style={{ fontSize: '8px', color: hasVol ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)', fontFamily: 'monospace', width: '24px', textAlign: 'right', flexShrink: 0 }}>
                    {hasVol ? `${g.salesVolume}` : '—'}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-end gap-3 mt-1 pt-1" style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
              <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.18)' }}>price · vol</span>
            </div>
          </div>
        </>
      )}

      {/* ── CENSUS SNAPSHOT ── */}
      {censusSummary && censusSummary.totalGraded > 0 && card(
        <>
          {sectionHead('Census Snapshot', <Activity className="w-3 h-3" />)}
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div style={{ fontSize: '20px', color: '#fff', fontFamily: 'monospace', lineHeight: 1 }}>
                {(censusSummary.totalGraded || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>total graded</div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: '16px', color: (censusSummary.highGradeCount || 0) > 0 ? '#f87171' : 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1 }}>
                {(censusSummary.highGradeCount || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>9.8+</div>
            </div>
          </div>
          {censusSummary.histogram && censusSummary.histogram.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {censusSummary.histogram.slice(0, 6).map((h, idx) => {
                const barW = censusSummary.totalGraded > 0 ? Math.min(100, Math.max(2, (h.count / censusSummary.totalGraded) * 100)) : 0;
                return (
                  <div key={`${h.grade}-${idx}`} className="flex items-center gap-2">
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', width: '28px', flexShrink: 0 }}>{h.grade}</span>
                    <div className="flex-1 relative h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: `${barW}%`, backgroundColor: `${accent}60` }} />
                    </div>
                    <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', width: '32px', textAlign: 'right', flexShrink: 0 }}>
                      {h.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {censusSummary.snapshotDate && (
            <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>
              CGC Universal + SS · {new Date(censusSummary.snapshotDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </>
      )}

      {/* ── NEWS HEADLINES (Opt-in to avoid duplicate feeds) ── */}
      {showNewsFeed && card(
        <>
          {sectionHead('Intelligence Feed', <Newspaper className="w-3 h-3" />)}
          {topNews.length === 0 ? (
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px 0' }}>No recent stories</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {topNews.map(({ item, score }) => {
                const cls = classifyNewsItem(item.title, item.summary ?? '');
                const sc = getSourceColor(item.source, accent);
                const pubDate = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <Link
                    key={item.id}
                    href={`/news/${encodeURIComponent(item.id)}`}
                    className="block rounded px-2 py-1.5 transition-colors pp-hover-bg-5"
                    style={{
                      textDecoration: 'none',
                      backgroundColor: score > 0 ? `${accent}08` : 'rgba(255,255,255,0.015)',
                      border: `1px solid ${score > 0 ? `${accent}25` : 'rgba(255,255,255,0.06)'}`,
                      borderLeft: `2px solid ${score > 0 ? `${accent}60` : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span style={{ fontSize: '7px', color: cls.color, backgroundColor: `${cls.color}18`, border: `1px solid ${cls.color}30`, borderRadius: '2px', padding: '0 3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {cls.type}
                      </span>
                      <span style={{ fontSize: '7px', color: sc, backgroundColor: `${sc}12`, border: `1px solid ${sc}28`, borderRadius: '2px', padding: '0 3px' }}>
                        {item.source}
                      </span>
                      {pubDate && <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{pubDate}</span>}
                    </div>
                    <p style={{ fontSize: '10px', color: score > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.42)', lineHeight: 1.35, margin: 0 }} className="line-clamp-2">
                      {item.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
          <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.18)', marginTop: 8 }}>
            AI-scored · tracking {workName} · refreshes every 2 min
          </p>
        </>
      )}

    </div>
  );
}

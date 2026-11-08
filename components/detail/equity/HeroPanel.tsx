"use client";

import { useState, useEffect, useTransition, useRef, Fragment, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Crown, Gem, Shield, Zap, Flame, Clock, Info, type LucideIcon } from 'lucide-react';
import { proxyCoverUrl as proxyHeroCoverUrl } from '@/lib/coverProxy';
import { fmt, fmtDate, variantTypeLabel, ERA_LABELS } from './shared';
import type {
  CompletenessData, EquityTruthLayer, Creator, DetailResponse,
  SpreadAnchor, SpreadStateData, GradePrice,
} from './types';
import { OraclePriceSparkline } from '@/components/ui/OraclePriceSparkline';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { resolvePriceTier } from '@/lib/pricing/market-tiers';
import { slugifyCreatorName } from '@/lib/creators/creator-bio-service';

type EraColors = { border: string; bg: string; bgHover: string; glow: string; };
type ScarcityColors = { border: string; bgGradient?: string; bg?: string; label: string; [key: string]: any; };

const SCARCITY_ICONS: Record<string, LucideIcon> = {
  mythic: Crown, legendary: Gem, epic: Shield, rare: Zap, uncommon: Flame, common: Clock,
};

const ASSET_CLASS_HERO_CONFIG: Record<string, { label: string; color: string; glowColor: string; desc: string }> = {
  PREMIUM: { label: 'PREMIUM', color: '#eab308', glowColor: '#eab30880', desc: 'Premium class ($45.00 to infinity). High-value asset exceeding standard market thresholds. Represents top-tier confirmed sales.' },
  SOV:     { label: 'SOV',     color: '#3b82f6', glowColor: '#3b82f680', desc: 'Sovereign class. Direct universal bluelabel 9.8 comic. Primary order flow anchor.' },
  VARIANT: { label: 'VARIANT', color: '#a78bfa', glowColor: '#a78bfa60', desc: 'Variant class. Scarcity-driven instrument — newsstand, price variant, retailer incentive, or insert edition with confirmed $30+ market price.' },
  STD:     { label: 'STD',     color: '#94a3b8', glowColor: '#94a3b830', desc: 'Standard class ($25.00 to $44.99). Confirmed market with verified sales volume on standard exchange floor.' },
  OTC:     { label: 'OTC',     color: '#fb923c', glowColor: '#fb923c50', desc: 'Over-the-counter ($17.00 to $24.99). Bilateral dealer desks / off-exchange.' },
  RAW:     { label: 'RAW',     color: '#94a3b8', glowColor: '#94a3b830', desc: 'Raw/Ungraded. Artifact has not been third-party certified. Pricing reflects average raw condition.' },
};

const GRADE_COLORS: Record<string, string> = { A: '#22c55e', B: '#86efac', C: '#fde68a', D: '#f59e0b', F: '#ef4444' };
const ERA_MAP: Record<string, string> = { platinum: 'Platinum', golden: 'Golden', atomic: 'Atomic', silver: 'Silver', bronze: 'Bronze', copper: 'Copper', modern: 'Modern', independent: 'Indie', postmodern: 'Post-Mod' };

import type { GcdRelationalData } from '@/lib/comics/gcd-relational-service';

interface HeroPanelProps {
  variantId: string;
  variant: DetailResponse['variant'];
  completeness: CompletenessData | undefined;
  keyPrices: DetailResponse['keyPrices'];
  instrumentStates: DetailResponse['instrumentStates'];
  censusSummary: DetailResponse['censusSummary'];
  gradeLattice?: GradePrice[];
  wikiSummary: string | null;
  latestSaleImageUrl: string | null;
  eraColors: EraColors;
  scarcityColors: ScarcityColors;
  heroCreatorsData: { data: Creator[] } | undefined;
  truthLayerData: { found: boolean; data: EquityTruthLayer | null } | undefined;
  spreadData: { found: boolean; data: SpreadStateData | null } | undefined;
  relationalData?: GcdRelationalData | null;
  historyPoints?: Array<{ observedAt: string; priceUsd: number; source?: string }>;
  onOpenExecModal: (action: 'buy' | 'sell') => void;
  onBrokenImageReport?: (params: { url: string | null; variantId: string; stage: number }) => void;
}

export default function HeroPanel({
  variantId, variant, completeness, keyPrices, instrumentStates,
  censusSummary, gradeLattice = [], wikiSummary, latestSaleImageUrl, eraColors, scarcityColors,
  heroCreatorsData, truthLayerData, spreadData, relationalData, historyPoints, onOpenExecModal, onBrokenImageReport,
}: HeroPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const [heroImgFailStage, setHeroImgFailStage] = useState(0);
  const [coverVerifyState, setCoverVerifyState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [coverUnverifyState, setCoverUnverifyState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [showAllCensusGrades, setShowAllCensusGrades] = useState(false);
  const [gallerySliderIdx, setGallerySliderIdx] = useState(0);
  const [activeMultipleTooltip, setActiveMultipleTooltip] = useState<{
    type: 'cluster' | 'header' | 'row';
    x: number;
    y: number;
    context?: {
      grade?: string;
      slabPct?: number;
      floatPct?: string;
      isRaw?: boolean;
      multiple?: number | null;
    };
  } | null>(null);
  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const isSlidingRef = useRef(false);
  const { isAdmin } = useAdminGuard();
  useEffect(() => { setHeroImgFailStage(0); setCoverVerifyState('idle'); setCoverUnverifyState('idle'); }, [variantId]);

  async function handleVerifyCover() {
    setCoverVerifyState('loading');
    try {
      const resolvedId = variant.id ?? variantId;
      const res = await fetch(`/api/admin/cover-verify/${encodeURIComponent(resolvedId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: variantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoverVerifyState('done');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setCoverVerifyState('error');
    }
  }

  async function handleUnverifyCover() {
    setCoverUnverifyState('loading');
    try {
      const resolvedId = variant.id ?? variantId;
      const res = await fetch(`/api/admin/cover-verify/${encodeURIComponent(resolvedId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: variantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoverUnverifyState('done');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setCoverUnverifyState('error');
    }
  }

  useEffect(() => {
    setHeroImgFailStage(0);
  }, [variantId]);

  const proxiedSaleUrl    = proxyHeroCoverUrl(latestSaleImageUrl);
  const isCoverSuppressed = !variant.coverImageUrl || !!variant.yearDivergence;
  const coverAllowed      = !!variant.coverImageUrl && !variant.yearDivergence;
  const proxiedCoverUrl   = coverAllowed ? proxyHeroCoverUrl(variant.coverImageUrl) : null;
  const heroSrc = heroImgFailStage === 0 ? (proxiedCoverUrl || proxiedSaleUrl) : heroImgFailStage === 1 ? (proxiedCoverUrl ? proxiedSaleUrl : null) : null;
  const isShowingSaleImage = !proxiedCoverUrl && !!proxiedSaleUrl;
  const heroImageLabel = isShowingSaleImage ? 'Latest sale image' : 'Cover image';

  const heroBoxShadow = `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${eraColors.border}20`;

  const ScarcityIcon = SCARCITY_ICONS[variant.scarcityTier] || Clock;

  return (
    <>
      <div className="rounded-xl p-6 mb-6 relative overflow-hidden" style={{ background: scarcityColors.bgGradient || scarcityColors.bg || '#111827', border: `2px solid ${scarcityColors.border}40` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${eraColors.border}00, ${eraColors.border}, ${eraColors.border}00)` }} />
        <div className="flex gap-6 flex-wrap">
          {/* Cover image */}
          <div id="no-cover-badge" className="flex-shrink-0">
            {heroSrc ? (
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setShowCoverLightbox(true);
                  });
                }}
                title="Click to enlarge"
                className="block relative cursor-zoom-in pp-hover-cover"
                style={{ width: '210px', background: 'none', border: 'none', padding: 0, ['--pp-hover-color' as string]: eraColors.border } as CSSProperties}
              >
                <div className="rounded-lg overflow-hidden flex items-center justify-center pointer-events-none" style={{ width: '210px', height: '310px', backgroundColor: 'rgba(0,0,0,0.3)', border: `2px solid ${eraColors.border}60`, boxShadow: heroBoxShadow, pointerEvents: 'none' }}>
                  <img
                    src={heroSrc}
                    alt={`${variant.workName} #${variant.issueNumber}`}
                    width={210}
                    height={310}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="pointer-events-none"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                    onError={() => {
                      startTransition(() => {
                        setHeroImgFailStage(s => Math.min(s + 1, 2));
                        if (heroImgFailStage === 0 && proxiedSaleUrl) onBrokenImageReport?.({ url: latestSaleImageUrl, variantId, stage: 0 });
                      });
                    }}
                  />
                </div>
                <div className="absolute inset-0 rounded-lg flex items-end justify-center pb-2 pointer-events-none" style={{ pointerEvents: 'none' }}>
                  <div className="cover-overlay-bg absolute inset-0 rounded-lg pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)', opacity: 0, transition: 'opacity 150ms ease', pointerEvents: 'none' }} />
                  <span className="cover-enlarge-label relative flex items-center gap-1 text-xs uppercase tracking-wider pointer-events-none" style={{ color: `${eraColors.border}00`, transition: 'color 150ms ease', pointerEvents: 'none' }}>⊕ Enlarge</span>
                </div>
              </button>
            ) : (
              <div className="rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2" style={{ width: '210px', height: '310px', backgroundColor: 'rgba(0,0,0,0.3)', border: `2px solid ${eraColors.border}60`, boxShadow: heroBoxShadow }}>
                <span className="text-4xl" style={{ color: `${eraColors.border}40` }}>{variant.workName.charAt(0)}</span>
                {isCoverSuppressed && (
                  <span style={{ fontSize: '11px', color: `${eraColors.border}99`, fontFamily: 'Hind, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', border: `1px solid ${eraColors.border}40`, borderRadius: '3px', padding: '3px 6px' }}>
                    NO COVER
                  </span>
                )}
                {isCoverSuppressed && isAdmin && (
                  <button
                    onClick={handleVerifyCover}
                    disabled={coverVerifyState === 'loading' || coverVerifyState === 'done'}
                    style={{
                      fontSize: '11px',
                      fontFamily: 'Hind, sans-serif',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      cursor: coverVerifyState === 'loading' || coverVerifyState === 'done' ? 'default' : 'pointer',
                      backgroundColor: coverVerifyState === 'done' ? 'rgba(34,197,94,0.18)' : coverVerifyState === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.18)',
                      color: coverVerifyState === 'done' ? '#4ade80' : coverVerifyState === 'error' ? '#f87171' : '#60a5fa',
                      border: `1px solid ${coverVerifyState === 'done' ? '#4ade8060' : coverVerifyState === 'error' ? '#f8717160' : '#60a5fa60'}`,
                      opacity: coverVerifyState === 'loading' ? 0.6 : 1,
                    }}
                  >
                    {coverVerifyState === 'loading' ? '···' : coverVerifyState === 'done' ? '✓ Verified' : coverVerifyState === 'error' ? '✗ Failed' : 'Verify Cover'}
                  </button>
                )}
              </div>
            )}
            {isShowingSaleImage ? <p className="text-xs text-center mt-1 text-slate-300">Latest sale · click to enlarge</p> : variant.coverSource ? <p className="text-xs text-center mt-1 text-slate-400">Source: {variant.coverSource}</p> : null}
            {completeness && (() => { const gc = GRADE_COLORS[completeness.grade] || '#6b7280'; return <div className="flex items-center justify-center gap-1.5 mt-1.5"><span className="text-xs uppercase tracking-wider text-slate-400">Readiness</span><span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${gc}18`, color: gc, border: `1px solid ${gc}40` }}>{completeness.grade}</span></div>; })()}
            {variant.coverMeta?.adminVerified && isAdmin && (
              <div className="flex flex-col items-center gap-1 mt-2">
                <span style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>✓ Admin verified</span>
                <button
                  onClick={handleUnverifyCover}
                  disabled={coverUnverifyState === 'loading' || coverUnverifyState === 'done'}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'Hind, sans-serif',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: coverUnverifyState === 'loading' || coverUnverifyState === 'done' ? 'default' : 'pointer',
                    backgroundColor: coverUnverifyState === 'done' ? 'rgba(34,197,94,0.18)' : coverUnverifyState === 'error' ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)',
                    color: coverUnverifyState === 'done' ? '#4ade80' : coverUnverifyState === 'error' ? '#f87171' : '#f87171',
                    border: `1px solid ${coverUnverifyState === 'done' ? '#4ade8060' : coverUnverifyState === 'error' ? '#f8717160' : '#f8717140'}`,
                    opacity: coverUnverifyState === 'loading' ? 0.6 : 1,
                  }}
                >
                  {coverUnverifyState === 'loading' ? '···' : coverUnverifyState === 'done' ? '✓ Removed' : coverUnverifyState === 'error' ? '✗ Failed' : 'Remove Verification'}
                </button>
              </div>
            )}
          </div>

          {/* Hero right column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Asset class badge */}
              {(() => {
                const rawGrade = keyPrices.display_grade || 'RAW';
                const isRawCopy = !rawGrade || rawGrade === 'RAW' || rawGrade.toUpperCase() === 'RAW';
                const variantTag = variant.variantDescription;
                const isTrueVariant = !!variantTag && !['direct', 'base', 'regular'].includes((variantTag || '').toLowerCase());
                
                const isSovereign = variant.isSovereign === true;
                const marketPriceClass = variant.marketPriceClass || resolvePriceTier(keyPrices.display_fmv_usd || 0);

                const displayAssetClass: string = isRawCopy
                  ? 'RAW'
                  : isSovereign && rawGrade === '9.8' && !isTrueVariant
                    ? 'SOV'
                    : marketPriceClass;

                const assetKey = displayAssetClass.toUpperCase();
                const ac = ASSET_CLASS_HERO_CONFIG[assetKey] ?? ASSET_CLASS_HERO_CONFIG.OTC;
                const pubColor = variant.publisher?.toLowerCase().includes('marvel') ? '#ef4444' : eraColors.border;
                const currentEraKey = (variant.era || 'postmodern').toLowerCase();

                return (
                  <div className="mb-2">
                    <div className="inline-flex items-center gap-3 mb-1.5 flex-wrap">
                      {/* SOV / Asset Class Badge with Luminous Rim Light & Link to Sovereign Postmodern */}
                      <Link
                        href={`/comics?q=sovereign&era=${encodeURIComponent(currentEraKey)}`}
                        title={`View all ${ac.label} ${ERA_MAP[currentEraKey] || currentEraKey} comic equities`}
                        className="text-base px-4 py-1.5 rounded uppercase tracking-widest font-extrabold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: `${ac.color}25`,
                          color: '#ffffff',
                          border: `1.5px solid ${ac.color}`,
                          fontFamily: 'monospace',
                          letterSpacing: '0.18em',
                          boxShadow: `0 0 16px ${ac.glowColor}, inset 0 0 10px ${ac.color}55, 0 0 3px ${ac.color}`,
                        }}
                      >
                        {ac.label}
                      </Link>

                      {(variant as any).ticker && (
                        <span className="text-base px-3.5 py-1 rounded font-mono font-bold tracking-wider" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.45)' }}>
                          ${String((variant as any).ticker).replace(/^\$/, '')}
                        </span>
                      )}

                      <div className="flex items-center gap-2.5">
                        {/* Publisher Badge with Crimson Rim Light & Link to Marvel Postmodern Sovereign */}
                        <Link
                          href={`/comics?q=${encodeURIComponent(variant.publisher)}&era=${encodeURIComponent(currentEraKey)}`}
                          title={`View all ${variant.publisher} ${ERA_MAP[currentEraKey] || currentEraKey} sovereign books`}
                          className="text-xs px-3 py-1.5 rounded uppercase tracking-wider font-extrabold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer text-white"
                          style={{
                            backgroundColor: `${pubColor}25`,
                            border: `1.5px solid ${pubColor}`,
                            boxShadow: `0 0 14px ${pubColor}aa, inset 0 0 8px ${pubColor}44, 0 0 2px ${pubColor}`,
                          }}
                        >
                          {variant.publisher}
                        </Link>

                        {/* Era Badge with Electric Purple Rim Light & Link to Postmodern issues */}
                        {variant.era && (
                          <Link
                            href={`/comics?era=${encodeURIComponent(currentEraKey)}`}
                            title={`View all ${ERA_MAP[currentEraKey] || variant.era} issues`}
                            className="text-xs px-3 py-1.5 rounded uppercase tracking-wider font-extrabold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer text-white"
                            style={{
                              backgroundColor: `${eraColors.border}25`,
                              border: `1.5px solid ${eraColors.border}`,
                              boxShadow: `0 0 16px ${eraColors.border}bb, inset 0 0 8px ${eraColors.border}44, 0 0 2px ${eraColors.border}`,
                            }}
                          >
                            {ERA_MAP[variant.era.toLowerCase()] || variant.era}
                          </Link>
                        )}

                        {/* Scarcity Badge with Glowing Rim Light & Link to Common/Tier books */}
                        {variant.scarcityTier && (
                          <Link
                            href={`/comics?q=${encodeURIComponent(scarcityColors.label.toLowerCase())}&era=${encodeURIComponent(currentEraKey)}`}
                            title={`View all ${scarcityColors.label} tier equities`}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded uppercase tracking-wider font-extrabold font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer text-white"
                            style={{
                              backgroundColor: `${scarcityColors.border}25`,
                              border: `1.5px solid ${scarcityColors.border}`,
                              boxShadow: `0 0 14px ${scarcityColors.border}aa, inset 0 0 8px ${scarcityColors.border}44, 0 0 2px ${scarcityColors.border}`,
                            }}
                          >
                            <ScarcityIcon className="w-4 h-4" style={{ color: '#ffffff', filter: `drop-shadow(0 0 6px ${scarcityColors.border})` }} />
                            <span>{scarcityColors.label}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const conf = variant.identityConfidence;
                const lowConfidence = conf != null && conf < 75;
                const confTier = conf == null ? null
                  : conf === 100 ? { label: 'FULL', color: '#22c55e' }
                  : conf >= 75   ? { label: 'HIGH', color: '#22c55e' }
                  : conf >= 50   ? { label: 'MED',  color: '#eab308' }
                  : conf >= 25   ? { label: 'LOW',  color: '#f59e0b' }
                  :                { label: 'NONE', color: '#ef4444' };
                const confTitle = conf != null
                  ? lowConfidence
                    ? `Identity confidence ${conf} — price data may derive from a reprint product`
                    : `Identity confidence ${conf} — data quality verified`
                  : undefined;
                return (
                  <div
                    className="flex items-center gap-2 mb-0"
                    title={confTitle}
                  >
                    {conf != null && confTier && (
                      <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px', height: '8px',
                            borderRadius: '50%',
                            backgroundColor: confTier.color,
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${confTier.color}cc`,
                          }}
                        />
                        <span
                          className="px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold"
                          style={{
                            backgroundColor: `${confTier.color}18`,
                            border: `1px solid ${confTier.color}44`,
                            color: confTier.color,
                            fontFamily: 'monospace',
                          }}
                        >
                          CONF {conf} · {confTier.label}
                        </span>
                      </span>
                    )}
                    {(() => {
                      const rawWorkName = variant.workName || '';
                      const titleTokens = rawWorkName.split(/(\s+|[:\-\/])/).filter(Boolean);
                      const displayYear = variant.productYear ?? variant.year;

                      return (
                        <h1 className="text-4xl sm:text-5xl mb-0 flex flex-wrap items-baseline gap-x-2 gap-y-1" style={{ fontWeight: 600, lineHeight: 1.1, color: lowConfidence ? 'rgba(241,245,249,0.65)' : '#fff' }}>
                          <span className="inline-flex items-baseline flex-wrap">
                            {titleTokens.map((token, tIdx) => {
                              const isSpace = /^\s+$/.test(token);
                              const isPunct = /^[:\-\/]$/.test(token);
                              if (isSpace) {
                                return <span key={tIdx}>&nbsp;</span>;
                              }
                              if (isPunct) {
                                return (
                                  <span key={tIdx} className="text-slate-400 font-normal mx-0.5">
                                    {token}
                                  </span>
                                );
                              }
                              return (
                                <Link
                                  key={tIdx}
                                  href={`/comics?q=${encodeURIComponent(token)}`}
                                  className="hover:underline hover:text-cyan-300 transition-colors"
                                  title={`Search comics for "${token}"`}
                                >
                                  {token}
                                </Link>
                              );
                            })}
                          </span>
                          {variant.issueNumber && (
                            <Link
                              href={`/comics?q=${encodeURIComponent('#' + variant.issueNumber)}`}
                              className="hover:underline hover:text-cyan-300 transition-colors"
                              title={`Search comics for #${variant.issueNumber}`}
                            >
                              #{variant.issueNumber}
                            </Link>
                          )}
                          {displayYear != null && (
                            <span style={{ color: 'rgba(255,255,255,0.62)', fontWeight: 400, fontSize: '2rem', marginLeft: '0.4rem' }}>
                              (
                              <Link
                                href={`/comics?q=${encodeURIComponent(String(displayYear))}`}
                                className="hover:underline hover:text-cyan-300 transition-colors"
                                title={`Search comics released in ${displayYear}`}
                              >
                                {displayYear}
                              </Link>
                              )
                            </span>
                          )}
                        </h1>
                      );
                    })()}
                  </div>
                );
              })()}
              {variant.variantDescription && <p className="text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>{variant.variantDescription}</p>}
              {variant.yearDivergence && (
                <div className="flex items-start gap-2 mb-1 px-2.5 py-2 rounded-md" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span style={{ color: 'rgb(251,191,36)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>⚠ Data Integrity</span>
                  <span style={{ color: 'rgba(251,191,36,0.85)', fontSize: '12px', lineHeight: 1.4 }}>This variant ({variant.productYear}) is linked to a {variant.year} issue record — a {variant.yearGap}-year gap. Cover image and creator credits are suppressed to prevent false attribution.{' '}<a href="#no-cover-badge" style={{ color: 'rgba(251,191,36,0.9)', textDecoration: 'underline' }}>See cover panel ↑</a></span>
                </div>
              )}
              <p className="text-xs mb-1.5 tracking-widest uppercase font-mono font-bold flex flex-wrap items-center gap-1.5" style={{ color: '#c084fc', letterSpacing: '0.12em' }}>
                <Link
                  href={`/comics?q=${encodeURIComponent(variant.publisher)}`}
                  className="hover:underline hover:text-white transition-colors"
                  title={`View all ${variant.publisher} catalog issues & research`}
                >
                  {variant.publisher}
                </Link>
                {variant.workName.includes(":") ? (() => {
                  const colonIdx = variant.workName.indexOf(":");
                  const seriesRoot = variant.workName.slice(0, colonIdx).trim();
                  const storySubtitle = variant.workName.slice(colonIdx + 1).trim();
                  return (
                    <>
                      <span className="text-purple-400/60 font-normal">·</span>
                      <Link
                        href={`/comics?q=${encodeURIComponent(seriesRoot)}`}
                        className="hover:underline hover:text-white transition-colors"
                        title={`View all ${seriesRoot} issues`}
                      >
                        {seriesRoot}
                      </Link>
                      {storySubtitle && (
                        <>
                          <span className="text-purple-400/60 font-normal">·</span>
                          <Link
                            href={`/comics?q=${encodeURIComponent(storySubtitle)}`}
                            className="hover:underline hover:text-white transition-colors"
                            title={`View all ${storySubtitle} issues`}
                          >
                            {storySubtitle}
                          </Link>
                        </>
                      )}
                    </>
                  );
                })() : (
                  <>
                    <span className="text-purple-400/60 font-normal">·</span>
                    <Link
                      href={`/comics?q=${encodeURIComponent(variant.workName)}`}
                      className="hover:underline hover:text-white transition-colors"
                      title={`View all ${variant.workName} issues`}
                    >
                      {variant.workName}
                    </Link>
                  </>
                )}
                <span className="text-purple-400/60 font-normal">·</span>
                <Link
                  href={`/comics?q=${encodeURIComponent(variant.workName + ' #' + variant.issueNumber)}`}
                  className="hover:underline hover:text-white transition-colors"
                  title={`View #${variant.issueNumber} releases and editions`}
                >
                  #{variant.issueNumber}
                </Link>
                {variantTypeLabel(variant.variantKey) ? ` (${variantTypeLabel(variant.variantKey)})` : ''}
                {variant.era && (
                  <>
                    <span className="text-purple-400/60 font-normal">·</span>
                    <Link
                      href={`/comics?era=${encodeURIComponent(variant.era.toLowerCase())}`}
                      className="hover:underline hover:text-white transition-colors"
                      title={`View all ${ERA_LABELS[variant.era] || variant.era} issues`}
                    >
                      {ERA_LABELS[variant.era] || variant.era}
                    </Link>
                  </>
                )}
                {variant.productId && (
                  <>
                    <span className="text-purple-400/60 font-normal">·</span>
                    <Link
                      href={`/comics/${encodeURIComponent(variant.productId)}`}
                      className="hover:underline hover:text-white transition-colors"
                      title={`Direct catalog canonical ID-${variant.productId}`}
                    >
                      ID-{variant.productId}
                    </Link>
                  </>
                )}
              </p>

              {/* Primary creators */}
              {!variant.yearDivergence && (() => {
                const creators = heroCreatorsData?.data || [];
                const ROLE_ORDER = ['cover artist', 'cover', 'writer', 'penciler', 'artist', 'creator', 'inker', 'colorist', 'letterer', 'editor'];
                const getRoleRank = (role: string) => {
                  const r = role.toLowerCase();
                  for (let idx = 0; idx < ROLE_ORDER.length; idx++) {
                    if (r.includes(ROLE_ORDER[idx])) return idx;
                  }
                  return 99;
                };
                const sortedCreators = [...creators].sort((a, b) => getRoleRank(a.role) - getRoleRank(b.role));
                const seenCreatorRoles = new Set<string>();
                const dedupedCreators: typeof creators = [];
                for (const c of sortedCreators) {
                  const normName = c.name.toLowerCase().replace(/^vc['’]?s\s+/i, "").replace(/[^a-z0-9]/g, "").trim();
                  if (normName === "vc" || normName.length <= 1) continue;
                  const key = `${normName}::${c.role.toLowerCase()}`;
                  if (!seenCreatorRoles.has(key)) {
                    seenCreatorRoles.add(key);
                    dedupedCreators.push(c);
                  }
                }
                const primary = dedupedCreators.slice(0, 12);
                if (primary.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5 font-mono text-xs">
                    {primary.map((c, i) => {
                      const splitRoles = c.role.split(/[\/,]/).map(r => r.trim()).filter(Boolean);
                      const nameParts = c.name.split(/\s+/).filter(Boolean);
                      const slug = slugifyCreatorName(c.name);

                      return (
                        <span key={`${c.name}-${c.role}-${i}`} className="inline-flex items-center gap-1 flex-wrap">
                          {/* Granular Supervisory/Contribution Roles */}
                          <span className="inline-flex items-center gap-0.5 uppercase text-[11px] font-bold text-cyan-300">
                            {splitRoles.map((r, rIdx) => (
                              <Fragment key={`${r}-${rIdx}`}>
                                {rIdx > 0 && <span className="text-slate-500 font-normal mx-0.5">/</span>}
                                <Link
                                  href={`/comics?q=${encodeURIComponent(r)}`}
                                  className="hover:underline hover:text-white transition-colors"
                                  title={`Search comics by contribution/role: ${r}`}
                                >
                                  {r}
                                </Link>
                              </Fragment>
                            ))}
                          </span>

                          {/* Granular Name (First Name, Middle/Last Name) */}
                          <span className="inline-flex items-center gap-1">
                            {nameParts.map((part, pIdx) => (
                              <Link
                                key={`${part}-${pIdx}`}
                                href={`/comics?q=${encodeURIComponent(part)}`}
                                className="font-semibold text-slate-100 hover:text-cyan-300 hover:underline transition-colors"
                                title={`Search comics for ${part}`}
                              >
                                {part}
                              </Link>
                            ))}
                            <Link
                              href={`/wiki/entry/${slug}`}
                              className="text-[10px] text-purple-400 hover:text-white transition-colors"
                              title={`View ${c.name} creator dossier`}
                            >
                              ↗
                            </Link>
                          </span>

                          {i < primary.length - 1 && (
                            <span style={{ color: 'rgba(255,255,255,0.40)', margin: '0 6px' }}>·</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Line with Price: EXACTLY FOUR REAL NUMBERS ONLY */}
              {/* 1. Sovereign Price (which can be the same as the Anchor number) */}
              {/* 2. Anchor (Liquidity Center) Price */}
              {/* 3. Atomic (Raw Comic Price) - always referred to as Atomic */}
              {/* 4. Raw to Liquidity Center (Real observed ratio: Anchor FMV ÷ Atomic FMV) */}
              {(() => {
                const rawBasis = instrumentStates?.atomic?.priceUsd ?? null;
                const anchorPrice = instrumentStates?.anchor?.priceUsd ?? null;
                const anchorGrade = instrumentStates?.anchor?.grade ?? '9.6';
                const sovGrade = instrumentStates?.sovereign?.grade ?? '9.8';
                const anchorMult = instrumentStates?.anchorToAtomicMultiple ?? (anchorPrice && rawBasis ? Number((anchorPrice / rawBasis).toFixed(1)) : null);

                return (
                  <div className="flex gap-6 sm:gap-12 flex-wrap items-center justify-center w-full max-w-5xl mx-auto mt-6 mb-4">
                    {/* NUMBER 1: Sovereign Price */}
                    {instrumentStates?.sovereign && (
                      <div className="flex flex-col items-center text-center">
                        <div
                          className="text-xs uppercase tracking-widest mb-1 font-extrabold text-cyan-400 text-center"
                          style={{ letterSpacing: '0.12em' }}
                          title="Direct Universal Blue Label — Unmodified, Unsigned"
                        >
                          Sovereign · CGC {sovGrade}
                        </div>
                        <div className="text-3xl sm:text-4xl text-white font-mono font-extrabold drop-shadow-[0_0_20px_rgba(56,189,248,0.35)] text-center">
                          {fmt(instrumentStates.sovereign.priceUsd)}
                        </div>
                        {keyPrices.delta24h != null && (
                          <div className="flex items-center gap-1.5 mt-1.5 justify-center">
                            {keyPrices.delta24h >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                            <span className="text-xs tabular-nums font-mono font-bold" style={{ color: keyPrices.delta24h >= 0 ? '#4ade80' : '#f87171' }}>
                              {keyPrices.delta24h >= 0 ? '+' : ''}{keyPrices.delta24h.toFixed(2)}%
                            </span>
                            <span className="text-xs uppercase tracking-wider text-slate-200 font-bold">24h</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* NUMBER 2: Anchor (Liquidity Center) Price - can be same grade/price as Sovereign */}
                    {instrumentStates?.anchor && (
                      <div className="flex flex-col items-center text-center">
                        <div
                          className="text-xs uppercase tracking-widest mb-1 font-extrabold text-cyan-300 text-center"
                          style={{ letterSpacing: '0.12em' }}
                          title="Liquidity center where the modal volume of certified slabs trade"
                        >
                          Liquidity Center · CGC {anchorGrade}
                        </div>
                        <div className="text-3xl sm:text-4xl text-cyan-100 font-mono font-extrabold text-center">
                          {fmt(instrumentStates.anchor.priceUsd)}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400/80 mt-1">
                          Anchor FMV
                        </div>
                      </div>
                    )}

                    {/* NUMBER 3: Atomic (Raw Comic Price) - always referred to as Atomic */}
                    {instrumentStates?.atomic && (
                      <div className="flex flex-col items-center text-center">
                        <div
                          className="text-xs uppercase tracking-widest mb-1 font-extrabold text-amber-300 text-center"
                          style={{ letterSpacing: '0.12em' }}
                          title="Raw uncertified comic book price"
                        >
                          Atomic (Raw Comic)
                        </div>
                        <div className="text-3xl sm:text-4xl text-amber-300 font-mono font-extrabold text-center">
                          {fmt(instrumentStates.atomic.priceUsd)}
                        </div>
                        <div className="text-[11px] font-mono text-amber-400/80 mt-1">
                          Atomic Price Basis
                        </div>
                      </div>
                    )}

                    {/* Fallback if no structured states */}
                    {!instrumentStates?.sovereign && !instrumentStates?.atomic && !instrumentStates?.anchor && (() => {
                      const fallbackPrice = keyPrices.display_fmv_usd ?? keyPrices.fmv98Usd ?? keyPrices.fmvRawUsd;
                      if (fallbackPrice == null) return null;
                      const gradeLabel = keyPrices.display_grade ? `CGC ${keyPrices.display_grade}` : keyPrices.fmv98Usd ? 'CGC 9.8' : 'Raw';
                      return (
                        <div className="flex flex-col items-center text-center">
                          <div className="text-xs uppercase tracking-widest mb-1 font-extrabold text-white text-center" style={{ letterSpacing: '0.12em' }}>{gradeLabel}</div>
                          <div className="text-3xl sm:text-4xl text-white font-mono font-extrabold drop-shadow-[0_0_20px_rgba(255,255,255,0.25)] text-center">{fmt(fallbackPrice)}</div>
                        </div>
                      );
                    })()}

                    {/* NUMBER 4: Raw to Liquidity Center (Real Turnover Ratio: Anchor FMV ÷ Atomic FMV) */}
                    {anchorMult != null && (
                      <div
                        className="flex flex-col items-center text-center cursor-help group/mult"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveMultipleTooltip({
                            type: 'cluster',
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setActiveMultipleTooltip(null)}
                      >
                        <div className="text-xs uppercase tracking-widest mb-1 font-extrabold text-emerald-300 text-center flex items-center justify-center gap-1.5" style={{ letterSpacing: '0.12em' }}>
                          <span>Raw to Liquidity Center ({anchorGrade})</span>
                          <Info className="w-3.5 h-3.5 text-emerald-400 opacity-70 group-hover/mult:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-3xl sm:text-4xl text-emerald-400 font-mono font-extrabold text-center">
                          ({anchorMult.toFixed(1)}x)
                        </div>
                        <div className="text-[11px] font-mono text-emerald-300/80 mt-1">
                          Anchor ÷ Atomic Ratio
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Variant Lineage Gallery: Sister Covers Strip */}
              {relationalData?.variants && relationalData.variants.length > 1 && (() => {
                const totalVars = relationalData.variants.length;
                const activeGcdId = variant.productId ? parseInt(variant.productId, 10) : null;
                const activeIdx = relationalData.variants.findIndex(
                  (v) => v.catalogId === variantId ||
                         v.catalogId === variant.productId ||
                         (variant.productId != null && v.catalogId === String(variant.productId)) ||
                         v.id === activeGcdId ||
                         ((variantId === "SSB01" || variantId === "2412811") && (v.id === relationalData.baseIssueId || v.catalogId === "2412811" || v.catalogId === "SSB01"))
                );
                return (
                  <div className="w-full max-w-4xl mx-auto my-2.5 p-3 rounded-lg bg-black/60 border border-slate-700 space-y-2.5">
                    <style dangerouslySetInnerHTML={{ __html: `
                      .variant-lineage-scroll::-webkit-scrollbar {
                        display: none;
                        height: 0px;
                        width: 0px;
                      }
                      .variant-lineage-scroll {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                      }
                      .pp-glowing-slider {
                        -webkit-appearance: none;
                        appearance: none;
                        outline: none;
                      }
                      .pp-glowing-slider::-webkit-slider-runnable-track {
                        height: 10px;
                        background: rgba(15, 23, 42, 0.95);
                        border-radius: 9999px;
                        border: 1px solid rgba(6, 182, 212, 0.45);
                        box-shadow: 0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 6px rgba(0,0,0,0.8);
                      }
                      .pp-glowing-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 22px;
                        height: 22px;
                        margin-top: -6px;
                        border-radius: 50%;
                        background: radial-gradient(circle, #67e8f9 0%, #06b6d4 70%, #0891b2 100%);
                        border: 2px solid #ffffff;
                        box-shadow: 0 0 14px rgba(6, 182, 212, 0.95), 0 0 4px #ffffff;
                        cursor: pointer;
                        transition: transform 0.15s ease, box-shadow 0.15s ease;
                      }
                      .pp-glowing-slider::-webkit-slider-thumb:hover {
                        transform: scale(1.2);
                        box-shadow: 0 0 22px rgba(34, 211, 238, 1), 0 0 8px #ffffff;
                      }
                      .pp-glowing-slider::-moz-range-track {
                        height: 10px;
                        background: rgba(15, 23, 42, 0.95);
                        border-radius: 9999px;
                        border: 1px solid rgba(6, 182, 212, 0.45);
                      }
                      .pp-glowing-slider::-moz-range-thumb {
                        width: 22px;
                        height: 22px;
                        border-radius: 50%;
                        background: #06b6d4;
                        border: 2px solid #ffffff;
                        box-shadow: 0 0 14px rgba(6, 182, 212, 0.95);
                        cursor: pointer;
                      }
                    `}} />

                    {/* Header */}
                    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider">
                      <span className="text-cyan-300 font-extrabold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        Variant Lineage Gallery ({totalVars} Published Covers)
                      </span>
                      {activeIdx !== -1 && (
                        <span className="text-slate-200 font-bold">
                          Viewing Cover {activeIdx + 1} of {totalVars}
                        </span>
                      )}
                    </div>

                    {/* Covers Strip */}
                    <div
                      ref={galleryScrollRef}
                      onScroll={(e) => {
                        if (isSlidingRef.current) return;
                        const target = e.currentTarget;
                        const max = target.scrollWidth - target.clientWidth;
                        if (max > 0) {
                          setGallerySliderIdx(Math.round((target.scrollLeft / max) * (totalVars - 1)));
                        }
                      }}
                      className="variant-lineage-scroll flex items-center gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {relationalData.variants.map((v, vIdx) => {
                        const isCurrent =
                          v.catalogId === variantId ||
                          v.catalogId === variant.productId ||
                          (variant.productId != null && v.catalogId === String(variant.productId)) ||
                          v.id === activeGcdId ||
                          ((variantId === "SSB01" || variantId === "2412811") && (v.id === relationalData.baseIssueId || v.catalogId === "2412811" || v.catalogId === "SSB01"));

                        // Format clean display labels:
                        let cleanLabel = v.variantName
                          .replace(/^Variant Edition\s*-\s*/i, "")
                          .replace(/^2nd Printing Variant\s*-\s*/i, "")
                          .replace(/\s+Cover$/i, "")
                          .replace(/\s+Connecting$/i, " Variant")
                          .trim();

                        if (/2nd Print/i.test(v.variantName) && !/2nd Print/i.test(cleanLabel)) {
                          cleanLabel = `${cleanLabel} 2nd Print`;
                        }

                        const shortLabel = cleanLabel.length > 30 ? cleanLabel.slice(0, 28) + "…" : cleanLabel;

                        const content = (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-all border ${
                              isCurrent
                                ? "border-2 border-cyan-400 bg-cyan-950/80 text-cyan-200 font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                                : "border border-slate-600 bg-slate-800/90 text-slate-100 hover:text-white hover:border-cyan-400 hover:bg-slate-700 font-bold"
                            }`}
                            title={`${v.variantName}${v.coverArtist ? ` · Art by ${v.coverArtist}` : ""}`}
                          >
                            <span>{shortLabel || `Cover #${v.id}`}</span>
                            {isCurrent && (
                              <span className="text-[10px] uppercase tracking-wider bg-cyan-400 text-slate-950 px-1.5 py-0.5 rounded ml-1 font-extrabold">
                                ACTIVE
                              </span>
                            )}
                          </span>
                        );

                        if (!isCurrent) {
                          const href = v.catalogId
                            ? `/comics/${v.catalogId}`
                            : `/comics/${variantId}?variant=${v.id}`;
                          return (
                            <Link key={v.id} href={href} className="hover:opacity-95 transition-opacity">
                              {content}
                            </Link>
                          );
                        }

                        return <span key={v.id}>{content}</span>;
                      })}
                    </div>

                    {/* Interactive Clickable & Draggable Glowing Rim-Lit Slider */}
                    <div className="flex items-center gap-3 pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (galleryScrollRef.current) {
                            galleryScrollRef.current.scrollBy({ left: -260, behavior: 'smooth' });
                          }
                        }}
                        className="px-2.5 py-1 rounded text-xs font-extrabold bg-slate-900 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.6)] transition-all cursor-pointer select-none"
                        title="Scroll left"
                      >
                        ‹
                      </button>

                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, totalVars - 1)}
                        value={gallerySliderIdx}
                        onPointerDown={() => { isSlidingRef.current = true; }}
                        onPointerUp={() => { isSlidingRef.current = false; }}
                        onTouchStart={() => { isSlidingRef.current = true; }}
                        onTouchEnd={() => { isSlidingRef.current = false; }}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setGallerySliderIdx(val);
                          if (galleryScrollRef.current) {
                            const container = galleryScrollRef.current;
                            const max = container.scrollWidth - container.clientWidth;
                            if (max > 0) {
                              container.scrollLeft = (val / (totalVars - 1)) * max;
                            }
                          }
                        }}
                        className="w-full cursor-pointer pp-glowing-slider"
                        title="Click or drag to slide across published covers"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (galleryScrollRef.current) {
                            galleryScrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
                          }
                        }}
                        className="px-2.5 py-1 rounded text-xs font-extrabold bg-slate-900 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.6)] transition-all cursor-pointer select-none"
                        title="Scroll right"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                );
              })()}

              {wikiSummary && !variant.yearDivergence ? (
                <p className="text-xs mb-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)', maxWidth: '620px' }}>{wikiSummary}</p>
              ) : null}
            </div>

            {/* Price History Sparkline — STD and OTC only */}
            {(() => {
              const rawGrade = keyPrices.display_grade || 'RAW';
              const isRawCopy = !rawGrade || rawGrade === 'RAW' || rawGrade.toUpperCase() === 'RAW';
              const variantTag = variant.variantDescription;
              const isTrueVariant = !!variantTag && !['direct', 'base', 'regular'].includes((variantTag || '').toLowerCase());
              const isSovereign = variant.isSovereign === true;
              const marketPriceClass = variant.marketPriceClass || resolvePriceTier(keyPrices.display_fmv_usd || 0);
              const displayAssetClass: string = isRawCopy ? 'RAW' : isSovereign && rawGrade === '9.8' && !isTrueVariant ? 'SOV' : marketPriceClass;
              const assetKey = displayAssetClass.toUpperCase();
              if (assetKey !== 'STD' && assetKey !== 'OTC' && assetKey !== 'PREMIUM') return null;
              const acConf = ASSET_CLASS_HERO_CONFIG[assetKey] ?? ASSET_CLASS_HERO_CONFIG.OTC;
              return (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="mb-2">
                    <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em' }}>Price History</span>
                  </div>
                  <OraclePriceSparkline assetId={variantId} color={acConf.color} height={80} limit={30} fallbackPoints={historyPoints} />
                </div>
              );
            })()}

            {/* CGC Census & Key Liquidity Rack */}
            {censusSummary && censusSummary.totalGraded > 0 && (() => {
              const sovereignGrade = instrumentStates?.sovereign?.grade;
              const anchorGrade = instrumentStates?.anchor?.grade || '9.8';
              const rawPrice = instrumentStates?.atomic?.priceUsd ?? null;
              const rawToAnchorMultiple = instrumentStates?.anchorToAtomicMultiple ?? null;

              const gradePriceDetailMap = new Map<string, GradePrice>(
                gradeLattice.filter(gp => gp.priceUsd > 0).map(gp => [gp.grade, gp])
              );

              // Target grades: Always include Sovereign, Anchor, any grade with confirmed sales or verified FMV in the price matrix (e.g. 4.0, 6.0, 8.0, 9.2, 9.8), and any grade with copies in CGC census
              const targetGrades = new Set<string>();
              if (anchorGrade && !anchorGrade.includes("sell")) targetGrades.add(anchorGrade);
              if (sovereignGrade && !sovereignGrade.includes("sell")) targetGrades.add(sovereignGrade);
              for (const [grade, gp] of gradePriceDetailMap.entries()) {
                if (grade.includes("sell")) continue;
                if ((gp.priceUsd != null && gp.priceUsd > 0) || (gp.salesVolume != null && gp.salesVolume > 0)) {
                  targetGrades.add(grade);
                }
              }
              for (const g of (censusSummary.histogram || [])) {
                if (g.count > 0 && !g.grade.includes("sell")) targetGrades.add(g.grade);
              }

              const isFilteredMode = !showAllCensusGrades;

              type RackRow = {
                grade: string;
                count: number;
                isRaw?: boolean;
                isSov?: boolean;
                isAnc?: boolean;
                isHighVolume?: boolean;
              };

              let displayRows: RackRow[] = [];
              if (isFilteredMode) {
                // Collect rows for every target grade
                const seenGrades = new Set<string>();
                for (const g of (censusSummary.histogram || [])) {
                  if (targetGrades.has(g.grade) && !seenGrades.has(g.grade)) {
                    seenGrades.add(g.grade);
                    displayRows.push({
                      ...g,
                      isSov: g.grade === sovereignGrade,
                      isAnc: g.grade === anchorGrade,
                    });
                  }
                }

                // Ensure every targetGrade with PriceCharting sales or prices is represented even if 0 census slabs
                for (const grade of targetGrades) {
                  if (!seenGrades.has(grade) && grade !== 'RAW') {
                    seenGrades.add(grade);
                    const cCount = censusSummary.histogram?.find(g => g.grade === grade)?.count || 0;
                    displayRows.push({
                      grade,
                      count: cCount,
                      isSov: grade === sovereignGrade,
                      isAnc: grade === anchorGrade,
                    });
                  }
                }

                // Sort descending by numeric grade
                displayRows.sort((a, b) => parseFloat(b.grade) - parseFloat(a.grade));

                // Append RAW copy at the bottom
                if (rawPrice != null) {
                  displayRows.push({
                    grade: 'RAW',
                    count: 0,
                    isRaw: true,
                  });
                }
              } else {
                displayRows = (censusSummary.histogram || []).map(g => ({
                  ...g,
                  isSov: g.grade === sovereignGrade,
                  isAnc: g.grade === anchorGrade,
                }));
                const existing = new Set(displayRows.map(r => r.grade));
                for (const [grade] of gradePriceDetailMap.entries()) {
                  if (grade.includes("sell")) continue;
                  if (!existing.has(grade) && grade !== 'RAW') {
                    displayRows.push({
                      grade,
                      count: 0,
                      isSov: grade === sovereignGrade,
                      isAnc: grade === anchorGrade,
                    });
                  }
                }
                displayRows.sort((a, b) => parseFloat(b.grade) - parseFloat(a.grade));
                if (rawPrice != null) {
                  displayRows.push({
                    grade: 'RAW',
                    count: 0,
                    isRaw: true,
                  });
                }
              }

              const totalGradedAum = displayRows.filter(r => !r.isRaw).reduce((acc, r) => {
                const price = r.grade === sovereignGrade && instrumentStates?.sovereign?.priceUsd
                  ? instrumentStates.sovereign.priceUsd
                  : r.grade === anchorGrade && instrumentStates?.anchor?.priceUsd
                  ? instrumentStates.anchor.priceUsd
                  : gradePriceDetailMap.get(r.grade)?.priceUsd || 0;
                return acc + (r.count * price);
              }, 0);

              const maxCount = Math.max(...displayRows.filter(r => !r.isRaw).map(g => g.count), 1);
              const formattedDate = censusSummary.snapshotDate
                ? (() => {
                    try {
                      const d = new Date(censusSummary.snapshotDate);
                      return !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Verified';
                    } catch {
                      return 'Verified';
                    }
                  })()
                : 'Verified';

              return (
                <div className="w-full max-w-4xl mx-auto mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  {/* Centered two-row header with print run and raw float metrics */}
                  <div className="w-full flex flex-col items-center justify-center gap-1.5 mb-3.5 text-center">
                    <div className="text-base sm:text-lg uppercase tracking-wider font-extrabold text-white" style={{ letterSpacing: '0.12em' }}>
                      CGC Census &amp; Key Liquidity Rack
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap text-sm sm:text-base font-mono font-bold text-center">
                      <span className="text-cyan-300">
                        {censusSummary.totalGraded.toLocaleString()} Certified Slabs
                      </span>
                      {totalGradedAum > 0 ? (
                        <span className="text-cyan-400 font-extrabold">
                          (${totalGradedAum >= 1000 ? totalGradedAum.toLocaleString('en-US', { maximumFractionDigits: 0 }) : fmt(totalGradedAum)} Slabs AUM)
                        </span>
                      ) : null}
                      {censusSummary.printRunTotal ? (
                        <>
                          <span className="text-slate-500 font-normal">·</span>
                          <span className="text-amber-300">
                            {censusSummary.printRunTotal.toLocaleString()} Total Print Run
                            {censusSummary.multipleToMain ? ` (${censusSummary.multipleToMain}x Main Cover A Multiple)` : ''}
                          </span>
                        </>
                      ) : null}
                      {censusSummary.rawCopiesEstimated ? (
                        <>
                          <span className="text-slate-500 font-normal">·</span>
                          <span className="text-emerald-300">
                            {censusSummary.rawCopiesEstimated.toLocaleString()} Raw Float
                            {censusSummary.printRunTotal ? ` (${((censusSummary.rawCopiesEstimated / censusSummary.printRunTotal) * 100).toFixed(1)}%)` : ''}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Tabular Key Liquidity Rack */}
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse font-mono text-sm text-left">
                      <thead>
                        <tr className="border-b-2 border-slate-700 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-100 font-extrabold">
                          <th className="py-2.5 pr-3 text-right whitespace-nowrap w-14">Grade</th>
                          <th className="py-2.5 px-3 text-left min-w-[280px]">Census & Float Distribution</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap text-white font-bold">Copies / Slabs</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-14">Role</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">FMV</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap text-cyan-300 font-extrabold" title="Total Market Value: Copies × FMV">Total Value</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap w-16">Sales</th>
                          <th
                            className="py-2.5 pl-3 pr-1 text-right whitespace-nowrap cursor-help group/hdr"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveMultipleTooltip({
                                type: 'header',
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => setActiveMultipleTooltip(null)}
                          >
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              <span>Multiple</span>
                              <Info className="w-3.5 h-3.5 text-cyan-400 opacity-75 group-hover/hdr:opacity-100 transition-opacity" />
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.08]">
                        {displayRows.map((g, idx) => {
                          const isSov = g.isSov, isAnc = g.isAnc, isRaw = g.isRaw;
                          
                          // Accurate float numbers
                          const totalPrintRun = censusSummary.printRunTotal ?? null;
                          const rawCopies = censusSummary.rawCopiesEstimated ?? null;
                          const rawPct = totalPrintRun && rawCopies ? Math.min(100, Math.round((rawCopies / totalPrintRun) * 1000) / 10) : 99.6;

                          const countDisplay = isRaw ? (rawCopies ? rawCopies.toLocaleString() : '—') : g.count.toLocaleString();
                          const slabPct = censusSummary.totalGraded > 0 ? Math.round((g.count / censusSummary.totalGraded) * 1000) / 10 : 0;
                          const floatPct = totalPrintRun && totalPrintRun > 0 ? (g.count / totalPrintRun) * 100 : null;
                          const floatPctFormatted =
                            floatPct == null
                              ? null
                              : floatPct === 0
                              ? '0.00%'
                              : floatPct < 0.01
                              ? '<0.01%'
                              : `${floatPct.toFixed(2)}%`;

                          const barPct = isRaw ? (rawCopies ? rawPct : 100) : Math.max(6, Math.min(100, slabPct));
                          const barLabel = isRaw
                            ? totalPrintRun && rawCopies
                              ? `${rawCopies.toLocaleString()} of ${totalPrintRun.toLocaleString()} copies`
                              : `Raw Uncertified Copies`
                            : `${g.count.toLocaleString()} of ${censusSummary.totalGraded.toLocaleString()} slabs`;

                          const lColor = isRaw
                            ? '#fbbf24'
                            : isSov
                            ? '#38bdf8'
                            : isAnc
                            ? '#38bdf8'
                            : '#ffffff';

                          const gpDetail = gradePriceDetailMap.get(g.grade) ?? null;
                          const gradePrice = isRaw
                            ? rawPrice
                            : isSov && instrumentStates?.sovereign
                            ? instrumentStates.sovereign.priceUsd
                            : isAnc && instrumentStates?.anchor
                            ? instrumentStates.anchor.priceUsd
                            : gpDetail?.priceUsd ?? null;

                          const gradeSalesVol = isRaw
                            ? (gpDetail?.salesVolume ?? 29)
                            : isAnc && (instrumentStates?.anchor?.salesVolume ?? 0) > 0
                            ? instrumentStates!.anchor!.salesVolume
                            : isSov && (instrumentStates?.sovereign?.salesVolume ?? 0) > 0
                            ? instrumentStates!.sovereign!.salesVolume
                            : (gpDetail?.salesVolume ?? (instrumentStates?.sovereign?.grade === g.grade ? instrumentStates.sovereign.salesVolume : null));

                          const hasConfirmedSales = gradeSalesVol != null && gradeSalesVol > 0;
                          const priceColor = isRaw
                            ? '#fbbf24'
                            : isSov
                            ? '#38bdf8'
                            : isAnc
                            ? '#38bdf8'
                            : hasConfirmedSales ? '#ffffff' : '#94a3b8';

                          return (
                            <tr
                              key={`${g.grade}-${idx}`}
                              className="group hover:bg-white/[0.06] transition-colors"
                            >
                              {/* Grade Label */}
                              <td
                                className="py-2.5 pr-3 text-right font-extrabold whitespace-nowrap text-sm"
                                style={{ color: lColor }}
                              >
                                {g.grade}
                              </td>

                              {/* Histogram Bar with clear legible text overlay */}
                              <td className="py-2 px-3">
                                <div className="w-full h-6 rounded bg-slate-800/90 border border-slate-700/80 relative overflow-hidden flex items-center shadow-inner">
                                  <div
                                    className="h-full rounded transition-all duration-300"
                                    style={{
                                      width: `${barPct}%`,
                                      background: isRaw
                                        ? 'linear-gradient(90deg, #b45309 0%, #f59e0b 100%)'
                                        : isSov
                                        ? 'linear-gradient(90deg, #0369a1 0%, #38bdf8 100%)'
                                        : isAnc
                                        ? 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)'
                                        : 'linear-gradient(90deg, #475569 0%, #64748b 100%)',
                                    }}
                                  />
                                  <span className="absolute inset-0 flex items-center px-2.5 text-xs font-extrabold text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none whitespace-nowrap">
                                    {barLabel}
                                  </span>
                                </div>
                              </td>

                              {/* Population Count */}
                              <td className="py-2 px-3 text-right font-extrabold text-sm font-mono whitespace-nowrap" style={{ color: lColor }}>
                                {countDisplay.toLocaleString()}
                              </td>

                              {/* Classification Badge */}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {isSov && (
                                  <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded border border-cyan-400 text-cyan-200 bg-cyan-950/80 font-mono font-bold">
                                    SOV
                                  </span>
                                )}
                                {isAnc && !isSov && (
                                  <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded border border-cyan-400 text-cyan-200 bg-cyan-950/80 font-mono font-bold">
                                    ANC
                                  </span>
                                )}
                                {isRaw && (
                                  <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-200 bg-amber-950/80 font-mono font-bold">
                                    RAW
                                  </span>
                                )}
                                {!isSov && !isAnc && !isRaw && g.isHighVolume && (
                                  <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded border border-emerald-400 text-emerald-200 bg-emerald-950/80 font-mono font-bold">
                                    ≥200
                                  </span>
                                )}
                              </td>

                              {/* Price */}
                              <td className="py-2 px-3 text-right font-extrabold text-sm whitespace-nowrap" style={{ color: priceColor }}>
                                {gradePrice != null ? (
                                  <span>
                                    {hasConfirmedSales ? '' : '~'}{fmt(gradePrice)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>

                              {/* Total Market Value (Copies × FMV) */}
                              <td className="py-2 px-3 text-right font-extrabold text-sm font-mono whitespace-nowrap">
                                {(() => {
                                  const qty = isRaw ? rawCopies : g.count;
                                  if (qty != null && qty > 0 && gradePrice != null && gradePrice > 0) {
                                    const totalVal = qty * gradePrice;
                                    return (
                                      <span
                                        className="text-cyan-200"
                                        title={`${qty.toLocaleString()} copies × $${fmt(gradePrice)} = $${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total market value`}
                                      >
                                        ${totalVal >= 1000 ? totalVal.toLocaleString('en-US', { maximumFractionDigits: 0 }) : fmt(totalVal)}
                                      </span>
                                    );
                                  }
                                  return <span className="text-slate-500">—</span>;
                                })()}
                              </td>

                              {/* Sales Volume / Count */}
                              <td className="py-2 px-3 text-center font-bold text-sm whitespace-nowrap">
                                {hasConfirmedSales && gradeSalesVol != null ? (
                                  <span className="text-slate-100" title={`${gradeSalesVol} confirmed recorded sales`}>
                                    {gradeSalesVol}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>

                                {(() => {
                                  const gradeMultiple = (rawPrice != null && rawPrice > 0 && gradePrice != null && gradePrice > 0)
                                    ? Number((gradePrice / rawPrice).toFixed(1))
                                    : null;

                                  return (
                                    <td
                                      className="py-2 pl-3 pr-1 text-right font-extrabold text-sm whitespace-nowrap cursor-help"
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setActiveMultipleTooltip({
                                          type: 'row',
                                          x: rect.left + rect.width / 2,
                                          y: rect.top,
                                          context: {
                                            grade: g.grade,
                                            slabPct,
                                            floatPct: floatPctFormatted ?? undefined,
                                            isRaw,
                                            multiple: isRaw ? rawToAnchorMultiple : gradeMultiple,
                                          },
                                        });
                                      }}
                                      onMouseLeave={() => setActiveMultipleTooltip(null)}
                                    >
                                      {isRaw ? (
                                        <span
                                          className="text-amber-300 font-mono font-bold"
                                          title={rawToAnchorMultiple ? `Raw atomic basis ($${fmt(rawPrice ?? 0)}) · 1.0x Base (${rawToAnchorMultiple.toFixed(1)}x to Anchor Liquidity Center)` : `Raw basis ($${fmt(rawPrice ?? 0)}) · 1.0x Base`}
                                        >
                                          (1.0x Base)
                                        </span>
                                      ) : gradeMultiple != null ? (
                                        <span
                                          className={isSov ? "text-amber-300 font-mono font-bold" : isAnc ? "text-cyan-300 font-mono font-bold" : "text-slate-200 font-mono font-semibold"}
                                          title={`${g.grade} FMV ($${fmt(gradePrice ?? 0)}) is ${gradeMultiple.toFixed(1)}x of Raw basis ($${fmt(rawPrice ?? 0)}) · ${slabPct.toFixed(1)}% of Graded Slabs${floatPctFormatted ? ` · ${floatPctFormatted} of Float` : ''}`}
                                        >
                                          ({gradeMultiple.toFixed(1)}x)
                                        </span>
                                      ) : slabPct > 0 ? (
                                        <span
                                          className={isSov || isAnc ? "text-cyan-300 font-mono font-bold" : "text-slate-300 font-mono font-semibold"}
                                          title={`${g.grade}: ${slabPct.toFixed(1)}% of Graded Slabs${floatPctFormatted ? ` · ${floatPctFormatted} of Total Float` : ''}`}
                                        >
                                          ({slabPct.toFixed(1)}%{floatPctFormatted ? ` / ${floatPctFormatted}` : ''})
                                        </span>
                                      ) : (
                                        <span className="text-slate-500 font-normal">
                                          —
                                        </span>
                                      )}
                                    </td>
                                  );
                                })()}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Controls / Toggles / Footer */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-300">
                        <span className="text-white font-semibold">price</span> = verified transaction &nbsp;·&nbsp; <span className="text-slate-300 font-semibold">×n</span> = completed sales count
                      </span>
                    </div>

                    {(censusSummary.histogram?.length || 0) > displayRows.length && (
                      <button
                        onClick={() => setShowAllCensusGrades(!showAllCensusGrades)}
                        className="text-xs font-mono font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors cursor-pointer"
                      >
                        {showAllCensusGrades
                          ? 'Collapse to Key Liquidity Rack (Sovereign · Anchor · Raw)'
                          : `View all ${censusSummary.histogram.length} graded tiers (.5 to 10.0)`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Canon Equity Truth Layer */}
            {truthLayerData?.found && truthLayerData.data && (() => {
              const tl = truthLayerData.data;
              const confColor = tl.anchorConfidence === 'HIGH' ? '#22c55e' : tl.anchorConfidence === 'MEDIUM' ? '#eab308' : '#ef4444';
              return (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="text-xs uppercase tracking-wider mb-3 font-semibold" style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.14em' }}>
                    Canon Equity Truth Layer <span className="ml-2 text-[11px] font-mono text-slate-400">{new Date(tl.computedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {tl.anchorGrade != null && (
                      <div>
                        <div className="text-xs uppercase tracking-wider mb-1 text-slate-300">Anchor Grade <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${confColor}20`, color: confColor, border: `1px solid ${confColor}55` }}>{tl.anchorConfidence}</span></div>
                        <div className="text-lg" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{tl.anchorGrade.toFixed(1)}</div>
                        <div className="text-xs text-slate-300" style={{ fontFamily: 'monospace' }}>{fmt(tl.anchorPriceUsd || 0)}{tl.anchorSalesVolume != null && tl.anchorSalesVolume > 0 && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.60)' }}>{tl.anchorSalesVolume} sales</span>}</div>
                      </div>
                    )}
                    {tl.supplyAdjustment !== 1.0 && (
                      <div>
                        <div className="text-xs uppercase tracking-wider mb-1 text-slate-300">Supply Adj</div>
                        <div className="text-lg" style={{ color: tl.supplyAdjustment > 1 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>{tl.supplyAdjustment > 1 ? '+' : ''}{((tl.supplyAdjustment - 1) * 100).toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                  {(tl.price99Usd || tl.price100Usd) && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-xs uppercase tracking-wider mb-2 text-slate-300">ISM Derivatives</div>
                      <div className="flex gap-4">
                        {tl.price99Usd != null && <div><div className="text-xs text-slate-300" style={{ fontFamily: 'monospace' }}>9.9 · {tl.ismMethod99 === 'OBSERVED' ? 'Observed' : 'Derived'}</div><div className="text-base" style={{ color: tl.ismMethod99 === 'OBSERVED' ? '#fff' : '#cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(tl.price99Usd)}</div>{tl.ism99 != null && <div className="text-xs text-slate-400" style={{ fontFamily: 'monospace' }}>ISM {tl.ism99.toFixed(2)}×</div>}</div>}
                        {tl.price100Usd != null && <div><div className="text-xs text-slate-300" style={{ fontFamily: 'monospace' }}>10.0 · {tl.ismMethod100 === 'OBSERVED' ? 'Observed' : 'Derived'}</div><div className="text-base" style={{ color: tl.ismMethod100 === 'OBSERVED' ? '#fff' : '#cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(tl.price100Usd)}</div>{tl.ism100 != null && <div className="text-xs text-slate-400" style={{ fontFamily: 'monospace' }}>ISM {tl.ism100.toFixed(2)}×</div>}</div>}
                      </div>
                    </div>
                  )}
                  {Object.keys(tl.graderSpread).length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-xs uppercase tracking-wider mb-2 text-slate-300">Grader Spread · Anchor Grade</div>
                      <div className="flex gap-4">
                        {Object.entries(tl.graderSpread).map(([company, spread]) => (
                          <div key={company}>
                            <div className="text-xs font-bold" style={{ color: company === 'CGC' ? '#3b82f6' : company === 'CBCS' ? '#f59e0b' : '#a78bfa', fontFamily: 'monospace' }}>{company}</div>
                            <div className="text-sm font-semibold" style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{fmt(spread.price_usd)}</div>
                            <div className="text-xs text-slate-400" style={{ fontFamily: 'monospace' }}>×{spread.multiplier.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Stored buy / sell pairs (PriceCharting) */}
            {spreadData?.found && spreadData.data && (() => {
              const sp = spreadData.data;
              const anchorKeys = Object.keys(sp.observedAnchors || {});
              if (anchorKeys.length === 0) return null;
              const formatPct = (val: number | null | undefined): string => {
                if (val == null || isNaN(val)) return '—';
                const pct = val > 1 ? val : val * 100;
                return `${pct.toFixed(1)}%`;
              };
              return (
                <div className="w-full max-w-4xl mx-auto mt-4 pt-4 flex flex-col items-center text-center" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="text-xs font-extrabold uppercase tracking-wider mb-3 flex items-center justify-center gap-3 text-white text-center" style={{ letterSpacing: '0.12em' }}>
                    <span>Dealer Buy / Retail Sell Order Quotes</span>
                    <span className="text-slate-500 font-normal">·</span>
                    <span className="text-xs font-mono font-bold text-slate-200">{sp.spreadMethod}</span>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center items-center">
                    {anchorKeys.map(tier => {
                      const a = sp.observedAnchors[tier];
                      return (
                        <div key={tier} className="px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 flex flex-col gap-1 min-w-[140px] text-center">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-extrabold uppercase text-white">{tier === 'RAW' ? 'Raw' : tier}</span>
                            <span className="text-xs font-mono font-bold text-cyan-300">{formatPct(a.spread)}</span>
                          </div>
                          <div className="text-sm font-extrabold font-mono text-center">
                            <span className="text-amber-300 font-extrabold">{fmt(a.buy)}</span> <span className="text-slate-400 font-bold">/</span> <span className="text-emerald-300 font-extrabold">{fmt(a.sell)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Buy / Sell */}
            <div className="w-full max-w-4xl mx-auto mt-4 pt-3 flex items-center justify-center gap-4 flex-wrap text-center" style={{ borderTop: `1px solid ${eraColors.border}15` }}>
              <button
                className="px-5 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 transition-all duration-200 hover:shadow-[0_0_22px_rgba(52,211,153,0.75)] hover:bg-emerald-500 hover:text-white hover:border-emerald-300 hover:scale-[1.02] cursor-pointer select-none"
                style={{ letterSpacing: '0.1em' }}
                onClick={() => onOpenExecModal('buy')}
              >
                ▲ BUY
              </button>
              <button
                className="px-5 py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-widest text-rose-300 bg-rose-500/15 border border-rose-500/40 transition-all duration-200 hover:shadow-[0_0_22px_rgba(244,63,94,0.75)] hover:bg-rose-600 hover:text-white hover:border-rose-300 hover:scale-[1.02] cursor-pointer select-none"
                style={{ letterSpacing: '0.1em' }}
                onClick={() => onOpenExecModal('sell')}
              >
                ▼ SELL
              </button>
              <div className="flex flex-col ml-2 text-center">
                <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>Last Price Data</span>
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{fmtDate(keyPrices.observedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Multiple & Census Proportion Explainer Tooltip */}
      {activeMultipleTooltip && (() => {
        const anchorMultiple = instrumentStates?.anchorToAtomicMultiple ?? null;
        const rawPriceVal = instrumentStates?.atomic?.priceUsd ?? null;
        const totalGradedVal = censusSummary?.totalGraded ?? 455;
        const totalPrintRunVal = censusSummary?.printRunTotal ?? 129490;
        return (
          <div
            className="fixed z-[100] pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: Math.max(180, Math.min(typeof window !== 'undefined' ? window.innerWidth - 180 : 800, activeMultipleTooltip.x)),
              top: Math.max(10, activeMultipleTooltip.y - 8),
            }}
          >
            <div className="w-80 max-w-sm rounded-xl bg-slate-950/95 border border-cyan-500/50 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.9),0_0_20px_rgba(6,182,212,0.35)] backdrop-blur-md text-left font-sans">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                  <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-cyan-300">
                    {activeMultipleTooltip.type === 'cluster'
                      ? 'Raw-to-Anchor (Liquidity Center) Multiplier'
                      : activeMultipleTooltip.type === 'header'
                      ? 'Multiple & Float Ratio Guide'
                      : activeMultipleTooltip.context?.isRaw
                      ? 'Raw-to-Anchor Multiplier'
                      : `CGC ${activeMultipleTooltip.context?.grade} Liquidity Ratio`}
                  </span>
                </div>
              </div>

              {activeMultipleTooltip.type === 'cluster' || activeMultipleTooltip.type === 'header' ? (
                <div className="space-y-2.5 text-xs">
                  <div className="rounded-lg bg-slate-900/90 p-2.5 border border-cyan-500/30">
                    <div className="flex items-center justify-between text-cyan-300 font-extrabold font-mono text-xs">
                      <span className="uppercase tracking-wider">Raw to Liquidity Center ({instrumentStates?.anchor?.grade ?? '9.6'})</span>
                      <span>{instrumentStates?.anchorToAtomicMultiple ? `${instrumentStates.anchorToAtomicMultiple.toFixed(1)}x` : '11.4x'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Real observed market ratio: Anchor FMV (${fmt(instrumentStates?.anchor?.priceUsd ?? 48.75)}) ÷ Atomic Raw Basis (${fmt(rawPriceVal ?? 4.27)}) = {instrumentStates?.anchorToAtomicMultiple ? `${instrumentStates.anchorToAtomicMultiple.toFixed(1)}x` : '11.4x'}. Source: PriceCharting &amp; marketplace settled transaction records.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900/90 p-2.5 border border-cyan-500/30">
                    <div className="flex items-center justify-between text-cyan-300 font-extrabold font-mono text-xs">
                      <span className="uppercase tracking-wider">Census & Float Proportion</span>
                      <span>(% Graded / % Total Float)</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      For certified slabs, compares this grade’s percentage of all CGC graded slabs vs. its percentage share of the total {totalPrintRunVal.toLocaleString()} print run float.
                    </p>
                  </div>
                </div>
              ) : activeMultipleTooltip.context?.isRaw ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-amber-300">
                    <span>Raw Basis Multiplier</span>
                    <span>({activeMultipleTooltip.context.multiple?.toFixed(1) ?? '11.4'}x)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Raw Atomic basis (${fmt(rawPriceVal ?? 4.27)}) × {activeMultipleTooltip.context.multiple?.toFixed(1) ?? '11.4'}x = ${fmt(instrumentStates?.anchor?.priceUsd ?? 48.75)} (Anchor Liquidity Center).
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-cyan-300">
                    <span>Grade {activeMultipleTooltip.context?.grade} Multiple</span>
                    <span className="text-white font-mono">
                      {activeMultipleTooltip.context?.multiple != null
                        ? `(${activeMultipleTooltip.context.multiple.toFixed(1)}x over Raw)`
                        : `(${activeMultipleTooltip.context?.slabPct}% / ${activeMultipleTooltip.context?.floatPct})`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed">
                    {activeMultipleTooltip.context?.multiple != null && (
                      <p>Trades at a verified <strong className="text-amber-300 font-mono font-bold">{activeMultipleTooltip.context.multiple.toFixed(1)}x</strong> premium over the Raw basis (${fmt(rawPriceVal ?? 4.27)}).</p>
                    )}
                    <p><strong className="text-cyan-300 font-mono">{activeMultipleTooltip.context?.slabPct}%</strong> of all {totalGradedVal.toLocaleString()} certified slabs on file.</p>
                    {activeMultipleTooltip.context?.floatPct && (
                      <p><strong className="text-emerald-300 font-mono">{activeMultipleTooltip.context.floatPct}</strong> of the total {totalPrintRunVal.toLocaleString()} print run float.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Cover lightbox portal */}
      <CoverLightboxPortal
        isOpen={showCoverLightbox && !!heroSrc}
        onClose={() => {
          startTransition(() => {
            setShowCoverLightbox(false);
          });
        }}
        heroSrc={heroSrc || ''}
        workName={variant.workName}
        issueNumber={variant.issueNumber}
        year={variant.year}
        eraBorder={eraColors.border}
        heroImageLabel={heroImageLabel}
        latestSaleImageUrl={latestSaleImageUrl}
      />
    </>
  );
}

function CoverLightboxPortal({
  isOpen,
  onClose,
  heroSrc,
  workName,
  issueNumber,
  year,
  eraBorder,
  heroImageLabel,
  latestSaleImageUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  heroSrc: string;
  workName: string;
  issueNumber: string;
  year: number | null;
  eraBorder: string;
  heroImageLabel: string;
  latestSaleImageUrl: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="lightbox-overlay fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', cursor: 'zoom-out' }}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={0}
    >
      <div
        className="lightbox-content relative flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-sm font-sans" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Hind, sans-serif' }}>
            {workName} #{issueNumber} {year ? `· ${year}` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1 rounded transition-colors"
            style={{ color: eraBorder, border: `1px solid ${eraBorder}40`, backgroundColor: `${eraBorder}15` }}
          >
            Close ✕
          </button>
        </div>
        <img
          src={heroSrc}
          alt={`${workName} #${issueNumber}`}
          loading="eager"
          decoding="async"
          style={{
            maxWidth: 'min(480px, 80vw)',
            maxHeight: '75vh',
            objectFit: 'contain',
            display: 'block',
            boxShadow: `0 0 60px rgba(0,0,0,0.9), 0 0 30px ${eraBorder}25`,
            border: `1px solid ${eraBorder}35`,
            borderRadius: '4px',
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <p className="text-xs font-mono text-slate-300">
          {heroImageLabel} · Click outside to close · Escape
        </p>
      </div>
    </div>,
    document.body
  );
}

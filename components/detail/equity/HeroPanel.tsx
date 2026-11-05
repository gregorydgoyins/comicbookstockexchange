"use client";

import { useState, useEffect, useTransition, type CSSProperties } from 'react';
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
  const [hoveredCensusGrade, setHoveredCensusGrade] = useState<string | null>(null);
  const [pinnedCensusGrade, setPinnedCensusGrade] = useState<string | null>(null);
  const [showAllCensusGrades, setShowAllCensusGrades] = useState(false);
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

  const proxiedSaleUrl    = proxyHeroCoverUrl(latestSaleImageUrl);
  const isCoverSuppressed = variant.coverVerified === false || !!variant.yearDivergence;
  const coverAllowed    = variant.coverVerified === false
    ? false
    : variant.coverVerified === true
      ? true
      : (variant.productYear === null || variant.productYear === variant.year) && !!variant.coverImageUrl;
  const proxiedCoverUrl = coverAllowed ? proxyHeroCoverUrl(variant.coverImageUrl) : null;
  const heroSrc = heroImgFailStage === 0 ? (proxiedSaleUrl || proxiedCoverUrl) : heroImgFailStage === 1 ? (proxiedSaleUrl ? proxiedCoverUrl : null) : null;
  const isShowingSaleImage = !!(proxiedSaleUrl && heroImgFailStage === 0);
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
                return (
                  <div className="mb-2">
                    <div className="inline-flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className="text-base px-4 py-1.5 rounded uppercase tracking-widest font-semibold pp-hover-var-glow" style={{ backgroundColor: `${ac.color}18`, color: ac.color, border: `1px solid ${ac.color}60`, fontFamily: 'monospace', letterSpacing: '0.18em', boxShadow: `0 0 12px ${ac.glowColor}, inset 0 0 8px ${ac.color}08`, cursor: 'default', ['--pp-hover-shadow' as string]: `0 0 32px ${ac.color}cc, 0 0 60px ${ac.color}44, inset 0 0 14px ${ac.color}14`, ['--pp-hover-bg' as string]: `${ac.color}26` } as CSSProperties}>
                        {ac.label}
                      </span>
                      {(variant as any).ticker && (
                        <span className="text-base px-3.5 py-1 rounded font-mono font-bold tracking-wider" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.45)' }}>
                          ${String((variant as any).ticker).replace(/^\$/, '')}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded uppercase tracking-wider font-semibold" style={{ backgroundColor: `${eraColors.border}88`, color: 'rgba(255,255,255,0.95)', border: `1px solid ${eraColors.border}cc`, fontFamily: 'monospace' }}>{variant.publisher}</span>
                        {variant.era && <span className="text-xs px-2.5 py-1 rounded uppercase tracking-wider font-semibold" style={{ backgroundColor: `${eraColors.border}88`, color: 'rgba(255,255,255,0.85)', border: `1px solid ${eraColors.border}cc`, fontFamily: 'monospace' }}>{ERA_MAP[variant.era.toLowerCase()] || variant.era}</span>}
                        {variant.scarcityTier && (
                          <div className="flex items-center gap-1.5">
                          <ScarcityIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.9)', filter: `drop-shadow(0 0 5px ${scarcityColors.border}ff)` }} />
                          <span className="text-xs px-2.5 py-1 rounded uppercase tracking-wider font-semibold" style={{ backgroundColor: `${scarcityColors.border}50`, color: 'rgba(255,255,255,0.92)', border: `1px solid ${scarcityColors.border}ff` }}>{scarcityColors.label}</span>
                          </div>
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
                    <h1 className="text-4xl sm:text-5xl mb-0" style={{ fontWeight: 600, lineHeight: 1.1, color: lowConfidence ? 'rgba(241,245,249,0.65)' : '#fff' }}>
                      {variant.workName} #{variant.issueNumber}
                      <span style={{ color: 'rgba(255,255,255,0.62)', fontWeight: 400, fontSize: '2rem', marginLeft: '0.6rem' }}>{(variant.productYear ?? variant.year) != null ? ` (${variant.productYear ?? variant.year})` : ''}</span>
                    </h1>
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
              <p className="text-xs mb-1 tracking-widest uppercase font-mono font-medium" style={{ color: `${eraColors.border}ee`, letterSpacing: '0.12em' }}>
                {variant.publisher} · {variant.workName} · #{variant.issueNumber}
                {variantTypeLabel(variant.variantKey) ? ` (${variantTypeLabel(variant.variantKey)})` : ''}
                {variant.yearDivergence ? ` · variant year ${variant.productYear} / issue record ${variant.year}` : variant.era ? ` · ${ERA_LABELS[variant.era] || variant.era}` : ''}
                {variant.productId ? ` · ID-${variant.productId}` : ''}
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
                const primary = [...creators].sort((a, b) => getRoleRank(a.role) - getRoleRank(b.role)).slice(0, 12);
                if (primary.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {primary.map((c, i) => (
                      <span key={`${c.name}-${c.role}-${i}`} className="inline-flex items-center">
                        <Link href={`/wiki/entry/${slugifyCreatorName(c.name)}`} className="hover:underline">
                          <span style={{ fontSize: '12px', color: i === 0 ? eraColors.border : 'rgba(255,255,255,0.85)', fontFamily: 'Hind, sans-serif' }}>
                            <span style={{ color: 'rgba(255,255,255,0.60)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>{c.role}</span>{' '}
                            <span className="font-medium text-slate-200">{c.name}</span>
                          </span>
                        </Link>
                        {i < primary.length - 1 && (
                          <span style={{ color: 'rgba(255,255,255,0.40)', margin: '0 8px' }}>·</span>
                        )}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Variant Lineage Gallery: Sister Covers Strip */}
              {relationalData?.variants && relationalData.variants.length > 1 && (() => {
                const totalVars = relationalData.variants.length;
                const activeGcdId = variant.productId ? parseInt(variant.productId, 10) : null;
                const activeIdx = relationalData.variants.findIndex((v) => v.id === activeGcdId || v.catalogId === variantId);
                return (
                  <div className="my-2 p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider">
                      <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Variant Lineage Gallery ({totalVars} Published Covers)
                      </span>
                      {activeIdx !== -1 && (
                        <span className="text-slate-400">
                          Viewing Cover {activeIdx + 1} of {totalVars}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {relationalData.variants.map((v, vIdx) => {
                        const isCurrent = v.catalogId === variantId || v.id === activeGcdId;
                        // Format clean display labels:
                        // "Direct Edition", "Djurdjević Connecting", "Pichelli 2nd Print", "Bagley 2nd Print", "Newsstand"
                        let cleanLabel = v.variantName
                          .replace(/^Variant Edition\s*-\s*/i, "")
                          .replace(/^2nd Printing Variant\s*-\s*/i, "")
                          .replace(/\s+Cover$/i, "")
                          // GCD's "Connecting" describes the cover art (it links with sister covers) — not a status
                          .replace(/\s+Connecting$/i, " Variant")
                          .trim();

                        if (/2nd Print/i.test(v.variantName) && !/2nd Print/i.test(cleanLabel)) {
                          cleanLabel = `${cleanLabel} 2nd Print`;
                        }

                        const shortLabel = cleanLabel.length > 28 ? cleanLabel.slice(0, 26) + "…" : cleanLabel;

                        const content = (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-all border"
                            style={{
                              backgroundColor: isCurrent ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                              borderColor: isCurrent ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)',
                              color: isCurrent ? '#22d3ee' : '#cbd5e1',
                              fontWeight: isCurrent ? 600 : 400,
                            }}
                            title={`${v.variantName}${v.coverArtist ? ` · Art by ${v.coverArtist}` : ''}`}
                          >
                            <span>{shortLabel || `Cover #${v.id}`}</span>
                            {isCurrent && <span className="text-[10px] uppercase tracking-wider bg-cyan-500/20 px-1.5 py-0.5 rounded ml-1 text-cyan-300 font-bold">ACTIVE</span>}
                          </span>
                        );

                        if (v.catalogId && !isCurrent) {
                          return (
                            <Link key={v.id} href={`/comics/${v.catalogId}`}>
                              {content}
                            </Link>
                          );
                        }

                        return <span key={v.id}>{content}</span>;
                      })}
                    </div>
                  </div>
                );
              })()}

              {wikiSummary && !variant.yearDivergence ? (
                <p className="text-xs mb-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)', maxWidth: '620px' }}>{wikiSummary}</p>
              ) : null}

              {/* Instrument states: Sovereign / Anchor / Atomic */}
              <div className="flex gap-6 flex-wrap">
                {instrumentStates?.sovereign && (
                  <div>
                    <div
                      className="text-xs uppercase tracking-widest mb-1 font-semibold"
                      style={{ color: eraColors.border, letterSpacing: '0.12em' }}
                      title="Direct Universal Blue Label — Unmodified, Unsigned"
                    >
                      {instrumentStates.anchor?.grade === instrumentStates.sovereign.grade
                        ? `Sovereign & Anchor · CGC ${instrumentStates.sovereign.grade}`
                        : `Sovereign (Blue Label) · CGC ${instrumentStates.sovereign.grade}`}
                      {instrumentStates.sovereign.salesVolume != null && instrumentStates.sovereign.salesVolume > 0 && (
                        <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: '5px' }}>
                          {instrumentStates.sovereign.salesVolume} sales
                        </span>
                      )}
                    </div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600, textShadow: `0 0 20px ${eraColors.border}40` }}>{fmt(instrumentStates.sovereign.priceUsd)}</div>
                    {keyPrices.delta24h != null && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {keyPrices.delta24h >= 0 ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                        <span className="text-xs tabular-nums" style={{ color: keyPrices.delta24h >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace', fontWeight: 600 }}>{keyPrices.delta24h >= 0 ? '+' : ''}{keyPrices.delta24h.toFixed(2)}%</span>
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">24h</span>
                      </div>
                    )}
                  </div>
                )}
                {instrumentStates?.anchor && instrumentStates.anchor.grade !== instrumentStates?.sovereign?.grade && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: '#38bdf8', letterSpacing: '0.12em' }}>Anchor (Most Sales) · CGC {instrumentStates.anchor.grade}{instrumentStates.anchor.salesVolume > 0 && <span style={{ color: 'rgba(255,255,255,0.74)', marginLeft: '4px' }}>{instrumentStates.anchor.salesVolume} sales</span>}</div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(instrumentStates.anchor.priceUsd)}</div>
                  </div>
                )}
                {instrumentStates?.atomic && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.68)', letterSpacing: '0.12em' }}>Raw (Ungraded Price)</div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#cbd5e1', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(instrumentStates.atomic.priceUsd)}</div>
                  </div>
                )}
                {!instrumentStates?.sovereign && !instrumentStates?.atomic && !instrumentStates?.anchor && (() => {
                  const fallbackPrice = keyPrices.display_fmv_usd ?? keyPrices.fmv98Usd ?? keyPrices.fmvRawUsd;
                  if (fallbackPrice == null) return null;
                  const gradeLabel = keyPrices.display_grade ? `CGC ${keyPrices.display_grade}` : keyPrices.fmv98Usd ? 'CGC 9.8' : 'Raw';
                  return (
                    <div>
                      <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: eraColors.border, letterSpacing: '0.12em' }}>{gradeLabel}</div>
                      <div className="text-3xl sm:text-4xl" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600, textShadow: `0 0 20px ${eraColors.border}40` }}>{fmt(fallbackPrice)}</div>
                      {keyPrices.delta24h != null && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {keyPrices.delta24h >= 0 ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#4ade80' }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                          <span className="text-xs tabular-nums" style={{ color: keyPrices.delta24h >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace', fontWeight: 600 }}>{keyPrices.delta24h >= 0 ? '+' : ''}{keyPrices.delta24h.toFixed(2)}%</span>
                          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">24h</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {instrumentStates?.sovereignToAtomicMultiple != null && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: eraColors.border, letterSpacing: '0.12em' }}>
                      {instrumentStates.anchor?.grade === instrumentStates.sovereign?.grade
                        ? `Raw to Sovereign & Anchor (${instrumentStates?.sovereign?.grade ?? '9.8'})`
                        : `Raw to Sovereign (${instrumentStates?.sovereign?.grade ?? '9.8'})`}
                    </div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>({instrumentStates.sovereignToAtomicMultiple.toFixed(1)}x)</div>
                  </div>
                )}
                {instrumentStates?.anchorToAtomicMultiple != null && instrumentStates.anchor?.grade !== instrumentStates.sovereign?.grade && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1 font-semibold" style={{ color: '#38bdf8', letterSpacing: '0.12em' }}>
                      Raw to Anchor ({instrumentStates?.anchor?.grade ?? '6.0'})
                    </div>
                    <div className="text-3xl sm:text-4xl" style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>({instrumentStates.anchorToAtomicMultiple.toFixed(1)}x)</div>
                  </div>
                )}
              </div>
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
              const rawToSovMultiple = instrumentStates?.sovereignToAtomicMultiple ?? null;

              const gradePriceDetailMap = new Map<string, GradePrice>(
                gradeLattice.filter(gp => gp.priceUsd > 0).map(gp => [gp.grade, gp])
              );

              // Find grades with >= 200 verified sales
              const gradesWith200PlusSales = new Set<string>();
              for (const [grade, gp] of gradePriceDetailMap.entries()) {
                if (gp.salesVolume != null && gp.salesVolume >= 200) {
                  gradesWith200PlusSales.add(grade);
                }
              }

              // Target grades for compact view: Sovereign, Anchor, any >= 200 sales, and RAW
              const targetGrades = new Set<string>();
              if (anchorGrade) targetGrades.add(anchorGrade);
              if (sovereignGrade) targetGrades.add(sovereignGrade);
              for (const g of gradesWith200PlusSales) targetGrades.add(g);

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
                displayRows = (censusSummary.histogram || [])
                  .filter(g => targetGrades.has(g.grade))
                  .map(g => ({
                    ...g,
                    isSov: g.grade === sovereignGrade,
                    isAnc: g.grade === anchorGrade,
                    isHighVolume: gradesWith200PlusSales.has(g.grade),
                  }));

                // Ensure anchor grade is included even if 0 copies in census
                if (anchorGrade && !displayRows.some(r => r.grade === anchorGrade)) {
                  displayRows.unshift({
                    grade: anchorGrade,
                    count: 0,
                    isAnc: true,
                  });
                }
                // Ensure sovereign grade is included
                if (sovereignGrade && !displayRows.some(r => r.grade === sovereignGrade)) {
                  const sovCount = censusSummary.histogram?.find(g => g.grade === sovereignGrade)?.count || 0;
                  displayRows.push({
                    grade: sovereignGrade,
                    count: sovCount,
                    isSov: true,
                  });
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
                  isHighVolume: gradesWith200PlusSales.has(g.grade),
                }));
                if (rawPrice != null) {
                  displayRows.push({
                    grade: 'RAW',
                    count: 0,
                    isRaw: true,
                  });
                }
              }

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
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  {/* Clean header without raw snapshot / PG / NG clutter */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-bold" style={{ color: eraColors.border, letterSpacing: '0.12em' }}>
                        CGC Census & Key Liquidity Rack
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        · {censusSummary.totalGraded.toLocaleString()} Certified Slabs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {rawToSovMultiple != null && sovereignGrade === anchorGrade && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color: eraColors.border, backgroundColor: `${eraColors.border}18`, border: `1px solid ${eraColors.border}44` }}>
                          Raw to Sovereign &amp; Anchor ({sovereignGrade ?? '9.8'}): ({rawToSovMultiple.toFixed(1)}x)
                        </span>
                      )}
                      {rawToSovMultiple != null && sovereignGrade !== anchorGrade && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color: eraColors.border, backgroundColor: `${eraColors.border}18`, border: `1px solid ${eraColors.border}44` }}>
                          Raw to Sovereign ({sovereignGrade ?? '9.8'}): ({rawToSovMultiple.toFixed(1)}x)
                        </span>
                      )}
                      {rawToAnchorMultiple != null && sovereignGrade !== anchorGrade && (
                        <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                          Raw to Anchor ({anchorGrade ?? '6.0'}): ({rawToAnchorMultiple.toFixed(1)}x)
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        As of {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* Tabular Key Liquidity Rack */}
                  <div className="w-full max-w-4xl overflow-x-auto">
                    <table className="w-full border-collapse font-mono text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-300 font-semibold">
                          <th className="py-1.5 pr-3 text-right whitespace-nowrap w-12">Grade</th>
                          <th className="py-1.5 px-3 text-left min-w-[140px]">Census Distribution</th>
                          <th className="py-1.5 px-3 text-right whitespace-nowrap">CGC Slabs</th>
                          <th className="py-1.5 px-3 text-center whitespace-nowrap w-14">Role</th>
                          <th className="py-1.5 px-3 text-right whitespace-nowrap">FMV</th>
                          <th className="py-1.5 px-3 text-center whitespace-nowrap w-16">Sales</th>
                          <th className="py-1.5 pl-3 pr-1 text-right whitespace-nowrap">Multiple</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {displayRows.map((g, idx) => {
                          const isSov = g.isSov, isAnc = g.isAnc, isRaw = g.isRaw;
                          const barPct = isRaw ? 100 : Math.max(2, (g.count / maxCount) * 100);
                          const barColor = isRaw
                            ? 'rgba(245, 158, 11, 0.25)'
                            : isSov
                            ? eraColors.border
                            : isAnc
                            ? '#38bdf8'
                            : 'rgba(255,255,255,0.25)';

                          const lColor = isRaw
                            ? '#f59e0b'
                            : isSov
                            ? eraColors.border
                            : isAnc
                            ? '#38bdf8'
                            : 'rgba(255,255,255,0.70)';

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
                            : isAnc && instrumentStates?.anchor
                            ? instrumentStates.anchor.salesVolume
                            : isSov && instrumentStates?.sovereign
                            ? (instrumentStates.sovereign.salesVolume ?? gpDetail?.salesVolume ?? null)
                            : gpDetail?.salesVolume ?? null;

                          const hasConfirmedSales = gradeSalesVol != null && gradeSalesVol > 0;
                          const priceColor = isRaw
                            ? '#fbbf24'
                            : isSov
                            ? eraColors.border
                            : isAnc
                            ? '#38bdf8'
                            : hasConfirmedSales ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.38)';

                          const isTooltipOpen = hoveredCensusGrade === g.grade || pinnedCensusGrade === g.grade;
                          const salesVolume = gradeSalesVol;
                          const isTopRow = idx < 2;

                          return (
                            <tr
                              key={`${g.grade}-${idx}`}
                              className="group hover:bg-white/[0.04] transition-colors relative cursor-pointer"
                              onMouseEnter={() => setHoveredCensusGrade(g.grade)}
                              onMouseLeave={() => setHoveredCensusGrade(null)}
                              onClick={() => setPinnedCensusGrade(pinnedCensusGrade === g.grade ? null : g.grade)}
                            >
                              {/* Grade Label */}
                              <td className="relative py-1.5 pr-3 text-right font-bold whitespace-nowrap" style={{ color: lColor }}>
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <span>{g.grade}</span>
                                  <Info className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity text-slate-400" />
                                </div>

                                {/* Instant Accessible Floating Tooltip (Never Clipped) */}
                                {isTooltipOpen && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      ...(isTopRow ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }),
                                      left: '0px',
                                      zIndex: 100,
                                      backgroundColor: 'rgba(8, 12, 22, 0.98)',
                                      border: `1.5px solid ${isSov ? eraColors.border : isAnc ? '#38bdf8' : 'rgba(255,255,255,0.22)'}`,
                                      borderRadius: '6px',
                                      padding: '10px 14px',
                                      minWidth: '220px',
                                      whiteSpace: 'nowrap',
                                      boxShadow: `0 8px 30px rgba(0,0,0,0.90)${isSov ? `, 0 0 15px ${eraColors.border}40` : ''}`,
                                      textAlign: 'left',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: lColor, marginBottom: '6px', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                      <span>{isRaw ? 'Ungraded / Physical RAW' : `CGC ${g.grade}`}</span>
                                      {isSov && isAnc ? (
                                        <span style={{ color: eraColors.border, fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: `${eraColors.border}20`, border: `1px solid ${eraColors.border}50` }}>SOVEREIGN & ANCHOR</span>
                                      ) : isSov ? (
                                        <span style={{ color: eraColors.border, fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: `${eraColors.border}20`, border: `1px solid ${eraColors.border}50` }}>SOVEREIGN APEX</span>
                                      ) : isAnc ? (
                                        <span style={{ color: '#38bdf8', fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56,189,248,0.20)', border: '1px solid rgba(56,189,248,0.50)' }}>LIQUIDITY ANCHOR</span>
                                      ) : null}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', alignItems: 'baseline' }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.60)', textTransform: 'uppercase' }}>CGC Census</span>
                                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.90)', textAlign: 'right', fontWeight: 600 }}>
                                        {isRaw ? 'Ungraded Physical' : `${g.count.toLocaleString()} slabs`}
                                      </span>
                                      {gradePrice != null && (
                                        <>
                                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.60)', textTransform: 'uppercase' }}>Assessed FMV</span>
                                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: priceColor, textAlign: 'right', fontWeight: 700 }}>{fmt(gradePrice)}</span>
                                        </>
                                      )}
                                      {salesVolume != null && (
                                        <>
                                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.60)', textTransform: 'uppercase' }}>Trades</span>
                                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.80)', textAlign: 'right' }}>{salesVolume.toLocaleString()} verified comps</span>
                                        </>
                                      )}
                                      {isAnc && !isSov && rawToAnchorMultiple != null && (
                                        <>
                                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase' }}>Anchor Ratio</span>
                                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8', textAlign: 'right', fontWeight: 700 }}>{rawToAnchorMultiple.toFixed(1)}x over Raw</span>
                                        </>
                                      )}
                                      {isSov && rawToSovMultiple != null && (
                                        <>
                                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: eraColors.border, textTransform: 'uppercase' }}>Sov Multiple</span>
                                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: eraColors.border, textAlign: 'right', fontWeight: 700 }}>{rawToSovMultiple.toFixed(1)}x over Raw</span>
                                        </>
                                      )}
                                    </div>
                                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.10)', fontSize: '10px', color: 'rgba(255,255,255,0.50)', fontFamily: 'monospace' }}>
                                      {pinnedCensusGrade === g.grade ? 'Tap to unpin · Investopedia Live Comps' : 'Click/tap row to pin open'}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Histogram Bar */}
                              <td className="py-1 px-3">
                                <div className="w-full h-2.5 rounded-sm overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                  <div
                                    className="h-full rounded-sm transition-all duration-300"
                                    style={{
                                      width: `${barPct}%`,
                                      backgroundColor: barColor,
                                      boxShadow: isSov ? `0 0 6px ${eraColors.border}60` : isAnc ? '0 0 6px rgba(56,189,248,0.40)' : 'none',
                                      borderLeft: isRaw ? '3px solid #f59e0b' : 'none',
                                    }}
                                  />
                                </div>
                              </td>

                              {/* Population Count */}
                              <td className="py-1 px-3 text-right font-medium whitespace-nowrap" style={{ color: isRaw ? undefined : lColor }}>
                                {isRaw ? <span className="text-slate-500">—</span> : g.count.toLocaleString()}
                              </td>

                              {/* Classification Badge */}
                              <td className="py-1 px-3 text-center whitespace-nowrap">
                                {isSov && (
                                  <span className="inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded border font-mono font-bold" style={{ borderColor: `${eraColors.border}60`, color: eraColors.border, backgroundColor: `${eraColors.border}15` }}>
                                    SOV
                                  </span>
                                )}
                                {isAnc && !isSov && (
                                  <span className="inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/50 text-cyan-300 bg-cyan-950/40 font-mono font-bold">
                                    ANC
                                  </span>
                                )}
                                {isRaw && (
                                  <span className="inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-300 bg-amber-950/40 font-mono font-bold">
                                    RAW
                                  </span>
                                )}
                                {!isSov && !isAnc && !isRaw && g.isHighVolume && (
                                  <span className="inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/50 text-emerald-300 bg-emerald-950/40 font-mono font-bold">
                                    ≥200
                                  </span>
                                )}
                              </td>

                              {/* Price */}
                              <td className="py-1 px-3 text-right font-bold whitespace-nowrap" style={{ color: priceColor }}>
                                {gradePrice != null ? (
                                  <span
                                    title={hasConfirmedSales ? `${gradeSalesVol} confirmed sale${gradeSalesVol === 1 ? '' : 's'}` : 'catalog estimate — no confirmed sales'}
                                  >
                                    {hasConfirmedSales ? '' : '~'}{fmt(gradePrice)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>

                              {/* Sales Volume / Count */}
                              <td className="py-1 px-3 text-center font-medium whitespace-nowrap">
                                {hasConfirmedSales && gradeSalesVol != null ? (
                                  <span className="text-slate-300">
                                    ×{gradeSalesVol}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>

                              {/* Multiple Indicator */}
                              <td className="py-1 pl-3 pr-1 text-right font-bold whitespace-nowrap">
                                {isAnc && rawToAnchorMultiple != null && (
                                  <span className="text-cyan-300">
                                    ({rawToAnchorMultiple.toFixed(1)}x)
                                  </span>
                                )}
                                {isSov && rawToSovMultiple != null && (
                                  <span style={{ color: eraColors.border }}>
                                    ({rawToSovMultiple.toFixed(1)}x)
                                  </span>
                                )}
                                {isRaw && (
                                  <span className="text-slate-500 font-normal">
                                    —
                                  </span>
                                )}
                              </td>
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
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${eraColors.border}22` }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-between" style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em' }}>
                    <span>Dealer Buy / Retail Sell Order Quotes</span>
                    <span className="text-[11px] font-mono font-normal text-slate-400">{sp.spreadMethod}</span>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {anchorKeys.map(tier => {
                      const a = sp.observedAnchors[tier];
                      return (
                        <div key={tier} className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 flex flex-col gap-1 min-w-[130px]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-slate-200">{tier === 'RAW' ? 'Raw' : tier}</span>
                            <span className="text-[11px] font-mono text-slate-400">{formatPct(a.spread)}</span>
                          </div>
                          <div className="text-sm font-bold font-mono">
                            <span className="text-amber-300">{fmt(a.buy)}</span> <span className="text-slate-500 font-normal">/</span> <span className="text-emerald-300">{fmt(a.sell)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Buy / Sell */}
            <div className="mt-4 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: `1px solid ${eraColors.border}15` }}>
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
              <div className="flex flex-col ml-2">
                <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>Last Price Data</span>
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{fmtDate(keyPrices.observedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

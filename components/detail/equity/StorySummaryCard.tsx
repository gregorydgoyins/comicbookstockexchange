import Link from "next/link";
import { getStorySummary, type StorySummary, type StoryEntityLink } from "@/lib/comics/story-summary";
import { slugifyCreatorName } from "@/lib/creators/creator-bio-service";
import { BookOpen, Sparkles, Users, MapPin, Wrench, Quote, PenTool, Palette } from "lucide-react";
import { VersusMatchupWidget } from "@/components/versus/VersusMatchupWidget";

interface StorySummaryCardProps {
  series: string;
  issueNumber: string;
  year: number | null;
  publisher: string | null;
  volume?: number | null;
  accent: string;
  fandomData?: {
    synopsis?: string | null;
    firstAppearances?: string[] | null;
    characters?: string[] | null;
    credits?: Record<string, string[]> | null;
  } | null;
  authoritativeData?: {
    synopsis?: string | null;
    characters?: string | string[] | null;
    credits?: {
      writer?: string[];
      penciler?: string[];
      inker?: string[];
      colorist?: string[];
      letterer?: string[];
      editor?: string[];
    } | null;
    source?: string;
    sourceUrl?: string;
    license?: string | null;
  } | null;
}

function resolveInternalLoreUrl(url: string, fallbackLabel: string): string {
  const queryTerm = fallbackLabel || (url ? decodeURIComponent(url.split("/").pop() || "") : "");
  // Strip parenthetical qualifiers like "(Guest)", "(Peter Parker)", "(Sue Storm)"
  const cleanTerm = queryTerm.replace(/\s*\([^)]*\)/g, "").replace(/[^a-zA-Z0-9 '’.-]+/g, " ").trim();
  const slug = cleanTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug) {
    return `/wiki/entry/${encodeURIComponent(slug)}`;
  }
  return `/wiki?q=${encodeURIComponent(cleanTerm || fallbackLabel)}`;
}

function cleanDialogueQuote(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip outer quotes and curled quotes
  clean = clean.replace(/^[“"«'‘]+/, "").replace(/[”"»'’]+$/, "").trim();
  return clean;
}

/**
 * Robust markdown formatter that renders internal links alongside bold **word** and italic *word*.
 */
function renderRichDialogueText(text: string): React.ReactNode {
  if (!text) return null;

  const tokens: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  function parseFormatting(segment: string, keyPrefix: string): React.ReactNode[] {
    if (!segment) return [];
    const parts: React.ReactNode[] = [];
    const formatRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let sLastIndex = 0;
    let fMatch: RegExpExecArray | null;

    while ((fMatch = formatRegex.exec(segment)) !== null) {
      if (fMatch.index > sLastIndex) {
        parts.push(segment.slice(sLastIndex, fMatch.index));
      }
      if (fMatch[2]) {
        parts.push(
          <strong key={`${keyPrefix}-b-${fMatch.index}`} className="font-semibold text-cyan-200">
            {fMatch[2]}
          </strong>
        );
      } else if (fMatch[3]) {
        parts.push(
          <em key={`${keyPrefix}-i-${fMatch.index}`} className="italic text-cyan-100">
            {fMatch[3]}
          </em>
        );
      }
      sLastIndex = formatRegex.lastIndex;
    }
    if (sLastIndex < segment.length) {
      parts.push(segment.slice(sLastIndex));
    }
    return parts;
  }

  let chunkIdx = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(...parseFormatting(text.slice(lastIndex, match.index), `txt-${chunkIdx++}`));
    }
    const label = match[1];
    const rawUrl = match[2];
    const internalUrl = resolveInternalLoreUrl(rawUrl, label);

    tokens.push(
      <Link
        key={`link-${internalUrl}-${match.index}`}
        href={internalUrl}
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors"
      >
        {label}
      </Link>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(...parseFormatting(text.slice(lastIndex), `txt-tail`));
  }

  return tokens;
}

/**
 * Safely parse markdown-style links `[Label](url)` and render as internal clickable React elements.
 */
function renderMarkdownWithLinks(text: string) {
  return renderRichDialogueText(text);
}

function CreatorCreditPill({ role, names, roleColor }: { role: string; names: string[]; roleColor: string }) {
  if (!names || names.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0d131f] border border-slate-800 text-xs font-mono shadow-sm hover:border-slate-700 transition-colors">
      <span className={`font-semibold uppercase tracking-wider text-[11px] ${roleColor}`}>{role}:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {names.map((name, idx) => {
          const cleanName = name.trim();
          const slug = slugifyCreatorName(cleanName);
          const creatorUrl = `/wiki/entry/${slug}`;

          return (
            <span key={`${role}-${cleanName}-${idx}`} className="inline-flex items-center gap-1">
              <Link
                href={creatorUrl}
                className="text-slate-200 hover:text-cyan-300 underline underline-offset-2 hover:decoration-cyan-400 font-medium transition-colors"
                title={`View ${cleanName} creator biography, portrait, and credits`}
              >
                {cleanName}
              </Link>
              {idx < names.length - 1 && <span className="text-slate-600">,</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EntityBadge({ entity, badgeColor }: { entity: StoryEntityLink; badgeColor: string }) {
  const internalUrl = resolveInternalLoreUrl(entity.url, entity.label || entity.target);

  return (
    <Link
      href={internalUrl}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all hover:scale-105 ${badgeColor}`}
      title={entity.target}
    >
      {entity.isFirstApp && <span className="text-amber-400 font-bold">★</span>}
      <span>{entity.label}</span>
      {entity.isFlashback && <span className="text-[10px] text-slate-400 opacity-75">(flashback)</span>}
      {entity.isMentioned && <span className="text-[10px] text-slate-400 opacity-75">(mentioned)</span>}
    </Link>
  );
}

/**
 * Rich encyclopedic collectible due diligence dossier for issue detail pages and sniper modals.
 * Features: Story title, key epigraph quote, creative credits, entity census (1st appearances,
 * heroes, antagonists, items, locations) and full hyperlinked narrative synopsis.
 */
export default async function StorySummaryCard({
  series,
  issueNumber,
  year,
  publisher,
  volume,
  accent,
  fandomData,
  authoritativeData,
}: StorySummaryCardProps) {
  let summary: StorySummary | null = null;
  // If authoritative or fandom data is already present from sovereign database, use it immediately (0ms latency)
  if (authoritativeData?.synopsis || fandomData?.synopsis) {
    const synopsis = authoritativeData?.synopsis || fandomData?.synopsis || "";
    const characterNames = Array.isArray(authoritativeData?.characters)
      ? authoritativeData.characters
      : typeof authoritativeData?.characters === "string"
        ? authoritativeData.characters.split(/[;,]/).map((name) => name.trim()).filter(Boolean)
        : [];
    const rawFirstApps = (fandomData?.firstAppearances || []).map((name) => ({
      target: name,
      label: name,
      url: `/wiki/entry/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`,
      isFirstApp: true,
    }));
    const rawFeatured = [...characterNames, ...(fandomData?.characters || [])].map((name) => ({
      target: name,
      label: name,
      url: `/wiki/entry/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`,
    }));

    summary = {
      text: synopsis,
      storyTitle: `${series} #${issueNumber}`,
      quote: null,
      entities: {
        firstAppearances: rawFirstApps,
        featuredCharacters: rawFeatured,
        antagonists: [],
        otherCharacters: [],
        racesAndSpecies: [],
        realities: [],
        locations: [],
        items: [],
        vehicles: [],
      },
      credits: authoritativeData?.credits || fandomData?.credits ? {
        coverArtists: [],
        writers: authoritativeData?.credits?.writer || fandomData?.credits?.writer || [],
        pencilers: authoritativeData?.credits?.penciler || fandomData?.credits?.penciler || fandomData?.credits?.artist || [],
        colorists: authoritativeData?.credits?.colorist || fandomData?.credits?.colorist || [],
        letterers: authoritativeData?.credits?.letterer || fandomData?.credits?.letterer || [],
        editors: authoritativeData?.credits?.editor || fandomData?.credits?.editor || [],
      } : undefined,
      source: authoritativeData?.source || "Sovereign Catalog",
      sourceUrl: authoritativeData?.sourceUrl || `/comics?q=${encodeURIComponent(series)}`,
      license: authoritativeData?.license ?? null,
      referenceYear: year,
    };
  } else {
    try {
      summary = await getStorySummary({ series, issueNumber, year, publisher, volume });
    } catch {
      summary = null;
    }
  }

  if (!summary) return null;

  const paragraphs = summary.text.split(/\n{2,}/).filter(Boolean);
  const entities = summary.entities;
  const credits = summary.credits;
  const quote = summary.quote;

  const hasFirstApps = (entities?.firstAppearances?.length ?? 0) > 0;
  const hasFeatured = (entities?.featuredCharacters?.length ?? 0) > 0;
  const hasAntagonists = (entities?.antagonists?.length ?? 0) > 0;
  const hasItems = (entities?.items?.length ?? 0) > 0 || (entities?.vehicles?.length ?? 0) > 0;
  const hasLocations = (entities?.locations?.length ?? 0) > 0;

  const heroCandidate =
    entities?.featuredCharacters?.[0]?.label ||
    entities?.firstAppearances?.[0]?.label ||
    series.replace(/Vol\.?\s*\d+/i, "").trim();

  const villainCandidate =
    entities?.antagonists?.[0]?.label ||
    entities?.featuredCharacters?.[1]?.label ||
    "Doctor Doom";

  return (
    <section
      aria-label="Story description and due diligence dossier"
      className="rounded-xl p-5 sm:p-6 bg-[#0a0e14] border shadow-2xl relative overflow-hidden"
      style={{ borderColor: `${accent}40` }}
    >
      {/* Background ambient gradient */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-10 blur-3xl -z-0"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-semibold block">
              Collectible Due Diligence Dossier
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              {summary.storyTitle ? `“${summary.storyTitle}”` : `${series} #${issueNumber} Narrative`}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono">
          <span className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> VERIFIED LORE
          </span>
        </div>
      </div>

      {/* Key Epigraph / Quotation Banner */}
      {quote && quote.text && (
        <div className="mt-4 p-4 rounded-lg bg-[#0e1420]/90 border border-cyan-500/30 relative z-10 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-cyan-500/20 text-[10px] font-mono tracking-widest uppercase">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Quote className="h-3.5 w-3.5" /> Iconic Climax Dialogue
            </span>
            <span className="text-slate-400">MediaWiki Canon</span>
          </div>
          <div className="space-y-2">
            <blockquote className="text-sm sm:text-base italic leading-relaxed text-cyan-100 font-serif">
              “{renderRichDialogueText(cleanDialogueQuote(quote.text))}”
            </blockquote>
            {quote.speaker && (
              <p className="text-xs font-mono uppercase tracking-wider text-cyan-400 text-right">
                — {renderRichDialogueText(cleanDialogueQuote(quote.speaker))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Creative Credits Lineage (Interactive Creator Dossier Links) */}
      {credits && Object.keys(credits).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono relative z-10">
          {credits.writers && credits.writers.length > 0 && (
            <CreatorCreditPill role="Writer" names={credits.writers} roleColor="text-cyan-400" />
          )}
          {credits.pencilers && credits.pencilers.length > 0 && (
            <CreatorCreditPill role="Art" names={credits.pencilers} roleColor="text-purple-400" />
          )}
          {credits.colorists && credits.colorists.length > 0 && (
            <CreatorCreditPill role="Color" names={credits.colorists} roleColor="text-amber-400" />
          )}
          {credits.letterers && credits.letterers.length > 0 && (
            <CreatorCreditPill role="Letters" names={credits.letterers} roleColor="text-emerald-400" />
          )}
          {credits.editors && credits.editors.length > 0 && (
            <CreatorCreditPill role="Editor" names={credits.editors} roleColor="text-rose-400" />
          )}
        </div>
      )}

      {/* Entity Census (Interactive Categorized Badges) */}
      {entities && (
        <div className="mt-5 space-y-4 pt-4 border-t border-slate-800/80 relative z-10">
          {/* 1st Appearances & Key Debuts */}
          {hasFirstApps && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>1st Appearance Key Debuts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.firstAppearances!.map((e, idx) => (
                  <EntityBadge
                    key={`fa-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-amber-950/60 border border-amber-500/50 text-amber-200 hover:border-amber-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Antagonists */}
          {hasAntagonists && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-rose-400 uppercase tracking-wider font-semibold">
                <span>⚔ Antagonists & Villains</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.antagonists!.map((e, idx) => (
                  <EntityBadge
                    key={`antag-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-rose-950/50 border border-rose-500/40 text-rose-200 hover:border-rose-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Featured Characters */}
          {hasFeatured && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span>Featured Characters</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.featuredCharacters!.map((e, idx) => (
                  <EntityBadge
                    key={`feat-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 hover:border-cyan-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Landmark Tech, Weapons & Vehicles */}
          {hasItems && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                <Wrench className="h-3.5 w-3.5" />
                <span>Landmark Artifacts, Technology & Vehicles</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...(entities.items || []), ...(entities.vehicles || [])].map((e, idx) => (
                  <EntityBadge
                    key={`item-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 hover:border-emerald-400"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Landmark Locations & Realms */}
          {hasLocations && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                <MapPin className="h-3.5 w-3.5" />
                <span>Landmark Locations, Planets & Realms</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entities.locations!.slice(0, 15).map((e, idx) => (
                  <EntityBadge
                    key={`loc-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-indigo-950/50 border border-indigo-500/40 text-indigo-200 hover:border-indigo-400"
                  />
                ))}
                {entities.locations!.length > 15 && (
                  <span className="text-xs font-mono text-slate-500 self-center">
                    +{entities.locations!.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Interactive Hyperlinked Synopsis */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 relative z-10">
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 font-semibold">
          Narrative Synopsis
        </h3>
        <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-300">
              {renderMarkdownWithLinks(p)}
            </p>
          ))}
        </div>
      </div>

      {/* 50/50 Versus Matchup Simulation Widget */}
      <div className="relative z-10">
        <VersusMatchupWidget
          initialContenderAName={heroCandidate}
          initialContenderBName={villainCandidate}
        />
      </div>

      {/* Attribution & Provenance Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 relative z-10 font-mono">
        <div>
          Source:{" "}
          <a href={summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white font-mono underline hover:text-cyan-300">Original text reference</a>
          {summary.license ? ` · ${summary.license}` : ""}
        </div>
        <div className="font-mono text-cyan-400/80">
          PANEL PROFITS WIKI
        </div>
      </div>
    </section>
  );
}

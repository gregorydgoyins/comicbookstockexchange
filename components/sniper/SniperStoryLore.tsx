"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, Users, MapPin, Wrench, Quote } from "lucide-react";
import type { StorySummary, StoryEntityLink } from "@/lib/comics/story-summary";

interface SniperStoryLoreProps {
  series: string;
  issueNumber: string;
  year?: number | null;
  publisher?: string | null;
  accent?: string;
  fallbackLore?: string;
  whyItsAGoodBuy?: string;
}

function resolveInternalLoreUrl(url: string, fallbackLabel: string): string {
  if (!url) return `/comics?q=${encodeURIComponent(fallbackLabel)}`;
  if (url.includes("/wiki/")) {
    const parts = url.split("/wiki/");
    const raw = parts[parts.length - 1];
    const clean = decodeURIComponent(raw)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `/wiki/entry/${clean}`;
  }
  if (url.startsWith("/")) return url;
  return `/comics?q=${encodeURIComponent(fallbackLabel)}`;
}

/**
 * Safely parse markdown-style links `[Label](url)` and render as internal clickable React elements.
 */
function renderMarkdownWithLinks(text: string) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[1];
    const rawUrl = match[2];
    const internalUrl = resolveInternalLoreUrl(rawUrl, label);

    parts.push(
      <Link
        key={`${internalUrl}-${match.index}`}
        href={internalUrl}
        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium transition-colors"
      >
        {label}
      </Link>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
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

export function SniperStoryLore({
  series,
  issueNumber,
  year,
  publisher,
  accent = "cyan",
  fallbackLore,
  whyItsAGoodBuy,
}: SniperStoryLoreProps) {
  const [summary, setSummary] = useState<StorySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const queryParams = new URLSearchParams({
      series,
      issueNumber,
      ...(year ? { year: String(year) } : {}),
      ...(publisher ? { publisher } : {}),
    });

    fetch(`/api/comics/story-summary?${queryParams.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data?.success && data?.summary) {
            setSummary(data.summary);
          } else {
            setSummary(null);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSummary(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [series, issueNumber, year, publisher]);

  if (loading) {
    return (
      <div className="bg-[#070C18] border border-slate-800 rounded-xl p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3" />
        <div className="h-16 bg-slate-900 rounded" />
        <div className="h-24 bg-slate-900 rounded" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-3">
        {whyItsAGoodBuy && (
          <div className="text-xs text-amber-200/90 leading-relaxed font-sans bg-amber-950/20 border border-amber-500/20 p-3 rounded-lg">
            <strong className="text-amber-400 font-mono text-[11px] block uppercase mb-1">
              Alpha Thesis &amp; Commercial Arbitrage Rationale:
            </strong>
            {whyItsAGoodBuy}
          </div>
        )}

        {fallbackLore && (
          <div className="text-xs text-slate-200 leading-relaxed font-sans bg-black/60 border border-slate-800 p-3 rounded-lg">
            <strong className="text-purple-300 font-mono text-[11px] block uppercase mb-1">
              Narrative Milestone &amp; Cultural Impact:
            </strong>
            {fallbackLore}
          </div>
        )}

        <div className="text-[11px] font-mono text-slate-500 bg-black/40 p-2.5 rounded-lg border border-slate-800/80">
          No verified issue-specific synopsis is available for this edition.
        </div>
      </div>
    );
  }

  const { storyTitle, quote, entities, credits, text } = summary;
  const paragraphs = text ? text.split(/\n\n+/).filter(Boolean) : [];

  const hasFirstApps = (entities?.firstAppearances?.length ?? 0) > 0;
  const hasAntagonists = (entities?.antagonists?.length ?? 0) > 0;
  const hasFeatured = (entities?.featuredCharacters?.length ?? 0) > 0;
  const hasItems = ((entities?.items?.length ?? 0) + (entities?.vehicles?.length ?? 0)) > 0;
  const hasLocations = (entities?.locations?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Lead Story Title & Epigraph Banner */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase">
              {storyTitle ? `"${storyTitle}"` : `${series} #${issueNumber} Issue Lore`}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            Sourced Issue Research
          </span>
        </div>

        {/* Epigraph Quote */}
        {quote?.text && (
          <div className="bg-cyan-950/20 border-l-2 border-cyan-400 p-2.5 rounded-r-lg space-y-1">
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5 opacity-80" />
              <div className="space-y-1">
                <p className="text-xs italic leading-relaxed text-cyan-100">
                  “{renderMarkdownWithLinks(quote.text)}”
                </p>
                {quote.speaker && (
                  <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 text-right">
                    — {renderMarkdownWithLinks(quote.speaker)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Creative Credits Lineage */}
        {credits && Object.keys(credits).length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono pt-1">
            {credits.writers && credits.writers.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                <strong className="text-cyan-400">Writer:</strong> {credits.writers.join(", ")}
              </span>
            )}
            {credits.pencilers && credits.pencilers.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                <strong className="text-cyan-400">Art:</strong> {credits.pencilers.join(", ")}
              </span>
            )}
            {credits.colorists && credits.colorists.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                <strong className="text-cyan-400">Color:</strong> {credits.colorists.join(", ")}
              </span>
            )}
            {credits.editors && credits.editors.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                <strong className="text-cyan-400">Editor:</strong> {credits.editors.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Entity Census (Interactive Categorized Badges) */}
      {entities && (
        <div className="space-y-3 bg-black/60 border border-slate-800 rounded-lg p-3">
          {/* 1st Appearances & Key Debuts */}
          {hasFirstApps && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                <Sparkles className="h-3 w-3" />
                <span>1st Appearance Key Debuts</span>
              </div>
              <div className="flex flex-wrap gap-1">
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
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
                <span>⚔ Antagonists &amp; Villains</span>
              </div>
              <div className="flex flex-wrap gap-1">
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
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                <Users className="h-3 w-3" />
                <span>Featured Characters</span>
              </div>
              <div className="flex flex-wrap gap-1">
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
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                <Wrench className="h-3 w-3" />
                <span>Landmark Artifacts, Technology &amp; Vehicles</span>
              </div>
              <div className="flex flex-wrap gap-1">
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
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                <MapPin className="h-3 w-3" />
                <span>Landmark Locations, Planets &amp; Realms</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {entities.locations!.slice(0, 15).map((e, idx) => (
                  <EntityBadge
                    key={`loc-${e.target}-${idx}`}
                    entity={e}
                    badgeColor="bg-indigo-950/50 border border-indigo-500/40 text-indigo-200 hover:border-indigo-400"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Interactive Hyperlinked Synopsis */}
      <div className="space-y-2 bg-[#070C18] border border-slate-800/90 rounded-lg p-3.5">
        <h4 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
          Sourced Issue Narrative Synopsis
        </h4>
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar text-xs text-slate-300 leading-relaxed font-sans">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderMarkdownWithLinks(p)}</p>
          ))}
        </div>
      </div>

      {/* Attribution & Provenance Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800">
        <div>
          Source:{" "}
          <span className="text-slate-300 font-mono">
            {summary.source}
          </span>
        </div>
        <span className="text-cyan-400/80">LOCAL CBR KNOWLEDGE REPOSITORY VERIFIED</span>
      </div>
    </div>
  );
}

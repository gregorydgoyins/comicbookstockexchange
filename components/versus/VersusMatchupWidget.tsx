"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Swords,
  Sparkles,
  Search,
  Shuffle,
  Shield,
  Zap,
  TrendingUp,
  Award,
  ChevronRight,
  ExternalLink,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SuperheroContender,
  BattleSimulationResult,
  getAllSuperheroContenders,
  simulateSuperheroBattle,
  CANONICAL_DREAM_MATCHUPS,
  type ContenderCategory,
} from "@/lib/battle/battle-engine";
import { formatCurrency } from "@/lib/utils";

interface VersusMatchupWidgetProps {
  initialContenderAName?: string;
  initialContenderBName?: string;
  defaultCategory?: ContenderCategory | "all";
}

type WidgetCategoryFilter = "all" | "people" | "weapons" | "abilities" | "places";

export function VersusMatchupWidget({
  initialContenderAName,
  initialContenderBName,
}: VersusMatchupWidgetProps) {
  // Synchronously initialize contenders list for instant SSR rendering
  const [allContenders] = React.useState<SuperheroContender[]>(() => getAllSuperheroContenders());

  // Determine initial contenders synchronously
  const [contenderA, setContenderA] = React.useState<SuperheroContender>(() => {
    const list = getAllSuperheroContenders();
    if (initialContenderAName) {
      const match = list.find((c) => c.name.toLowerCase().includes(initialContenderAName.toLowerCase()));
      if (match) return match;
    }
    return list.find((c) => c.name === "Doctor Doom") || list[0];
  });

  const [contenderB, setContenderB] = React.useState<SuperheroContender>(() => {
    const list = getAllSuperheroContenders();
    if (initialContenderBName) {
      const match = list.find((c) => c.name.toLowerCase().includes(initialContenderBName.toLowerCase()));
      if (match) return match;
    }
    return list.find((c) => c.name === "Mister Mxyzptlk") || list[1];
  });

  // Filtering states
  const [categoryFilterA, setCategoryFilterA] = React.useState<WidgetCategoryFilter>("all");
  const [categoryFilterB, setCategoryFilterB] = React.useState<WidgetCategoryFilter>("all");
  const [searchA, setSearchA] = React.useState("");
  const [searchB, setSearchB] = React.useState("");
  const [dropdownAOpen, setDropdownAOpen] = React.useState(false);
  const [dropdownBOpen, setDropdownBOpen] = React.useState(false);

  // Simulation result initialized synchronously
  const [result, setResult] = React.useState<BattleSimulationResult>(() => {
    const list = getAllSuperheroContenders();
    const a = initialContenderAName
      ? list.find((c) => c.name.toLowerCase().includes(initialContenderAName.toLowerCase())) || list[0]
      : list.find((c) => c.name === "Doctor Doom") || list[0];
    const b = initialContenderBName
      ? list.find((c) => c.name.toLowerCase().includes(initialContenderBName.toLowerCase())) || list[1]
      : list.find((c) => c.name === "Mister Mxyzptlk") || list[1];
    return simulateSuperheroBattle(a, b);
  });
  const [isSimulating, setIsSimulating] = React.useState(false);

  const matchesCategory = (contender: SuperheroContender, filter: WidgetCategoryFilter) => {
    if (filter === "all") return true;
    if (filter === "people") {
      return (
        contender.category === "heroes" ||
        contender.category === "villains" ||
        contender.category === "sidekicks"
      );
    }
    return contender.category === filter;
  };

  const filteredContendersA = React.useMemo(() => {
    let pool = allContenders.filter((c) => matchesCategory(c, categoryFilterA));
    if (searchA.trim()) {
      const q = searchA.toLowerCase();
      pool = pool.filter(
        (c) => c.name.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q)
      );
    }
    return pool.slice(0, 16);
  }, [allContenders, categoryFilterA, searchA]);

  const filteredContendersB = React.useMemo(() => {
    let pool = allContenders.filter((c) => matchesCategory(c, categoryFilterB));
    if (searchB.trim()) {
      const q = searchB.toLowerCase();
      pool = pool.filter(
        (c) => c.name.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q)
      );
    }
    return pool.slice(0, 16);
  }, [allContenders, categoryFilterB, searchB]);

  const handleSimulate = (a: SuperheroContender, b: SuperheroContender) => {
    setIsSimulating(true);
    setTimeout(() => {
      setResult(simulateSuperheroBattle(a, b));
      setIsSimulating(false);
    }, 300);
  };

  const handleSelectPreset = (nameA: string, nameB: string) => {
    if (allContenders.length === 0) return;
    const a = allContenders.find((c) => c.name.toLowerCase() === nameA.toLowerCase());
    const b = allContenders.find((c) => c.name.toLowerCase() === nameB.toLowerCase());
    if (a && b) {
      setContenderA(a);
      setContenderB(b);
      handleSimulate(a, b);
    }
  };

  const handleRandomize = () => {
    if (allContenders.length < 2) return;
    const idxA = Math.floor(Math.random() * allContenders.length);
    let idxB = Math.floor(Math.random() * allContenders.length);
    while (idxB === idxA) {
      idxB = Math.floor(Math.random() * allContenders.length);
    }
    const a = allContenders[idxA];
    const b = allContenders[idxB];
    setContenderA(a);
    setContenderB(b);
    handleSimulate(a, b);
  };

  const isAWinner = result.winner.id === contenderA.id;
  const isBWinner = result.winner.id === contenderB.id;

  return (
    <div className="mt-6 border border-slate-800/90 rounded-2xl bg-gradient-to-b from-[#0a0d14] via-[#07080b] to-[#050608] p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
              <Swords className="h-4 w-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
              CANONICAL VERSUS MATCHUP ENGINE
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-normal">
                50 / 50 Simulation Box
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate authentic head-to-head clashes between <strong className="text-slate-200">People</strong> (Superheroes &amp; Supervillains), <strong className="text-slate-200">Gadgets</strong>, <strong className="text-slate-200">Abilities</strong>, or <strong className="text-slate-200">Places</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRandomize}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 transition-colors"
            title="Randomize both contenders"
          >
            <Shuffle className="h-3.5 w-3.5 text-cyan-400" />
            <span>Randomize</span>
          </button>
          <Link
            href="/versus"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-700/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-xs font-semibold text-cyan-300 transition-colors"
          >
            <span>Full Arena</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Quick Preset Clash Pills ── */}
      <div className="py-3 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto custom-scrollbar relative z-10 text-xs">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 shrink-0 font-semibold flex items-center gap-1">
          <Flame className="h-3 w-3 text-amber-400" /> Quick Clashes:
        </span>
        {[
          { label: "Doom vs. Mxyzptlk", a: "Doctor Doom", b: "Mister Mxyzptlk" },
          { label: "Alan Scott vs. Miles Morales", a: "Alan Scott", b: "Miles Morales" },
          { label: "Castle Doom vs. Sanctum Sanctorum", a: "Castle Doom (Latveria)", b: "Sanctum Sanctorum (Greenwich Village)" },
          { label: "Reality Warping vs. Starheart", a: "Reality Warping (5D & Chaos Magic)", b: "Starheart Green Flame (Mystic Constructs)" },
          { label: "Infinity Gauntlet vs. Anti-Life", a: "The Infinity Gauntlet", b: "The Anti-Life Equation" },
          { label: "Venom Blast vs. Utility Belt", a: "Bio-Electric Venom Blast (Neural Shock)", b: "Batman's Utility Belt" },
        ].map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectPreset(p.a, p.b)}
            className="px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/70 hover:border-cyan-500/50 hover:bg-slate-800/80 text-[11px] font-medium text-slate-300 hover:text-cyan-200 shrink-0 transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── 50 / 50 Battle Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-4 relative z-10">
        {/* ══ CONTENDER A (LEFT 50%) ══ */}
        <div className={`rounded-xl border p-4 transition-all duration-300 relative ${
          isAWinner
            ? "border-cyan-500/60 bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-slate-950/80 shadow-lg shadow-cyan-950/40"
            : "border-slate-800 bg-slate-900/40"
        }`}>
          {isAWinner && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1 shadow-sm">
              <Award className="h-3 w-3 text-cyan-400" /> CLASH VICTOR
            </div>
          )}

          {/* Category Selector Tabs for A */}
          <div className="flex items-center gap-1 mb-3 pb-2 border-b border-slate-800/60 text-[11px]">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold mr-1">A:</span>
            {(
              [
                { id: "all", label: "All" },
                { id: "people", label: "People" },
                { id: "weapons", label: "Gadgets" },
                { id: "abilities", label: "Abilities" },
                { id: "places", label: "Places" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilterA(cat.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  categoryFilterA === cat.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Contender Selection Dropdown Search A */}
          <div className="relative mb-3">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-cyan-500/60">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Hero, Villain, Gadget, Place..."
                value={searchA}
                onChange={(e) => {
                  setSearchA(e.target.value);
                  setDropdownAOpen(true);
                }}
                onFocus={() => setDropdownAOpen(true)}
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full"
              />
            </div>

            {dropdownAOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 p-1 custom-scrollbar"
                onMouseLeave={() => setDropdownAOpen(false)}
              >
                {filteredContendersA.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setContenderA(c);
                      setDropdownAOpen(false);
                      setSearchA("");
                      handleSimulate(c, contenderB);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-cyan-950/60 hover:text-cyan-200 flex items-center justify-between text-xs text-slate-300 transition-colors"
                  >
                    <span className="font-semibold truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 capitalize shrink-0 ml-2">
                      {c.category} · {c.overallRating}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Card A */}
          <div className="flex items-start gap-3.5">
            <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 shrink-0 shadow-md">
              {contenderA.image ? (
                <Image
                  src={contenderA.image}
                  alt={contenderA.name}
                  fill
                  sizes="120px"
                  className="object-cover object-top"
                  unoptimized={contenderA.image.startsWith("http")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Shield className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[9px] font-mono text-slate-300 px-1">
                <span>Tier:</span>
                <span className="text-cyan-300 font-bold">{contenderA.overallRating}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase px-1.5 py-0 font-mono tracking-wider border-slate-700 text-slate-300 bg-slate-800/60"
                >
                  {contenderA.category}
                </Badge>
                <span className="text-[10px] font-mono text-slate-400">
                  {contenderA.publisher}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-100 truncate mt-1">
                {contenderA.name}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {contenderA.fullName !== contenderA.name ? contenderA.fullName : contenderA.powerTier}
              </p>

              {contenderA.signatureWeapon && (
                <div className="mt-2 text-[10px] text-cyan-300/90 bg-cyan-950/40 border border-cyan-800/30 rounded px-2 py-1 truncate">
                  ⚡ {contenderA.signatureWeapon}
                </div>
              )}

              {contenderA.firstAppearanceValue98Usd && (
                <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                  Debut: <span className="text-slate-300">{contenderA.firstAppearance}</span>
                  {" · "}
                  <span className="text-emerald-400 font-semibold">
                    CGC 9.8: {formatCurrency(contenderA.firstAppearanceValue98Usd)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Power Stats Matrix Bars A */}
          <div className="mt-4 pt-3 border-t border-slate-800/70 space-y-1.5 text-[11px] font-mono">
            {[
              { label: "Intellect", val: contenderA.powerstats.intelligence, color: "bg-blue-500" },
              { label: "Strength", val: contenderA.powerstats.strength, color: "bg-red-500" },
              { label: "Speed", val: contenderA.powerstats.speed, color: "bg-amber-500" },
              { label: "Durability", val: contenderA.powerstats.durability, color: "bg-emerald-500" },
              { label: "Power Output", val: contenderA.powerstats.power, color: "bg-purple-500" },
              { label: "Martial / Combat", val: contenderA.powerstats.combat, color: "bg-cyan-500" },
            ].map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-24 truncate">{s.label}</span>
                <div className="flex-1 h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, s.val))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-300 w-6 text-right">{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ CONTENDER B (RIGHT 50%) ══ */}
        <div className={`rounded-xl border p-4 transition-all duration-300 relative ${
          isBWinner
            ? "border-red-500/60 bg-gradient-to-br from-red-950/30 via-slate-900/60 to-slate-950/80 shadow-lg shadow-red-950/40"
            : "border-slate-800 bg-slate-900/40"
        }`}>
          {isBWinner && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/40 text-[10px] font-mono font-bold text-red-300 flex items-center gap-1 shadow-sm">
              <Award className="h-3 w-3 text-red-400" /> CLASH VICTOR
            </div>
          )}

          {/* Category Selector Tabs for B */}
          <div className="flex items-center gap-1 mb-3 pb-2 border-b border-slate-800/60 text-[11px]">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold mr-1">B:</span>
            {(
              [
                { id: "all", label: "All" },
                { id: "people", label: "People" },
                { id: "weapons", label: "Gadgets" },
                { id: "abilities", label: "Abilities" },
                { id: "places", label: "Places" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilterB(cat.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  categoryFilterB === cat.id
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Contender Selection Dropdown Search B */}
          <div className="relative mb-3">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-red-500/60">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Hero, Villain, Gadget, Place..."
                value={searchB}
                onChange={(e) => {
                  setSearchB(e.target.value);
                  setDropdownBOpen(true);
                }}
                onFocus={() => setDropdownBOpen(true)}
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full"
              />
            </div>

            {dropdownBOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 p-1 custom-scrollbar"
                onMouseLeave={() => setDropdownBOpen(false)}
              >
                {filteredContendersB.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setContenderB(c);
                      setDropdownBOpen(false);
                      setSearchB("");
                      handleSimulate(contenderA, c);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-red-950/60 hover:text-red-200 flex items-center justify-between text-xs text-slate-300 transition-colors"
                  >
                    <span className="font-semibold truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 capitalize shrink-0 ml-2">
                      {c.category} · {c.overallRating}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Card B */}
          <div className="flex items-start gap-3.5">
            <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 shrink-0 shadow-md">
              {contenderB.image ? (
                <Image
                  src={contenderB.image}
                  alt={contenderB.name}
                  fill
                  sizes="120px"
                  className="object-cover object-top"
                  unoptimized={contenderB.image.startsWith("http")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Shield className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[9px] font-mono text-slate-300 px-1">
                <span>Tier:</span>
                <span className="text-red-300 font-bold">{contenderB.overallRating}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase px-1.5 py-0 font-mono tracking-wider border-slate-700 text-slate-300 bg-slate-800/60"
                >
                  {contenderB.category}
                </Badge>
                <span className="text-[10px] font-mono text-slate-400">
                  {contenderB.publisher}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-100 truncate mt-1">
                {contenderB.name}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {contenderB.fullName !== contenderB.name ? contenderB.fullName : contenderB.powerTier}
              </p>

              {contenderB.signatureWeapon && (
                <div className="mt-2 text-[10px] text-red-300/90 bg-red-950/40 border border-red-800/30 rounded px-2 py-1 truncate">
                  ⚡ {contenderB.signatureWeapon}
                </div>
              )}

              {contenderB.firstAppearanceValue98Usd && (
                <div className="mt-1.5 text-[10px] font-mono text-slate-400">
                  Debut: <span className="text-slate-300">{contenderB.firstAppearance}</span>
                  {" · "}
                  <span className="text-emerald-400 font-semibold">
                    CGC 9.8: {formatCurrency(contenderB.firstAppearanceValue98Usd)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Power Stats Matrix Bars B */}
          <div className="mt-4 pt-3 border-t border-slate-800/70 space-y-1.5 text-[11px] font-mono">
            {[
              { label: "Intellect", val: contenderB.powerstats.intelligence, color: "bg-blue-500" },
              { label: "Strength", val: contenderB.powerstats.strength, color: "bg-red-500" },
              { label: "Speed", val: contenderB.powerstats.speed, color: "bg-amber-500" },
              { label: "Durability", val: contenderB.powerstats.durability, color: "bg-emerald-500" },
              { label: "Power Output", val: contenderB.powerstats.power, color: "bg-purple-500" },
              { label: "Martial / Combat", val: contenderB.powerstats.combat, color: "bg-cyan-500" },
            ].map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-24 truncate">{s.label}</span>
                <div className="flex-1 h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(5, s.val))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-300 w-6 text-right">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Center Clash Action Trigger ── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 my-4 relative z-20">
        <button
          onClick={() => handleSimulate(contenderA, contenderB)}
          disabled={isSimulating}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2"
        >
          {isSimulating ? (
            <>
              <Sparkles className="h-4 w-4 animate-spin text-cyan-200" />
              <span>Simulating Canonical Clash...</span>
            </>
          ) : (
            <>
              <Swords className="h-4 w-4 text-amber-300" />
              <span>Simulate Head-to-Head Clash</span>
            </>
          )}
        </button>
      </div>

      {/* ── Clash Output & Round Narratives ── */}
      {result && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 relative z-10">
          {/* Win Probability Bar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className={`font-bold flex items-center gap-1.5 ${isAWinner ? "text-cyan-300" : "text-slate-400"}`}>
                {contenderA.name} ({result.winProbabilityA}%)
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Estimated Win Probability
              </span>
              <span className={`font-bold flex items-center gap-1.5 ${isBWinner ? "text-red-300" : "text-slate-400"}`}>
                ({result.winProbabilityB}%) {contenderB.name}
              </span>
            </div>

            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-700"
                style={{ width: `${result.winProbabilityA}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-700"
                style={{ width: `${result.winProbabilityB}%` }}
              />
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              <strong className="text-cyan-300 font-mono">TACTICAL VERDICT:</strong> {result.tacticalAnalysis}
            </p>
          </div>

          {/* 3-Round Tactical Encounters */}
          <div className="space-y-2.5">
            <h5 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400" /> 3-Round Encounter Breakdown:
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {result.rounds.map((round) => (
                <div
                  key={round.roundNumber}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                      <span className="font-bold text-slate-300">ROUND {round.roundNumber}</span>
                      <span className="text-cyan-400 capitalize">{round.statFocus} Focus</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 mb-1">
                      {round.title}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {round.narrative}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-900 text-[10px] font-mono flex items-center justify-between">
                    <span className="text-slate-500">Advantage:</span>
                    <span className={`font-semibold ${
                      round.advantage === "contenderA"
                        ? "text-cyan-300"
                        : round.advantage === "contenderB"
                        ? "text-red-300"
                        : "text-amber-300"
                    }`}>
                      {round.advantage === "contenderA"
                        ? contenderA.name
                        : round.advantage === "contenderB"
                        ? contenderB.name
                        : "Even Stalemate"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multiverse Continuity & Financial Lore */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="text-[11px] text-slate-400">
              <strong className="text-slate-300 font-mono">CANONICAL STATUS:</strong>{" "}
              {result.crossoverContext}
            </div>
            {result.financialAdvantage.valueDifference98 > 0 && (
              <div className="text-[11px] font-mono text-slate-400 shrink-0 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
                Secondary Market Stature:{" "}
                <span className="text-emerald-400 font-bold">
                  {result.financialAdvantage.higherValueHero} (+${result.financialAdvantage.valueDifference98.toLocaleString()})
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

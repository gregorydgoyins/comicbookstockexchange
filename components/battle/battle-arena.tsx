"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Swords,
  Sparkles,
  Shuffle,
  Shield,
  Zap,
  TrendingUp,
  BookOpen,
  DollarSign,
  ChevronRight,
  Flame,
  Award,
  Search,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SuperheroContender,
  BattleSimulationResult,
  CANONICAL_DREAM_MATCHUPS,
  simulateSuperheroBattle,
  type ContenderCategory,
} from "@/lib/battle/battle-engine";
import { formatCurrency } from "@/lib/utils";

interface BattleArenaProps {
  initialContenders: SuperheroContender[];
}

export function BattleArena({ initialContenders }: BattleArenaProps) {
  // Default to Batman (ID 70) and Spider-Man (ID 620)
  const defaultA = initialContenders.find((h) => h.name === "Batman") || initialContenders[0];
  const defaultB = initialContenders.find((h) => h.name === "Spider-Man") || initialContenders[1];

  const [selectedCategory, setSelectedCategory] = React.useState<ContenderCategory | "all">("all");
  const [heroA, setHeroA] = React.useState<SuperheroContender>(defaultA);
  const [heroB, setHeroB] = React.useState<SuperheroContender>(defaultB);
  const [searchA, setSearchA] = React.useState("");
  const [searchB, setSearchB] = React.useState("");
  const [showDropdownA, setShowDropdownA] = React.useState(false);
  const [showDropdownB, setShowDropdownB] = React.useState(false);
  const [battleResult, setBattleResult] = React.useState<BattleSimulationResult>(() =>
    simulateSuperheroBattle(defaultA, defaultB)
  );
  const [isSimulating, setIsSimulating] = React.useState(false);

  // Filter contenders for search by active category
  const filteredA = React.useMemo(() => {
    const pool = selectedCategory === "all" ? initialContenders : initialContenders.filter((h) => h.category === selectedCategory);
    if (!searchA.trim()) return pool.slice(0, 15);
    const q = searchA.toLowerCase();
    return pool.filter(
      (h) => h.name.toLowerCase().includes(q) || h.fullName.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchA, initialContenders, selectedCategory]);

  const filteredB = React.useMemo(() => {
    const pool = selectedCategory === "all" ? initialContenders : initialContenders.filter((h) => h.category === selectedCategory);
    if (!searchB.trim()) return pool.slice(0, 15);
    const q = searchB.toLowerCase();
    return pool.filter(
      (h) => h.name.toLowerCase().includes(q) || h.fullName.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [searchB, initialContenders, selectedCategory]);

  // Execute battle simulation
  const handleSimulate = (a: SuperheroContender, b: SuperheroContender) => {
    setIsSimulating(true);
    setTimeout(() => {
      setBattleResult(simulateSuperheroBattle(a, b));
      setIsSimulating(false);
    }, 350);
  };

  // Select dream matchup
  const selectDreamMatch = (heroAName: string, heroBName: string) => {
    const a = initialContenders.find((h) => h.name.toLowerCase() === heroAName.toLowerCase());
    const b = initialContenders.find((h) => h.name.toLowerCase() === heroBName.toLowerCase());
    if (a && b) {
      setHeroA(a);
      setHeroB(b);
      handleSimulate(a, b);
    }
  };

  // Filter dream matchups based on selectedCategory
  const displayedDreamMatchups = React.useMemo(() => {
    if (selectedCategory === "all") return CANONICAL_DREAM_MATCHUPS;
    return CANONICAL_DREAM_MATCHUPS.filter((m) => m.category === selectedCategory);
  }, [selectedCategory]);

  // Shuffle two random contenders from current pool
  const handleRandomize = () => {
    const pool = selectedCategory === "all" ? initialContenders : initialContenders.filter((h) => h.category === selectedCategory);
    if (pool.length < 2) return;
    const idxA = Math.floor(Math.random() * pool.length);
    let idxB = Math.floor(Math.random() * pool.length);
    while (idxB === idxA && pool.length > 1) {
      idxB = Math.floor(Math.random() * pool.length);
    }
    const a = pool[idxA];
    const b = pool[idxB];
    setHeroA(a);
    setHeroB(b);
    handleSimulate(a, b);
  };

  const statLabels: { key: keyof typeof heroA.powerstats; label: string; icon: string }[] = [
    { key: "intelligence", label: "Intelligence", icon: "🧠" },
    { key: "strength", label: "Strength", icon: "💪" },
    { key: "speed", label: "Speed", icon: "⚡" },
    { key: "durability", label: "Durability", icon: "🛡️" },
    { key: "power", label: "Power Output", icon: "💥" },
    { key: "combat", label: "Combat Mastery", icon: "⚔️" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Top Header & Mission Statement ── */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#111827] to-[#0b0f19] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <Badge variant="outline" className="border-red-500/40 text-[10px] text-red-400 font-mono tracking-wider">
                MULTIVERSE COMBAT ENGINE & COMIC EQUITY NEXUS
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
              Superhero Battles That Have Never Happened
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Using stored character statistics, Panel Profits Wiki research, and grade-specific comic market references. Simulate cross-universe dream matchups with authentic physics and financial market stakes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRandomize}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title="Shuffle randomized contenders from 560+ heroes"
            >
              <Shuffle className="h-4 w-4 text-cyan-400" />
              <span>Randomize Contenders</span>
            </button>
          </div>
        </div>

        {/* ── Category Filter Bar ── */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Select Combat Dimension / Arena Category:
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {displayedDreamMatchups.length} Preset Matchups
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Matchups", icon: "🌌" },
              { id: "heroes", label: "Heroes & Anti-Heroes", icon: "🦸" },
              { id: "villains", label: "Supervillains", icon: "🦹" },
              { id: "sidekicks", label: "Sidekicks & Companions", icon: "🐕" },
              { id: "weapons", label: "Weapons & Relics", icon: "🗡️" },
              { id: "abilities", label: "Abilities & Powers", icon: "⚡" },
              { id: "places", label: "Places & Sanctuaries", icon: "🏰" },
              { id: "vehicles", label: "Vehicles & Transit", icon: "🏎️" },
              { id: "teams", label: "Teams & Factions", icon: "🛡️" },
              { id: "creators", label: "Creators & Architects", icon: "✍️" },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold shadow-md shadow-cyan-950/50"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Dream Matchups Roster Pills ── */}
        <div className="mt-4 pt-3 border-t border-slate-800/50 space-y-2.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">
            Featured Legendary Matchups ({selectedCategory.toUpperCase()}):
          </span>
          <div className="flex flex-wrap gap-2">
            {displayedDreamMatchups.map((match) => {
              const active =
                (heroA.name.toLowerCase() === match.heroA.toLowerCase() &&
                  heroB.name.toLowerCase() === match.heroB.toLowerCase()) ||
                (heroB.name.toLowerCase() === match.heroA.toLowerCase() &&
                  heroA.name.toLowerCase() === match.heroB.toLowerCase());

              return (
                <button
                  key={match.id}
                  onClick={() => selectDreamMatch(match.heroA, match.heroB)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                    active
                      ? "border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-md shadow-cyan-950 font-bold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <Swords className="h-3 w-3 text-red-400" />
                  <span>{match.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── The Two Contenders Face-Off Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
        {/* Contender A Card */}
        <div className="lg:col-span-5 rounded-xl border border-cyan-500/30 bg-[#0e1422] p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            {/* Contender A Selector Input */}
            <div className="relative">
              <label className="text-[10px] uppercase font-mono text-cyan-400 font-semibold block mb-1.5">
                Contender 1 (Alpha)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchA}
                  onChange={(e) => {
                    setSearchA(e.target.value);
                    setShowDropdownA(true);
                  }}
                  onFocus={() => setShowDropdownA(true)}
                  placeholder={`Search: ${heroA.name}...`}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {showDropdownA && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                  {filteredA.map((cand) => (
                    <button
                      key={cand.id}
                      onClick={() => {
                        setHeroA(cand);
                        setSearchA("");
                        setShowDropdownA(false);
                        handleSimulate(cand, heroB);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 text-slate-200 border-b border-slate-800/60"
                    >
                      <span className="font-semibold">{cand.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{cand.publisher}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contender A Profile Header */}
            <div className="flex gap-4 items-start pt-2">
              <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-cyan-500/40 shrink-0 bg-slate-950">
                {heroA.image ? (
                  <img
                    src={heroA.image}
                    alt={heroA.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-1 text-center">
                  <span className="text-[9px] font-mono text-cyan-300 font-bold">
                    OVR {heroA.overallRating}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-100 tracking-tight truncate">
                    {heroA.name}
                  </h2>
                  <Badge variant="outline" className="border-cyan-500/50 text-[10px] text-cyan-300 font-mono">
                    {heroA.publisher}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-cyan-300 text-[9px] font-mono capitalize">
                    {heroA.category || "heroes"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {heroA.fullName !== heroA.name ? heroA.fullName : "Civilian Identity Classified"}
                </p>

                <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Tier: {heroA.powerTier}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border text-capitalize ${
                      heroA.alignment === "good"
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : heroA.alignment === "bad"
                        ? "bg-red-950/60 border-red-500/40 text-red-300"
                        : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {heroA.alignment.toUpperCase()}
                  </span>
                </div>

                {heroA.signatureWeapon && (
                  <div className="text-[10.5px] font-mono text-cyan-300/90 pt-1 line-clamp-1">
                    <span className="text-slate-500">Weapon:</span> {heroA.signatureWeapon}
                  </div>
                )}
              </div>
            </div>

            {/* Contender A Debut Comic Equity Card */}
            <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-cyan-400" />
                  <span>FIRST APPEARANCE KEY</span>
                </span>
                <span className="text-emerald-400 font-bold">Panel Profits Valuation</span>
              </div>
              <p className="text-slate-200 font-semibold text-xs truncate">
                {heroA.firstAppearance}
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                <span className="text-slate-400">
                  Est. Raw: {heroA.firstAppearanceValueRawUsd ? formatCurrency(heroA.firstAppearanceValueRawUsd) : "Market Peg"}
                </span>
                <span className="text-cyan-300 font-bold">
                  9.8 Slab: {heroA.firstAppearanceValue98Usd ? formatCurrency(heroA.firstAppearanceValue98Usd) : "Reference"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Power Matrix: {heroA.powerTier}</span>
            <span className="text-cyan-400 font-bold">Win Odds: {battleResult.winProbabilityA}%</span>
          </div>
        </div>

        {/* Center VS Battle Action Core */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center gap-3 py-4 lg:py-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-950 font-black text-sm text-white tracking-widest border-2 border-slate-900">
            VS
          </div>
          <button
            onClick={() => handleSimulate(heroA, heroB)}
            disabled={isSimulating}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-red-500/20 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Swords className={`h-3.5 w-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Simulating..." : "Fight"}</span>
          </button>
        </div>

        {/* Contender B Card */}
        <div className="lg:col-span-5 rounded-xl border border-amber-500/30 bg-[#0e1422] p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            {/* Contender B Selector Input */}
            <div className="relative">
              <label className="text-[10px] uppercase font-mono text-amber-400 font-semibold block mb-1.5">
                Contender 2 (Omega)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchB}
                  onChange={(e) => {
                    setSearchB(e.target.value);
                    setShowDropdownB(true);
                  }}
                  onFocus={() => setShowDropdownB(true)}
                  placeholder={`Search: ${heroB.name}...`}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {showDropdownB && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                  {filteredB.map((cand) => (
                    <button
                      key={cand.id}
                      onClick={() => {
                        setHeroB(cand);
                        setSearchB("");
                        setShowDropdownB(false);
                        handleSimulate(heroA, cand);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 text-slate-200 border-b border-slate-800/60"
                    >
                      <span className="font-semibold">{cand.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{cand.publisher}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contender B Profile Header */}
            <div className="flex gap-4 items-start pt-2">
              <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-amber-500/40 shrink-0 bg-slate-950">
                {heroB.image ? (
                  <img
                    src={heroB.image}
                    alt={heroB.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-transparent p-1 text-center">
                  <span className="text-[9px] font-mono text-amber-300 font-bold">
                    OVR {heroB.overallRating}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-100 tracking-tight truncate">
                    {heroB.name}
                  </h2>
                  <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-300 font-mono">
                    {heroB.publisher}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-amber-300 text-[9px] font-mono capitalize">
                    {heroB.category || "heroes"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {heroB.fullName !== heroB.name ? heroB.fullName : "Civilian Identity Classified"}
                </p>

                <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Tier: {heroB.powerTier}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded border text-capitalize ${
                      heroB.alignment === "good"
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : heroB.alignment === "bad"
                        ? "bg-red-950/60 border-red-500/40 text-red-300"
                        : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {heroB.alignment.toUpperCase()}
                  </span>
                </div>

                {heroB.signatureWeapon && (
                  <div className="text-[10.5px] font-mono text-amber-300/90 pt-1 line-clamp-1">
                    <span className="text-slate-500">Weapon:</span> {heroB.signatureWeapon}
                  </div>
                )}
              </div>
            </div>

            {/* Contender B Debut Comic Equity Card */}
            <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-amber-400" />
                  <span>FIRST APPEARANCE KEY</span>
                </span>
                <span className="text-emerald-400 font-bold">Panel Profits Valuation</span>
              </div>
              <p className="text-slate-200 font-semibold text-xs truncate">
                {heroB.firstAppearance}
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                <span className="text-slate-400">
                  Est. Raw: {heroB.firstAppearanceValueRawUsd ? formatCurrency(heroB.firstAppearanceValueRawUsd) : "Market Peg"}
                </span>
                <span className="text-amber-300 font-bold">
                  9.8 Slab: {heroB.firstAppearanceValue98Usd ? formatCurrency(heroB.firstAppearanceValue98Usd) : "Reference"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Power Matrix: {heroB.powerTier}</span>
            <span className="text-amber-400 font-bold">Win Odds: {battleResult.winProbabilityB}%</span>
          </div>
        </div>
      </div>

      {/* ── Combat Simulation Result Banner ── */}
      <div className="rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/40 via-[#120d18] to-amber-950/40 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-100">
              Battle Simulation Verdict: Winner is {battleResult.winner.name} ({Math.max(battleResult.winProbabilityA, battleResult.winProbabilityB)}% Probability)
            </h3>
          </div>
          <Badge variant="outline" className="border-amber-400/50 text-[10px] text-amber-300 font-mono">
            {battleResult.historicCanonCrossed ? "ARCHIVAL CANON LORE RECORD" : "HISTORIC UNPRECEDENTED FIRST"}
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          {battleResult.tacticalAnalysis}
        </p>

        <div className="rounded-lg bg-slate-900/70 border border-slate-800/80 p-3 text-xs text-slate-400 font-mono flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{battleResult.crossoverContext}</span>
        </div>
      </div>

      {/* ── Comparative Stat Radar / Bar Face-Off ── */}
      <section aria-labelledby="stat-heading" className="rounded-xl border border-slate-800 bg-[#0e131f] p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <h3 id="stat-heading" className="text-sm font-semibold text-slate-100">
              Canonical Power Grid Head-to-Head
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-cyan-400 font-semibold">{heroA.name}</span>
            <span className="text-slate-600">vs</span>
            <span className="text-amber-400 font-semibold">{heroB.name}</span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {statLabels.map(({ key, label, icon }) => {
            const valA = heroA.powerstats[key];
            const valB = heroB.powerstats[key];
            const maxVal = 100;
            const isWinnerA = valA > valB;
            const isWinnerB = valB > valA;

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={`font-semibold ${isWinnerA ? "text-cyan-300" : "text-slate-400"}`}>
                    {valA}
                  </span>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </span>
                  <span className={`font-semibold ${isWinnerB ? "text-amber-300" : "text-slate-400"}`}>
                    {valB}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 h-2.5">
                  {/* Left Bar (A) - Fills right to left */}
                  <div className="bg-slate-800/80 rounded-l overflow-hidden flex justify-end">
                    <div
                      className={`h-full transition-all duration-500 rounded-l ${
                        isWinnerA ? "bg-cyan-400" : "bg-cyan-700/60"
                      }`}
                      style={{ width: `${(valA / maxVal) * 100}%` }}
                    />
                  </div>

                  {/* Right Bar (B) - Fills left to right */}
                  <div className="bg-slate-800/80 rounded-r overflow-hidden flex justify-start">
                    <div
                      className={`h-full transition-all duration-500 rounded-r ${
                        isWinnerB ? "bg-amber-400" : "bg-amber-700/60"
                      }`}
                      style={{ width: `${(valB / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Round-by-Round Tactical Encounters ── */}
      <section aria-labelledby="rounds-heading" className="rounded-xl border border-slate-800 bg-[#0e131f] p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Flame className="h-4 w-4 text-red-400" />
          <h3 id="rounds-heading" className="text-sm font-semibold text-slate-100">
            Round-by-Round Combat Breakdown
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {battleResult.rounds.map((round) => (
            <div
              key={round.roundNumber}
              className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-4 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-slate-700 text-[9.5px] font-mono text-slate-400">
                    ROUND {round.roundNumber}
                  </Badge>
                  <span
                    className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      round.advantage === "contenderA"
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                        : round.advantage === "contenderB"
                        ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {round.advantage === "contenderA"
                      ? `${heroA.name} Advantage`
                      : round.advantage === "contenderB"
                      ? `${heroB.name} Advantage`
                      : "Even Clash"}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200">{round.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{round.narrative}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500 uppercase">
                Focus: {round.statFocus}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Financial Market Cap Face-off ── */}
      <section aria-labelledby="finance-heading" className="rounded-xl border border-emerald-500/30 bg-[#0e141c] p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <h3 id="finance-heading" className="text-sm font-semibold text-slate-100">
              Sovereign Comic Equity Face-Off: First Appearance Valuations
            </h3>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-300 font-mono">
            SECONDARY MARKET ASSET PARITY
          </Badge>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {battleResult.financialAdvantage.analysis}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-cyan-500/30 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">{heroA.name} Asset</span>
              <span className="text-[10px] font-mono text-slate-500">CGC 9.8 Market</span>
            </div>
            <p className="text-sm font-bold text-slate-100 truncate">{heroA.firstAppearance}</p>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {heroA.firstAppearanceValue98Usd
                ? formatCurrency(heroA.firstAppearanceValue98Usd)
                : "Active Tracking"}
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300">{heroB.name} Asset</span>
              <span className="text-[10px] font-mono text-slate-500">CGC 9.8 Market</span>
            </div>
            <p className="text-sm font-bold text-slate-100 truncate">{heroB.firstAppearance}</p>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {heroB.firstAppearanceValue98Usd
                ? formatCurrency(heroB.firstAppearanceValue98Usd)
                : "Active Tracking"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

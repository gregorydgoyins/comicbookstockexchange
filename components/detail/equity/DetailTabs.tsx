'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  ShieldCheck
} from 'lucide-react';

export type DetailTab = 'terminal' | 'fundamentals' | 'canon' | 'provenance';

interface TabConfig {
  id: DetailTab;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  tagline: string;
  // Distinctive Color Identities
  color: string;           // Base hex
  borderClass: string;     // Border color
  glowClass: string;       // Box shadow rim glow
  hoverBorderClass: string;
  hoverGlowClass: string;
  hoverBgClass: string;
  hoverTextClass: string;
  bgActive: string;        // Active background
  pillColor: string;       // Badge pill
  pillHoverColor: string;
  accentBorder: string;    // Inner delimiter
}

interface DetailTabsProps {
  accentColor?: string;
  hasSales?: boolean;
  hasConstellation?: boolean;
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
  children: {
    terminal: React.ReactNode;
    fundamentals: React.ReactNode;
    canon: React.ReactNode;
    provenance: React.ReactNode;
  };
}

export default function DetailTabs({
  accentColor = '#06b6d4',
  hasSales = false,
  hasConstellation = false,
  activeTab: controlledTab,
  onTabChange,
  children,
}: DetailTabsProps) {
  const [internalTab, setInternalTab] = useState<DetailTab>('terminal');
  const activeTab = controlledTab ?? internalTab;

  const handleTabClick = (tab: DetailTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // 4 Innately Different Architectural Domains with Distinct Color Identities & Rim Glows
  const tabConfigs: TabConfig[] = [
    {
      id: 'terminal',
      label: 'Trading & Valuation',
      badge: hasSales ? 'LIVE TICKS' : 'PRICE DISCOVERY',
      tagline: 'Trading Terminal & Autonomous Price Discovery Engine',
      icon: <BarChart3 className="w-4 h-4" />,
      color: '#06b6d4', // Cyan / Terminal Blue
      borderClass: 'border-cyan-500/80',
      glowClass: 'shadow-[0_0_20px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/60',
      hoverBorderClass: 'hover:border-cyan-400/80',
      hoverGlowClass: 'hover:shadow-[0_0_22px_rgba(6,182,212,0.45)] hover:ring-1 hover:ring-cyan-400/40',
      hoverBgClass: 'hover:bg-cyan-950/30',
      hoverTextClass: 'hover:text-cyan-200',
      bgActive: 'bg-cyan-950/50 text-cyan-200',
      pillColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      pillHoverColor: 'group-hover:border-cyan-400/50 group-hover:text-cyan-200 group-hover:bg-cyan-500/15',
      accentBorder: 'from-cyan-500 via-sky-400 to-transparent',
    },
    {
      id: 'fundamentals',
      label: 'Fundamental Intel',
      badge: hasConstellation ? 'EQUILIBRIUM' : 'INSTITUTIONAL',
      tagline: 'Sovereign Constellation, Graham Margin & Scarcity Float',
      icon: <TrendingUp className="w-4 h-4" />,
      color: '#a855f7', // Purple / Institutional Violet
      borderClass: 'border-purple-500/80',
      glowClass: 'shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-purple-400/60',
      hoverBorderClass: 'hover:border-purple-400/80',
      hoverGlowClass: 'hover:shadow-[0_0_22px_rgba(168,85,247,0.45)] hover:ring-1 hover:ring-purple-400/40',
      hoverBgClass: 'hover:bg-purple-950/30',
      hoverTextClass: 'hover:text-purple-200',
      bgActive: 'bg-purple-950/50 text-purple-200',
      pillColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
      pillHoverColor: 'group-hover:border-purple-400/50 group-hover:text-purple-200 group-hover:bg-purple-500/15',
      accentBorder: 'from-purple-500 via-fuchsia-400 to-transparent',
    },
    {
      id: 'canon',
      label: 'Canon & Narrative',
      badge: 'CULTURAL LORE',
      tagline: 'GCD Bibliographic Authority, Creator Credits & Story Architecture',
      icon: <BookOpen className="w-4 h-4" />,
      color: '#f59e0b', // Amber / Gold Canon
      borderClass: 'border-amber-500/80',
      glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/60',
      hoverBorderClass: 'hover:border-amber-400/80',
      hoverGlowClass: 'hover:shadow-[0_0_22px_rgba(245,158,11,0.45)] hover:ring-1 hover:ring-amber-400/40',
      hoverBgClass: 'hover:bg-amber-950/30',
      hoverTextClass: 'hover:text-amber-200',
      bgActive: 'bg-amber-950/50 text-amber-200',
      pillColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      pillHoverColor: 'group-hover:border-amber-400/50 group-hover:text-amber-200 group-hover:bg-amber-500/15',
      accentBorder: 'from-amber-500 via-yellow-400 to-transparent',
    },
    {
      id: 'provenance',
      label: 'Audit & Provenance',
      badge: 'VERIFIED TRUTH',
      tagline: 'Cryptographic Ledger, Due Diligence & Census Evidence',
      icon: <ShieldCheck className="w-4 h-4" />,
      color: '#10b981', // Emerald / Audit Green
      borderClass: 'border-emerald-500/80',
      glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/60',
      hoverBorderClass: 'hover:border-emerald-400/80',
      hoverGlowClass: 'hover:shadow-[0_0_22px_rgba(16,185,129,0.45)] hover:ring-1 hover:ring-emerald-400/40',
      hoverBgClass: 'hover:bg-emerald-950/30',
      hoverTextClass: 'hover:text-emerald-200',
      bgActive: 'bg-emerald-950/50 text-emerald-200',
      pillColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      pillHoverColor: 'group-hover:border-emerald-400/50 group-hover:text-emerald-200 group-hover:bg-emerald-500/15',
      accentBorder: 'from-emerald-500 via-teal-400 to-transparent',
    },
  ];

  const currentConfig = tabConfigs.find((t) => t.id === activeTab) || tabConfigs[0];

  return (
    <div className="w-full space-y-6">
      {/* Sticky Cockpit Navigation Dock with Distinctive Pill Selection & Rim Glows */}
      <div className="sticky top-14 z-30 -mx-4 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-y border-white/10 sm:rounded-xl sm:mx-0 sm:border">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 sm:gap-3">
              {tabConfigs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-sans text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap select-none border ${
                      isActive
                        ? `${tab.bgActive} ${tab.borderClass} ${tab.glowClass}`
                        : `text-slate-400 border-white/5 ${tab.hoverBorderClass} ${tab.hoverGlowClass} ${tab.hoverBgClass} ${tab.hoverTextClass}`
                    }`}
                  >
                    {/* Status Pip with Active/Hover Glow */}
                    <span
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isActive ? 'scale-110' : 'group-hover:scale-125'
                      }`}
                      style={{
                        backgroundColor: tab.color,
                        boxShadow: isActive ? `0 0 10px ${tab.color}` : undefined,
                      }}
                    />

                    {/* Icon */}
                    <span
                      className="transition-colors duration-200"
                      style={{ color: isActive ? tab.color : undefined }}
                    >
                      {tab.icon}
                    </span>

                    {/* Label */}
                    <span className="font-semibold">{tab.label}</span>

                    {/* Category Distinguishing Badge Pill */}
                    {tab.badge && (
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono font-extrabold rounded-full tracking-normal uppercase transition-all ${
                          isActive
                            ? tab.pillColor
                            : `bg-white/5 text-slate-300 border border-white/10 ${tab.pillHoverColor}`
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}

                    {/* Active & Hover Top Laser Accent */}
                    <span
                      className={`absolute -top-[1px] left-3 right-3 h-[2px] rounded-full blur-[0.5px] transition-all duration-300 ${
                        isActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tab.color,
                        boxShadow: `0 0 8px ${tab.color}`,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Live Telemetry / Verification Pill */}
            <div className="hidden xl:flex items-center gap-3 text-[10px] font-mono tracking-tight pl-4 border-l border-white/10 shrink-0">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border border-white/10">
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: currentConfig.color }}
                />
                <span className="text-white font-semibold">{currentConfig.label}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 uppercase">{currentConfig.badge}</span>
              </span>
            </div>
          </div>

          {/* Innate Domain Delimiter & Tagline Sub-Bar */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-300 border-t border-white/10 pt-2.5 font-sans">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: currentConfig.color,
                  boxShadow: `0 0 8px ${currentConfig.color}`,
                }}
              />
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-200" style={{ letterSpacing: '0.08em' }}>
                {currentConfig.tagline}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 text-xs font-mono uppercase tracking-wider text-slate-400">
              <span className="font-semibold text-slate-300">
                Domain 0{tabConfigs.findIndex((t) => t.id === activeTab) + 1} of 04
              </span>
              <span className="text-slate-600">•</span>
              <span
                className="px-2 py-0.5 rounded font-bold text-[10px] tracking-widest border"
                style={{
                  color: currentConfig.color,
                  borderColor: `${currentConfig.color}40`,
                  backgroundColor: `${currentConfig.color}15`,
                }}
              >
                Authentic Intelligence Architecture
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Workspaces with Ambient Colored Domain Edge Accent */}
      <div
        className="tab-viewport rounded-xl transition-all duration-300"
        style={{
          borderLeft: `2px solid ${currentConfig.color}40`,
          paddingLeft: '1rem',
        }}
      >
        <div className={activeTab === 'terminal' ? 'space-y-6 animate-in fade-in-50 duration-200' : 'hidden'}>
          {children.terminal}
        </div>

        <div className={activeTab === 'fundamentals' ? 'space-y-6 animate-in fade-in-50 duration-200' : 'hidden'}>
          {children.fundamentals}
        </div>

        <div className={activeTab === 'canon' ? 'space-y-6 animate-in fade-in-50 duration-200' : 'hidden'}>
          {children.canon}
        </div>

        <div className={activeTab === 'provenance' ? 'space-y-6 animate-in fade-in-50 duration-200' : 'hidden'}>
          {children.provenance}
        </div>
      </div>
    </div>
  );
}

'use client';
import React from 'react';
import { Diamond } from 'lucide-react';
import Panel from './Panel';
import { getEraColors } from '@/lib/design-system/colors';

export interface ScarcityIndexCardProps {
  censusSummary: {
    totalGraded: number;
    highGradeCount: number;
  } | null | undefined;
  variant: {
    era: string | null;
    scarcityTier: string | null;
    workName: string;
    issueNumber: string;
  };
  eraColors: { border: string; bg: string; bgHover: string; glow: string };
}

interface TierInfo {
  name: string;
  emoji: string;
  color: string;
}

function computeScarcityScore(
  era: string | null | undefined,
  totalGraded: number,
  highGradeCount: number
): number {
  let score = 50;

  const eraLower = (era || '').toLowerCase().trim();
  if (eraLower.includes('golden')) {
    score += 30;
  } else if (eraLower.includes('silver')) {
    score += 20;
  } else if (eraLower.includes('bronze')) {
    score += 10;
  } else if (eraLower.includes('copper')) {
    score += 5;
  }

  if (totalGraded < 50) {
    score += 25;
  } else if (totalGraded < 200) {
    score += 15;
  } else if (totalGraded < 500) {
    score += 10;
  } else if (totalGraded < 1000) {
    score += 5;
  }

  if (highGradeCount < 10) {
    score += 15;
  } else if (highGradeCount < 50) {
    score += 10;
  } else if (highGradeCount < 100) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

function getScarcityTierInfo(score: number): TierInfo {
  if (score >= 80) {
    return { name: 'MYTHIC (UNICORN)', emoji: '👑', color: '#c084fc' };
  }
  if (score >= 60) {
    return { name: 'LEGENDARY', emoji: '💎', color: '#f59e0b' };
  }
  if (score >= 45) {
    return { name: 'EPIC', emoji: '🛡', color: '#ec4899' };
  }
  if (score >= 30) {
    return { name: 'RARE', emoji: '🔥', color: '#38bdf8' };
  }
  if (score >= 15) {
    return { name: 'UNCOMMON', emoji: '📦', color: '#10b981' };
  }
  return { name: 'COMMON', emoji: '📋', color: '#6b7280' };
}

export default function ScarcityIndexCard({
  censusSummary,
  variant,
  eraColors,
}: ScarcityIndexCardProps) {
  const colors = eraColors ?? getEraColors(variant?.era);

  if (!censusSummary) {
    return (
      <Panel
        title="Scarcity Index"
        icon={<Diamond className="w-3.5 h-3.5" />}
        eraColors={colors as ReturnType<typeof getEraColors>}
      >
        <div
          className="text-xs text-center py-5 select-none"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Hind, sans-serif' }}
        >
          Census data unavailable
        </div>
      </Panel>
    );
  }

  const totalGraded =
    typeof censusSummary.totalGraded === 'number' ? censusSummary.totalGraded : 0;
  const highGradeCount =
    typeof censusSummary.highGradeCount === 'number' ? censusSummary.highGradeCount : 0;

  const score = computeScarcityScore(variant?.era, totalGraded, highGradeCount);
  const tier = getScarcityTierInfo(score);

  const size = 80;
  const strokeWidth = 4;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const highGradeRatio = totalGraded > 0 ? (highGradeCount / totalGraded) * 100 : 0;
  const formattedRatio =
    highGradeRatio > 0 && highGradeRatio < 0.1 ? '<0.1%' : `${highGradeRatio.toFixed(1)}%`;

  return (
    <Panel
      title="Scarcity Index"
      icon={<Diamond className="w-3.5 h-3.5" />}
      eraColors={colors as ReturnType<typeof getEraColors>}
    >
      <div style={{ fontFamily: 'Hind, sans-serif' }}>
        {/* Scarcity Score Ring & Rarity Badge */}
        <div className="flex flex-col items-center justify-center pt-1 pb-2">
          <div
            className="relative flex items-center justify-center"
            style={{ width: `${size}px`, height: `${size}px` }}
          >
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="block"
            >
              {/* Background Track Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={strokeWidth}
              />
              {/* Animated Progress Circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={tier.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="text-2xl font-bold leading-none"
                style={{ color: tier.color, fontFamily: 'monospace' }}
              >
                {score}
              </span>
              <span
                className="text-[9px] uppercase tracking-wider mt-0.5"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
              >
                /100
              </span>
            </div>
          </div>

          {/* Rarity Classification Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase select-none mt-2.5"
            style={{
              backgroundColor: `${tier.color}15`,
              color: tier.color,
              border: `1px solid ${tier.color}35`,
              fontFamily: 'monospace',
            }}
          >
            <span>{tier.name}</span>
            <span>{tier.emoji}</span>
          </div>
        </div>

        {/* Population Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div
            className="rounded-lg p-3 flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              className="uppercase tracking-wider text-[9px] mb-1 font-mono"
              style={{
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.08em',
              }}
            >
              TOTAL GRADED
            </span>
            <span
              className="text-lg font-bold font-mono leading-tight"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              {totalGraded.toLocaleString()}
            </span>
          </div>

          <div
            className="rounded-lg p-3 flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255,255,255,0.025)',
              border: `1px solid ${tier.color}35`,
            }}
          >
            <span
              className="uppercase tracking-wider text-[9px] mb-1 font-mono"
              style={{
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.08em',
              }}
            >
              9.8+ COUNT
            </span>
            <span
              className="text-lg font-bold font-mono leading-tight"
              style={{ color: tier.color }}
            >
              {highGradeCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* High-Grade Ratio */}
        <div
          className="mt-2.5 rounded-lg p-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="uppercase tracking-wider text-[9px] font-mono"
              style={{
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.08em',
              }}
            >
              HIGH-GRADE RATIO (9.8+)
            </span>
            <span
              className="text-xs font-bold font-mono"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              {formattedRatio}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, highGradeRatio))}%`,
                backgroundColor: tier.color,
              }}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

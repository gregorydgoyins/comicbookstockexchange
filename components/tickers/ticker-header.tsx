"use client";

import * as React from "react";
import { ERA_LEGEND, SCARCITY_LEGEND } from "@/lib/equity/ticker-constants";

interface TickerHeaderProps {
  showing: number;
  total: number;
  tick?: number;
  loading?: boolean;
  stalled?: boolean;
  eraCounts?: Record<string, number>;
  scarcityCounts?: Record<string, number>;
  noSignalFilter?: boolean;
  noSignalCount?: number;
  heritageCount?: number;
  selectedEra?: string | null;
  onSelectEra?: (era: string | null) => void;
  onNextBatch?: () => void;
  onRetry?: () => void;
  onToggleNoSignal?: () => void;
}

export function TickerHeader({
  showing,
  total,
  stalled = false,
  eraCounts = {},
  scarcityCounts = {},
  noSignalFilter = false,
  noSignalCount = 0,
  heritageCount = 0,
  selectedEra = null,
  onSelectEra,
  onNextBatch,
  onRetry,
  onToggleNoSignal,
}: TickerHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 14px",
        overflowX: "auto",
        scrollbarWidth: "none",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backgroundColor: "#0a0f1c",
        position: "relative",
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Live pulse dot */}
      {stalled ? (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#f59e0b",
              flexShrink: 0,
              boxShadow: "0 0 6px #f59e0baa, 0 0 12px #f59e0b55",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#f59e0b",
              fontFamily: "var(--font-sans, system-ui)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              whiteSpace: "nowrap",
            }}
          >
            ⚠ Stalled
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                fontSize: "9px",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.4)",
                borderRadius: "3px",
                padding: "1px 6px",
                backgroundColor: "rgba(245,158,11,0.1)",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#4ade80",
              boxShadow: "0 0 6px #4ade8099",
            }}
            className="animate-pulse"
          />
        </div>
      )}

      {/* Title */}
      <span
        style={{
          fontSize: "12px",
          fontFamily: "var(--font-sans, system-ui)",
          fontWeight: 600,
          color: "#4ade80",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        EQUITIES · EQUITY MARKET
      </span>


      {total > 0 && (
        <>
          <span style={{ fontSize: "11px", color: "#334155", flexShrink: 0 }}>·</span>
          <span
            style={{
              fontSize: "10px",
              color: "#475569",
              fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {total.toLocaleString()} instruments
          </span>
        </>
      )}

      {/* Rotate / Next Batch Button */}
      {onNextBatch && (
        <button
          type="button"
          onClick={onNextBatch}
          title="Rotate equities to the next 80 continuous issues across the 38,957 verified catalog"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            flexShrink: 0,
            backgroundColor: "rgba(56,189,248,0.14)",
            border: "1px solid rgba(56,189,248,0.45)",
            color: "#38bdf8",
            fontSize: "9px",
            fontFamily: "monospace",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            transition: "all 150ms ease",
          }}
        >
          <span>↻ Rotate</span>
        </button>
      )}

      <div style={{ width: "1px", height: "12px", backgroundColor: "rgba(255,255,255,0.1)", flexShrink: 0, margin: "0 2px" }} />

      {/* Era chips */}
      {ERA_LEGEND.map(({ key, label, color }) => {
        const n = eraCounts[key] ?? 0;
        const isSelected = selectedEra === key;
        const active = n > 0 || isSelected;
        return (
          <button
            key={key}
            type="button"
            onClick={onSelectEra ? () => onSelectEra(isSelected ? null : key) : undefined}
            title={`Filter ticker to ${label} (${n} issues)`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: onSelectEra ? "pointer" : "default",
              flexShrink: 0,
              backgroundColor: isSelected ? `${color}35` : active ? `${color}15` : "transparent",
              border: `1px solid ${isSelected ? color : active ? color + "35" : "rgba(255,255,255,0.07)"}`,
              boxShadow: isSelected ? `0 0 8px ${color}60` : "none",
              opacity: isSelected ? 1 : active ? 1 : 0.32,
              transition: "all 150ms ease",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: isSelected ? "#fff" : active ? color : "#4b5563",
                boxShadow: active ? `0 0 4px ${color}80` : "none",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-sans, system-ui)",
                fontWeight: isSelected ? 700 : 500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: isSelected ? "#ffffff" : active ? color : "#6b7280",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "monospace",
                color: isSelected ? "#ffffff" : active ? `${color}bb` : "#374151",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {n}
            </span>
          </button>
        );
      })}

      <div style={{ width: "1px", height: "12px", backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0, margin: "0 2px" }} />

      {/* Scarcity chips */}
      {SCARCITY_LEGEND.map(({ key, label, color, Icon }) => {
        const n = scarcityCounts[key] ?? 0;
        const active = n > 0;
        return (
          <div
            key={key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "default",
              flexShrink: 0,
              backgroundColor: active ? `${color}15` : "transparent",
              border: `1px solid ${active ? color + "35" : "rgba(255,255,255,0.07)"}`,
              opacity: active ? 1 : 0.28,
            }}
          >
            <Icon size={8} style={{ color: active ? color : "#4b5563", flexShrink: 0, filter: active ? `drop-shadow(0 0 3px ${color}99)` : "none" }} />
            <span
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-sans, system-ui)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: active ? color : "#6b7280",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "monospace",
                color: active ? `${color}bb` : "#374151",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {n.toLocaleString()}
            </span>
          </div>
        );
      })}

      {/* Heritage Vault badge — informational count of mythic-tier items */}
      {heritageCount > 0 && (
        <>
          <div style={{ width: "1px", height: "12px", backgroundColor: "rgba(212,165,116,0.20)", flexShrink: 0, margin: "0 2px" }} />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 7px",
              borderRadius: "3px",
              flexShrink: 0,
              backgroundColor: "rgba(212,165,116,0.10)",
              border: "1px solid rgba(212,165,116,0.30)",
            }}
          >
            <span style={{ fontSize: "9px" }}>🏛</span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-sans, system-ui)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "#d4a574",
                whiteSpace: "nowrap",
              }}
            >
              Vault
            </span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "monospace",
                color: "rgba(212,165,116,0.73)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {heritageCount}
            </span>
          </div>
        </>
      )}

      {/* NO SIGNAL filter toggle */}
      {onToggleNoSignal && (
        <button
          onClick={onToggleNoSignal}
          title={noSignalFilter ? "Clear NO SIGNAL filter" : `Show only zero-confidence cards (${noSignalCount})`}
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "9px",
            fontFamily: "var(--font-sans, system-ui)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: noSignalFilter ? "#ef4444" : noSignalCount > 0 ? "#f87171" : "#475569",
            border: noSignalFilter
              ? "1px solid rgba(239,68,68,0.55)"
              : noSignalCount > 0
              ? "1px solid rgba(248,113,113,0.30)"
              : "1px solid rgba(255,255,255,0.08)",
            borderRadius: "3px",
            padding: "2px 8px",
            backgroundColor: noSignalFilter ? "rgba(239,68,68,0.14)" : "transparent",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "color 150ms, border-color 150ms, background-color 150ms",
          }}
        >
          <span style={{ fontSize: "8px" }}>⚠</span>
          {noSignalFilter ? `NO SIGNAL · ${noSignalCount} · ✕ clear` : `NO SIGNAL · ${noSignalCount}`}
        </button>
      )}
    </div>
  );
}

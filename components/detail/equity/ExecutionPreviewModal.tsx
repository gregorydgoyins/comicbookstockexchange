'use client';
import type { DetailResponse } from './types';
import type { ExecutionQuote } from '@/lib/comics/detail-model';
import { getEraColors } from '@/lib/design-system/colors';
import { fmt, fmtDate } from './shared';

/**
 * Buy / sell quote for one grade, built only from stored PriceCharting figures: the listed price, what
 * dealers pay (buy) and what retail asks (sell). If a figure is not stored it is not shown, and nothing
 * (fill odds, slippage, liquidity) is estimated. No trade is executed.
 */
export default function ExecutionPreviewModal({ variant, quote, onClose, onConfirm, eraColors, action }: {
  variant: DetailResponse['variant'];
  quote: ExecutionQuote | null;
  onClose: () => void;
  onConfirm?: () => void;
  eraColors: ReturnType<typeof getEraColors>;
  action: 'buy' | 'sell';
}) {
  const actionColor = action === 'buy' ? '#4ade80' : '#f87171';
  const actionLabel = action === 'buy' ? 'BUY' : 'SELL';
  const gradeLabel = quote ? (quote.grade === 'RAW' ? 'Raw' : `CGC ${quote.grade}`) : null;
  const spreadPct =
    quote?.buyUsd != null && quote.sellUsd != null && quote.sellUsd > 0
      ? ((quote.sellUsd - quote.buyUsd) / quote.sellUsd) * 100
      : null;

  const cells: Array<{ label: string; value: number | null; emphasis: boolean }> = [
    { label: 'Listed price', value: quote?.fmvUsd ?? null, emphasis: false },
    { label: 'Dealer buy', value: quote?.buyUsd ?? null, emphasis: action === 'sell' },
    { label: 'Retail sell', value: quote?.sellUsd ?? null, emphasis: action === 'buy' },
  ];
  const anyFigure = cells.some((c) => c.value != null);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 300, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="rounded-xl overflow-hidden" style={{ width: '420px', maxWidth: '92vw', border: `1px solid ${eraColors.border}40`, backgroundColor: '#0d1220' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${eraColors.border}20`, backgroundColor: `${eraColors.border}08` }}>
          <div>
            <div className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: eraColors.border }}>Quote</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {variant.workName} #{variant.issueNumber}{gradeLabel ? ` · ${gradeLabel}` : ''}
            </div>
          </div>
          <span className="text-[11px] px-3 py-1 rounded uppercase tracking-widest" style={{ backgroundColor: `${actionColor}18`, color: actionColor, border: `1px solid ${actionColor}40` }}>{actionLabel}</span>
        </div>

        <div className="p-5 space-y-4">
          {anyFigure ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {cells.map(({ label, value, emphasis }) => (
                  <div key={label} className="rounded p-2.5 text-center" style={{ backgroundColor: emphasis ? `${actionColor}10` : 'rgba(255,255,255,0.03)', border: `1px solid ${emphasis ? `${actionColor}40` : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="text-[8px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                    <div className="text-sm font-semibold" style={{ color: value != null ? (emphasis ? actionColor : '#fff') : 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                      {value != null ? fmt(value) : '—'}
                    </div>
                  </div>
                ))}
              </div>
              {spreadPct != null && (
                <div className="flex items-center justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>
                  <span className="uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Gap, dealer buy to retail sell</span>
                  <span>{spreadPct.toFixed(1)}%</span>
                </div>
              )}
              {(quote?.buyUsd == null || quote?.sellUsd == null) && (
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Exchange ledger has no stored {quote?.buyUsd == null && quote?.sellUsd == null ? 'dealer buy or retail sell' : quote?.buyUsd == null ? 'dealer buy' : 'retail sell'} figure at this grade.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>No exchange benchmark price is stored for this book yet, so there is nothing to quote.</p>
          )}

          <p className="text-[8px] text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Stored exchange benchmark figures{quote?.asOf ? ` · as of ${fmtDate(quote.asOf)}` : ''} · Simulated, no trade is executed
          </p>

          <button
            onClick={() => { onConfirm?.(); onClose(); }}
            className="w-full py-2 rounded text-xs uppercase tracking-widest transition-all"
            style={{ backgroundColor: `${actionColor}15`, color: actionColor, border: `1px solid ${actionColor}35` }}
          >
            Acknowledge {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, type ReactNode } from 'react';
import { getEraColors } from '@/lib/design-system/colors';

export default function Panel({ title, icon, children, eraColors, action }: {
  title: string; icon?: ReactNode; children: ReactNode;
  eraColors: ReturnType<typeof getEraColors>; action?: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl overflow-hidden bg-[#070d18]/90 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div
        className="px-4 py-3 flex items-center gap-2.5 cursor-pointer select-none transition-colors"
        style={{ backgroundColor: open ? `${eraColors.border}0c` : `${eraColors.border}05`, borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        {icon && <span style={{ color: eraColors.border }}>{icon}</span>}
        <span className="text-xs uppercase tracking-wider font-bold flex-1 text-slate-200 font-sans" style={{ letterSpacing: '0.08em' }}>{title}</span>
        {action}
        <span className="text-[10px] px-1.5 py-0.5 rounded ml-1 bg-white/5 border border-white/10 text-slate-400 font-sans">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="p-4 sm:p-5">{children}</div>}
    </div>
  );
}

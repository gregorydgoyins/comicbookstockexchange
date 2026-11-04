'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { getEraColors } from '@/lib/design-system/colors';
import type { Creator } from './types';
import Panel from './Panel';
import AISectionBlock from './AISectionBlock';

export default function CreatorsPanel({ assetId, eraColors, creatorSignature, initialCreators }: {
  assetId: string;
  eraColors: ReturnType<typeof getEraColors>;
  creatorSignature?: string | null;
  initialCreators?: Creator[];
}) {
  const { data, isLoading } = useQuery<{ data: Creator[] }>({
    queryKey: ['creators', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/creators/${assetId}`);
      if (!res.ok) return { data: initialCreators || [] };
      return res.json();
    },
    initialData: initialCreators ? { data: initialCreators } : undefined,
    staleTime: Infinity,
  });

  const creators = (data?.data && data.data.length > 0) ? data.data : (initialCreators || []);
  const roleOrder = ['writer', 'penciler', 'inker', 'colorist', 'letterer', 'cover', 'artist', 'creator', 'editor'];
  const sorted = [...creators].sort((a, b) => {
    const ai = roleOrder.indexOf(a.role.toLowerCase()); const bi = roleOrder.indexOf(b.role.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const { data: aiCreatorsData, isLoading: aiLoading } = useQuery<{ success: boolean; creators: Array<{ name: string; role: string; bio: string; keyWorks: string; imageUrl: string | null }> }>({
    queryKey: ['ai-creators', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/hammer/ai-creators/${assetId}`);
      if (!res.ok) return { success: false, creators: [] };
      return res.json();
    },
    staleTime: Infinity,
  });

  const aiCreators = aiCreatorsData?.creators || [];

  const mergedCreators = useMemo(() => {
    const dbNames = new Set(sorted.map(c => c.name.toLowerCase().trim()));
    const aiOnly = aiCreators.filter(c => !dbNames.has(c.name.toLowerCase().trim()));
    const dbMapped = sorted.map(c => ({ name: c.name, role: c.role, bio: c.bio, notableWorks: c.notableWorks, imageUrl: c.imageUrl, isAi: false }));
    const aiMapped = aiOnly.map(c => ({ name: c.name, role: c.role, bio: c.bio, notableWorks: c.keyWorks, imageUrl: c.imageUrl, isAi: true }));
    return [...dbMapped, ...aiMapped].sort((a, b) => {
      const ai = roleOrder.indexOf(a.role.toLowerCase()); const bi = roleOrder.indexOf(b.role.toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [sorted, aiCreators]);

  const ROLE_COLORS: Record<string, string> = {
    writer: '#a78bfa', penciler: '#60a5fa', inker: '#fbbf24', colorist: '#4ade80',
    letterer: '#34d399', cover: '#f472b6', artist: '#60a5fa', creator: '#a78bfa',
    editor: 'rgba(255,255,255,0.35)',
  };
  const roleColor = (role: string) => ROLE_COLORS[role.toLowerCase()] ?? 'rgba(255,255,255,0.35)';

  const renderCreatorCard = (c: { name: string; role: string; bio: string | null | undefined; notableWorks: string | string[] | null | undefined; imageUrl: string | null | undefined; isAi: boolean }, i: number) => {
    const { name, role, bio, notableWorks, imageUrl, isAi } = c;
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const works = typeof notableWorks === 'string' ? notableWorks : (notableWorks || []).join(', ');
    const rc = roleColor(role);
    return (
      <div key={`${name}-${role}-${i}`} className="py-2.5 px-2.5 rounded" style={{ backgroundColor: `${rc}08`, border: `1px solid ${rc}20` }}>
        <div className="flex items-start gap-3">
          <Link href={`/creator/${encodeURIComponent(name)}`} className="flex-shrink-0">
            <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ width: '48px', height: '48px', border: `1px solid ${rc}40`, backgroundColor: `${rc}18` }}>
              {imageUrl ? (
                <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-[13px]" style={{ color: rc, fontFamily: 'monospace' }}>{initials}</span>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/creator/${encodeURIComponent(name)}`} className="text-xs hover:underline" style={{ color: '#fff' }}>{name}</Link>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isAi && <span className="text-[7px] px-1 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: 'rgba(167,139,250,0.7)', border: '1px solid rgba(167,139,250,0.22)', fontFamily: 'monospace', letterSpacing: '0.12em' }}>AI</span>}
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: `${rc}18`, color: rc, border: `1px solid ${rc}35` }}>{role}</span>
              </div>
            </div>
            {bio && <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>{bio}</p>}
            {works && <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Known for: {works}</p>}
          </div>
        </div>
      </div>
    );
  };

  const showLoading = isLoading || (mergedCreators.length === 0 && aiLoading);

  return (
    <Panel title="Creators" icon={<Users className="w-3.5 h-3.5" />} eraColors={eraColors}>
      {showLoading ? (
        <div className="h-16 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.40)', fontSize: '11px' }}>Researching creative team…</div>
      ) : mergedCreators.length > 0 ? (
        <div className="space-y-2">{mergedCreators.map((c, i) => renderCreatorCard(c, i))}</div>
      ) : (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No creator data on record for this issue.</p>
      )}
      <AISectionBlock text={creatorSignature} accentColor="#a78bfa" label="Creator Market Signature" />
    </Panel>
  );
}

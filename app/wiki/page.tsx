import Link from 'next/link';
import {createAdminServerClient} from '@/lib/supabase/admin';
import {createPublicServerClient} from '@/lib/supabase/server';
import {searchPpcfComics} from '@/lib/ppcf/queries';
import {searchCbrTerms} from '@/lib/lexicon/cbr-lexicon';
import {wikiCategories} from '@/lib/wiki/structure';
import {VersusMatchupWidget} from '@/components/versus/VersusMatchupWidget';
export const dynamic='force-dynamic';
export const fetchCache='force-no-store';
export default async function WikiHome({searchParams}:{searchParams:Promise<{q?:string}>}) {
 const q=((await searchParams).q || '').trim().slice(0,180);const db=createPublicServerClient();
 let query=db.from('ppcf_wiki_pages').select('slug,display_title,universe,page_type,summary').limit(9);
 if(q)query=query.ilike('display_title',`%${q.replace(/[%_]/g,'')}%`);else query=query.in('slug',['peter-parker-earth-616','bruce-wayne-new-earth','luke-skywalker','darth-vader','spawn','optimus-prime','wonder-woman']);
 const [articles,issues,creators]=await Promise.all([query,q?searchPpcfComics(q,8):Promise.resolve([]),q?createAdminServerClient().from("ppcf_gcd_creators").select("gcd_creator_id,official_name").ilike("official_name",`%${q.replace(/[%_]/g,"")}%`).limit(6):Promise.resolve({data:[],error:null})]);
 const terms=q?searchCbrTerms(q,6):[];
 const universes=Object.entries(wikiCategories).filter(([,c])=>c.column==='universe');
 return <main className="wiki-page"><div className="wiki-kicker">The Panel Profits knowledge project</div><h1>{q?`Research: ${q}`:'Every comic has a story.\nEvery decision needs research.'}</h1><p className="wiki-lead">Explore the issues, people and worlds behind comic collecting. Connect publication history and story context with prices, graded populations and the financial concepts used in Sniper.</p><div className="wiki-rule"/>{!q && <><div className="wiki-section-heading"><h2>Explore a universe</h2><Link href="/wiki/categories">View every category ↗</Link></div><div className="wiki-universe-grid">{universes.map(([key,c])=><Link className="wiki-universe" href={`/wiki/category/${key}`} key={key}><strong>{c.title}</strong><small>Browse the research library ↗</small></Link>)}</div></>}
 <div className="wiki-section-heading"><h2>{q?'Articles':'Explore the library'}</h2><Link href="/wiki/category/characters">Character directory ↗</Link></div>{articles.error?<p className="wiki-error">The article search could not be read. Reload to retry.</p>:articles.data?.length?<div className="wiki-card-grid">{articles.data.map(a=><Link className="wiki-card" key={a.slug} href={`/wiki/entry/${encodeURIComponent(a.slug)}?universe=${encodeURIComponent(a.universe)}`}><span className="wiki-tag">{a.universe.replace(/_/g,' ')} · {a.page_type.toLowerCase()}</span><h3>{a.display_title.replace(/'{2,5}/g,'')}</h3>{a.summary && <p>{a.summary.replace(/\|[a-z_]+\s*=/gi,'').slice(0,240)}</p>}</Link>)}</div>:<p className="wiki-lead">{q?'No article title matched this search. Try the comic series, a character’s full name or a financial term.':'Browse a universe or search the library to open an article.'}</p>}
 {issues.length>0 && <><div className="wiki-section-heading"><h2>Comic issues &amp; editions</h2><Link href={`/wiki/issues?q=${encodeURIComponent(q)}`}>More issue records ↗</Link></div>{issues.map(i=><Link className="wiki-directory-row" key={i.ppcf_id} href={`/wiki/${i.ppcf_id}`}><strong>{i.series_name} #{i.issue_number}</strong><small>{i.variant_name || 'Edition record'} · {i.publication_date}</small></Link>)}</>}
 {creators.data?.length ? <><div className="wiki-section-heading"><h2>Creators</h2><Link href={`/wiki/creators?q=${encodeURIComponent(q)}`}>Creator directory ↗</Link></div><div className="wiki-card-grid">{creators.data.map(c=><Link key={c.gcd_creator_id} className="wiki-card" href={`/wiki/creators/${c.gcd_creator_id}`}><span className="wiki-tag">Creator record</span><h3>{c.official_name}</h3></Link>)}</div></>:null}
 {terms.length>0 && <><div className="wiki-section-heading"><h2>Financial dictionary</h2></div><div className="wiki-pills">{terms.map(t=><Link key={t.slug} href={`/wiki/terms/${t.slug}`}>{t.term}</Link>)}</div></>}
  <section className="mt-8 pt-6 border-t border-slate-800">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div>
        <h2 className="text-xl font-bold tracking-wide uppercase text-white font-sans flex items-center gap-2">
          <span className="p-1 rounded bg-amber-500/20 text-amber-300 text-sm">⚔️</span>
          Multiverse Canon Versus Arena
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Simulate authentic head-to-head clashes across heroes, supervillains, gadgets, superpowers, places, and creators.
        </p>
      </div>
      <Link href="/versus" className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 border border-cyan-500/30 px-3 py-1.5 rounded-lg bg-cyan-950/40">
        <span>Full Standalone Arena</span>
        <span>↗</span>
      </Link>
    </div>
    <VersusMatchupWidget />
  </section>
 {!q && <section className="wiki-evidence"><strong className="text-slate-100">From research to practice.</strong> Start with the edition, compare the same grade and separate guide estimates from recorded sales. <Link href="/sniper" className="text-amber-200">Put your research to work in Sniper ↗</Link></section>}</main>;
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createPublicServerClient } from '@/lib/supabase/server';
import { getLoreEntityBySlug, type LoreEntitySummary } from '@/lib/wiki/lore-search';
import creatorSeed from '@/lib/creators/creators-seed.json';
import { wikiPlainText } from '@/lib/wiki/article-text';
import { getEnrichedCharacterBySlug } from '@/lib/wiki/character-lore-service';
import { VersusMatchupWidget } from '@/components/versus/VersusMatchupWidget';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function LoreEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ universe?: string }>;
}) {
  const { slug } = await params;
  const universe = (await searchParams).universe?.trim().toUpperCase();

  let query = createPublicServerClient()
    .from('ppcf_wiki_pages')
    .select('slug,display_title,universe,page_type,reality,creators,first_appearance,summary')
    .eq('slug', slug.toLowerCase().trim());
  if (universe) query = query.eq('universe', universe);
  const { data: exactPage, error } = await query.maybeSingle();
  if (error) throw new Error('Stored wiki article could not be read');
  let page = exactPage;

  if (!page && !universe) {
    const normalized = slug.toLowerCase().trim();
    let aliasSlug = normalized;
    if (
      normalized === 'j-jonah-jameson' ||
      normalized === 'jj-jameson' ||
      normalized === 'jonah-jameson' ||
      normalized === 'john-jonah-jameson'
    ) {
      aliasSlug = 'john-jonah-jameson-earth-616';
    } else if (
      normalized.includes('sue-storm') ||
      normalized.includes('invisible-girl') ||
      normalized.includes('invisible-woman') ||
      normalized === 'susan-storm'
    ) {
      aliasSlug = 'susan-storm-earth-616';
    } else if (normalized === 'daily-globe' || normalized === 'daily-globe-newspaper') {
      aliasSlug = 'daily-globe-building';
    } else if (normalized === 'baxter-building') {
      aliasSlug = 'baxter-building-earth-616';
    } else if (normalized === 'murray-hill') {
      aliasSlug = 'murray-hill-marvel';
    }
    const { data: aliasPage } = await createPublicServerClient()
      .from('ppcf_wiki_pages')
      .select('slug,display_title,universe,page_type,reality,creators,first_appearance,summary')
      .eq('slug', aliasSlug)
      .maybeSingle();
    page = aliasPage;
  }

  const local = getLoreEntityBySlug(slug);
  const type = (page?.page_type || '').toLowerCase();
  let entity: LoreEntitySummary | null = page
    ? {
        slug: page.slug,
        title: page.display_title,
        universe: page.universe,
        type:
          type === 'vehicle'
            ? 'item'
            : ['item', 'location', 'team', 'creator'].includes(type)
            ? (type as LoreEntitySummary['type'])
            : 'character',
        reality: page.reality,
        creators: page.creators,
        first_appearance: page.first_appearance,
        summary: page.summary || '',
      }
    : local && (!universe || local.universe === universe)
    ? local
    : null;

  const cleanCreatorKey = slug.replace(/^creator-/, '');
  const creatorDict = creatorSeed as unknown as Record<
    string,
    { name: string; bio: string; description?: string; birthCity?: string; imageUrl?: string | null }
  >;
  const seed = creatorDict[cleanCreatorKey] || creatorDict[slug];
  if (!entity && (!universe || universe === 'CANONICAL') && seed) {
    entity = {
      slug,
      title: seed.name,
      universe: 'CANONICAL',
      type: 'creator',
      summary: seed.bio,
      creators: seed.description,
      reality: seed.birthCity,
      imageUrl: seed.imageUrl || null,
    };
  }

  // Load granular traits from Kaggle / SuperHero API enrichment
  const traits = getEnrichedCharacterBySlug(slug) || (entity ? getEnrichedCharacterBySlug(entity.slug) : null);

  if (!entity && traits) {
    entity = {
      slug: traits.slug,
      title: traits.name,
      universe: 'MARVEL',
      type: 'character',
      summary: `${traits.name} (${traits.alter_ego || traits.name}) is a canonical ${traits.role_type || 'character'} in comic book lore.`,
      imageUrl: traits.imageUrl,
      first_appearance: undefined,
    };
  }

  if (!entity) notFound();

  const title = wikiPlainText(entity.title);
  const body = wikiPlainText(entity.summary);
  const universeLabel =
    entity.universe === 'CANONICAL' ? 'Panel Profits' : entity.universe.replace(/_/g, ' ');

  const portraitUrl = entity.imageUrl || traits?.imageUrl || null;

  const facts = [
    ['Entry type', entity.type],
    ['Classification', traits?.role_type ? traits.role_type.toUpperCase() : undefined],
    ['Universe', universeLabel],
    ['Continuity', entity.reality],
    ['Alter ego', traits?.alter_ego && traits.alter_ego !== title ? traits.alter_ego : undefined],
    ['Species / Lifeform', traits?.race],
    ['Gender', traits?.gender],
    ['Height', traits?.height],
    ['Weight', traits?.weight],
    ['Eye color', traits?.eye_color],
    ['Hair color', traits?.hair_color],
    ['Base of operations', traits?.base_of_operations],
    ['Place of birth', traits?.place_of_birth],
    ['Ability score', traits?.ability_score ? `${traits.ability_score} / 600` : undefined],
    ['First appearance', entity.first_appearance],
    ['Creators', entity.creators],
    ['Alignment', entity.alignment],
  ].filter(([, v]) => v?.trim());

  const categories: Record<string, string> = {
    MARVEL: 'marvel',
    DC: 'dc',
    STAR_WARS: 'star-wars',
    IMAGE: 'image',
    IMAGECOMICS: 'image',
    DARK_HORSE: 'dark-horse',
    DARKHORSE: 'dark-horse',
    SPAWN: 'spawn',
    TRANSFORMERS: 'transformers',
  };

  const related = [
    ...(entity.super_teams || []),
    ...(traits?.teams || []),
    ...(entity.allies || []),
    ...(entity.rogues_gallery || []),
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 16);

  const statsList = traits?.abilities
    ? [
        { label: 'Intelligence', value: traits.abilities.intelligence },
        { label: 'Strength', value: traits.abilities.strength },
        { label: 'Speed', value: traits.abilities.speed },
        { label: 'Durability', value: traits.abilities.durability },
        { label: 'Power', value: traits.abilities.power },
        { label: 'Combat', value: traits.abilities.combat },
      ]
    : [];

  return (
    <main className="wiki-page">
      <nav className="wiki-breadcrumb" aria-label="Breadcrumb">
        <Link href="/wiki">Wiki</Link>
        <span>/</span>
        {categories[entity.universe] && (
          <>
            <Link href={`/wiki/category/${categories[entity.universe]}`}>{universeLabel}</Link>
            <span>/</span>
          </>
        )}
        <span>{entity.type}</span>
      </nav>

      <div className="flex items-center gap-3 mt-3">
        <h1>{title}</h1>
        {traits?.role_type && (
          <span
            className={`inline-block px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${
              traits.role_type === 'superhero'
                ? 'bg-blue-950/60 text-blue-300 border-blue-700/60'
                : traits.role_type === 'supervillain'
                ? 'bg-red-950/60 text-red-300 border-red-700/60'
                : traits.role_type === 'sidekick'
                ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                : traits.role_type === 'henchman'
                ? 'bg-orange-950/60 text-orange-300 border-orange-700/60'
                : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
            }`}
          >
            {traits.role_type}
          </span>
        )}
      </div>

      <p className="wiki-lead">
        {universeLabel} · {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)} article
        {traits?.alter_ego && traits.alter_ego !== title ? ` · Alter Ego: ${traits.alter_ego}` : ''}
        {traits?.race ? ` · Species: ${traits.race}` : ''}
      </p>

      <div className="wiki-rule" />

      <div className="wiki-article-grid">
        <article className="wiki-prose">
          <section id="overview">
            <h2>Overview</h2>
            {body ? (
              body.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>The stored record identifies this {entity.type}, but does not contain a narrative biography.</p>
            )}
          </section>

          {/* Power Matrix & Combat Stats */}
          {statsList.length > 0 && (
            <section id="power-matrix">
              <h2>Power Stats & Combat Matrix</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                {statsList.map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded border border-slate-800 bg-[#101720]/80 space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">{stat.label}</span>
                      <span className="font-mono text-cyan-400 font-bold">{stat.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          stat.value >= 80
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500'
                            : stat.value >= 50
                            ? 'bg-cyan-500'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${Math.min(stat.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {traits?.ability_score && (
                <p className="text-xs text-slate-400 font-mono">
                  Cumulative Ability Score: <strong className="text-slate-200">{traits.ability_score}</strong> / 600 (Kaggle/SuperHero API Benchmark)
                </p>
              )}
            </section>
          )}

          {/* Granular Superpowers & Abilities Breakdown */}
          {traits?.superpowers && traits.superpowers.length > 0 && (
            <section id="superpowers">
              <h2>Granular Superpowers & Abilities ({traits.superpowers.length})</h2>
              <p className="text-xs text-slate-400 mb-3">
                Granular ability breakdown cross-referenced with Kaggle 167-vector superpower matrix:
              </p>
              <div className="flex flex-wrap gap-2 my-3">
                {traits.superpowers.map((power) => (
                  <span
                    key={power}
                    className="px-2.5 py-1 text-xs rounded border border-purple-900/60 bg-purple-950/40 text-purple-200"
                  >
                    ⚡ {power}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Teams and Affiliations */}
          {traits?.teams && traits.teams.length > 0 && (
            <section id="teams">
              <h2>Teams & Group Affiliations</h2>
              <div className="wiki-pills">
                {traits.teams.map((team) => (
                  <Link key={team} href={`/wiki?q=${encodeURIComponent(team)}`}>
                    🛡️ {team}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Relatives and Strategic Connections */}
          {traits?.relatives && (
            <section id="relatives">
              <h2>Alliances, Sidekicks & Connections</h2>
              <div className="p-3.5 rounded border border-slate-800 bg-[#101720]/60 text-xs text-slate-300 leading-relaxed">
                {traits.relatives}
              </div>
            </section>
          )}

          {/* Head-to-Head Versus Matchup Simulation */}
          <section id="versus-clashes" className="mt-8 pt-6 border-t border-slate-800">
            <div className="mb-2">
              <h2 className="text-xl font-bold tracking-wide uppercase text-white font-sans flex items-center gap-2">
                <span className="p-1 rounded bg-amber-500/20 text-amber-300 text-sm">⚔️</span>
                Canon Versus Matchup Arena
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Simulate authentic head-to-head clashes featuring {title} against rival superheroes, supervillains, superpowers, or historic bastions.
              </p>
            </div>
            <VersusMatchupWidget initialContenderAName={title} />
          </section>

          {entity.first_appearance && (
            <section id="publication">
              <h2>Publication history</h2>
              <p>{entity.first_appearance}</p>
              <Link href={`/wiki/issues?q=${encodeURIComponent(entity.first_appearance)}`}>
                Find the publication record ↗
              </Link>
            </section>
          )}

          {entity.landmark_debuts?.length ? (
            <section id="issues">
              <h2>Related comic issues</h2>
              {entity.landmark_debuts.map((issue, i) => (
                <div key={i} className="wiki-evidence">
                  <strong className="text-slate-100">{issue.title}</strong>
                  <p>{issue.significance}</p>
                  <Link href={`/wiki/issues?q=${encodeURIComponent(issue.title)}`}>Research this issue ↗</Link>
                </div>
              ))}
            </section>
          ) : null}

          {related.length > 0 && (
            <section id="connections">
              <h2>Connections</h2>
              <div className="wiki-pills">
                {related.map((name) => (
                  <Link key={name} href={`/wiki?q=${encodeURIComponent(name)}`}>
                    {name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section id="research">
            <h2>Research context</h2>
            <p>
              Story significance and character appearances provide collecting context. An issue’s edition,
              condition, graded population and completed-sale evidence determine which market comparisons apply.
            </p>
            <div className="wiki-pills">
              <Link href={`/wiki?q=${encodeURIComponent(title)}`}>Search related records</Link>
              <Link href="/wiki/terms">Financial dictionary</Link>
              <Link href="/sniper">Practice in Sniper ↗</Link>
            </div>
          </section>

          <section id="record">
            <h2>About this record</h2>
            <p>
              {page
                ? 'This article reads the stored Panel Profits Wiki record.'
                : 'This article uses the stored Panel Profits reference collection.'}{' '}
              Source facts and editorial analysis are separate; missing biographical facts are not inferred.
            </p>
          </section>
        </article>

        <aside>
          <div className="wiki-infobox">
            <h2>{title}</h2>
            {portraitUrl && (
              <div className="p-3 bg-[#0d131a] border-b border-slate-800 text-center">
                <img
                  className="wiki-cover rounded shadow-lg max-h-[300px] mx-auto object-cover"
                  src={portraitUrl}
                  alt={title}
                />
              </div>
            )}
            <dl>
              {facts.map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{wikiPlainText(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <nav className="wiki-toc" aria-label="Article contents">
            <h2>On this page</h2>
            <a href="#overview">Overview</a>
            {statsList.length > 0 && <a href="#power-matrix">Power Matrix</a>}
            {traits?.superpowers && traits.superpowers.length > 0 && <a href="#superpowers">Superpowers ({traits.superpowers.length})</a>}
            {traits?.teams && traits.teams.length > 0 && <a href="#teams">Teams</a>}
            {traits?.relatives && <a href="#relatives">Connections</a>}
            <a href="#versus-clashes">Versus Matchups</a>
            {entity.first_appearance && <a href="#publication">Publication history</a>}
            {entity.landmark_debuts?.length ? <a href="#issues">Related issues</a> : null}
            {related.length > 0 && <a href="#connections">Connections</a>}
            <a href="#research">Research context</a>
            <a href="#record">About this record</a>
          </nav>
        </aside>
      </div>
    </main>
  );
}

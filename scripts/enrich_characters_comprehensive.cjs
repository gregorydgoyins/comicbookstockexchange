const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { Client } = require('pg');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanStr(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (s === '-' || s === 'null' || s === 'None' || s === '' || s === 'No alter egos found.') return null;
  return s;
}

function normalizeKey(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generateDeterministicUUID(seed) {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// Canonical sidekicks
const KNOWN_SIDEKICKS = new Set([
  'robin', 'dick grayson', 'tim drake', 'damian wayne', 'jason todd',
  'bucky', 'bucky barnes', 'winter soldier',
  'speedy', 'roy harper', 'arsenal',
  'kid flash', 'wally west', 'bart allen',
  'aqualad', 'garth', 'kaldur\'ahm',
  'wonder girl', 'donna troy', 'cassie sandsmark',
  'rick jones', 'a-bomb',
  'wong',
  'jimmy olsen',
  'toro',
  'foggy nelson',
  'kato',
  'hit-girl',
  'sandy hawkins',
  'snapper carr',
  'jubilee', 'jubilation lee',
  'stephenie brown', 'spoiler'
]);

// Canonical henchmen & minions
const KNOWN_HENCHMEN = new Set([
  'bob, agent of hydra', 'bob agent of hydra',
  'mercy graves',
  'crossbones',
  'toad', 'mortimer toynbee',
  'pyro', 'st. john allerdyce',
  'avalanche', 'dominikos petrakis',
  'blob', 'fred j. dukes',
  'ebony maw', 'corvus glaive', 'proxima midnight', 'cull obsidian',
  'shocker', 'herman schultz',
  'rhino', 'aleksei sytsevich',
  'caliban',
  'jack o\'lantern',
  'bullseye',
  'boomerang'
]);

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Vizjazz7gdg@db.ghjlzrmuugquumqwlqgl.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('⚡ Connected to Supabase PostgreSQL database.');

  // 1. Ensure columns exist on characters
  console.log('📦 Verifying schema columns on public.characters...');
  await client.query(`
    ALTER TABLE public.characters 
    ADD COLUMN IF NOT EXISTS race TEXT,
    ADD COLUMN IF NOT EXISTS height TEXT,
    ADD COLUMN IF NOT EXISTS weight TEXT,
    ADD COLUMN IF NOT EXISTS eye_color TEXT,
    ADD COLUMN IF NOT EXISTS hair_color TEXT,
    ADD COLUMN IF NOT EXISTS alter_ego TEXT,
    ADD COLUMN IF NOT EXISTS super_persona TEXT,
    ADD COLUMN IF NOT EXISTS role_type TEXT,
    ADD COLUMN IF NOT EXISTS base_of_operations TEXT,
    ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
    ADD COLUMN IF NOT EXISTS relatives TEXT,
    ADD COLUMN IF NOT EXISTS teams TEXT[],
    ADD COLUMN IF NOT EXISTS superpowers TEXT[],
    ADD COLUMN IF NOT EXISTS images JSONB,
    ADD COLUMN IF NOT EXISTS gadgets_and_weapons TEXT[];
  `);

  // 2. Load Powers mapping from Supabase
  const powersRes = await client.query('SELECT id, name, category FROM powers;');
  const powerMap = new Map();
  for (const p of powersRes.rows) {
    powerMap.set(p.name.toLowerCase().trim(), p.id);
    powerMap.set(normalizeKey(p.name), p.id);
  }
  console.log(`Loaded ${powersRes.rows.length} powers from public.powers.`);

  // 3. Load SuperHero API JSON
  const apiPath = path.join(__dirname, '../data/superhero-api.json');
  let apiHeroes = [];
  if (fs.existsSync(apiPath)) {
    apiHeroes = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
    console.log(`Loaded ${apiHeroes.length} characters from superhero-api.json.`);
  }

  const heroDataMap = new Map();

  for (const h of apiHeroes) {
    const rawName = h.name.trim();
    const cleanK = normalizeKey(rawName);
    
    const heightStr = h.appearance?.height ? h.appearance.height.filter(x => x && x !== '-').join(' // ') : null;
    const weightStr = h.appearance?.weight ? h.appearance.weight.filter(x => x && x !== '-').join(' // ') : null;
    
    let alterEgo = cleanStr(h.biography?.fullName);
    const superPersona = rawName;
    if (!alterEgo || alterEgo.toLowerCase() === rawName.toLowerCase()) {
      alterEgo = cleanStr(h.biography?.alterEgos);
    }
    if (!alterEgo || alterEgo.toLowerCase() === rawName.toLowerCase()) {
      alterEgo = rawName;
    }

    const rawAlign = (h.biography?.alignment || 'neutral').toLowerCase().trim();
    let alignment = 'neutral';
    if (rawAlign === 'good') alignment = 'hero';
    else if (rawAlign === 'bad') alignment = 'villain';
    else if (rawAlign === 'neutral') alignment = 'neutral';

    let roleType = 'superhero';
    const lowerName = rawName.toLowerCase();
    if (KNOWN_SIDEKICKS.has(lowerName)) {
      roleType = 'sidekick';
    } else if (KNOWN_HENCHMEN.has(lowerName)) {
      roleType = 'henchman';
    } else if (alignment === 'villain') {
      roleType = 'supervillain';
    } else if (alignment === 'neutral') {
      roleType = 'anti-hero';
    }

    let teams = [];
    if (h.connections?.groupAffiliation && h.connections.groupAffiliation !== '-') {
      teams = h.connections.groupAffiliation.split(/;|,/).map(t => t.trim()).filter(t => t.length > 1 && !t.startsWith('Formerly:'));
    }

    heroDataMap.set(cleanK, {
      name: rawName,
      slug: h.slug?.replace(/^[0-9]+-/, '') || rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      abilities: h.powerstats,
      ability_score: Object.values(h.powerstats || {}).reduce((a, b) => a + (Number(b) || 0), 0),
      alignment,
      role_type: roleType,
      alter_ego: alterEgo,
      super_persona: superPersona,
      gender: cleanStr(h.appearance?.gender),
      race: cleanStr(h.appearance?.race),
      height: cleanStr(heightStr),
      weight: cleanStr(weightStr),
      eye_color: cleanStr(h.appearance?.eyeColor),
      hair_color: cleanStr(h.appearance?.hairColor),
      place_of_birth: cleanStr(h.biography?.placeOfBirth),
      base_of_operations: cleanStr(h.work?.base),
      relatives: cleanStr(h.connections?.relatives),
      teams: teams.slice(0, 10),
      image_url: h.images?.lg || h.images?.md || h.images?.sm || null,
      images: h.images || null,
      publisher: cleanStr(h.biography?.publisher) || 'Marvel Comics',
      first_appearance: cleanStr(h.biography?.firstAppearance),
      source: 'superhero-api'
    });
  }

  // 4. Ingest Kaggle SuperheroDataset.csv
  const kaggleDatasetPath = '/Users/macuser/Projects/panel-profits/data/kaggle/SuperheroDataset.csv';
  if (fs.existsSync(kaggleDatasetPath)) {
    console.log(`Processing Kaggle SuperheroDataset.csv...`);
    const stream = fs.createReadStream(kaggleDatasetPath);
    const rl = readline.createInterface({ input: stream });

    let isHeader = true;
    let kaggleCount = 0;
    for await (const line of rl) {
      if (isHeader) { isHeader = false; continue; }
      if (!line.trim()) continue;
      const cols = parseCSVLine(line);
      const name = cols[2];
      if (!name) continue;

      const cleanK = normalizeKey(name);
      const existing = heroDataMap.get(cleanK) || {};

      const intelligence = parseInt(cols[4], 10) || 0;
      const strength = parseInt(cols[5], 10) || 0;
      const speed = parseInt(cols[6], 10) || 0;
      const durability = parseInt(cols[7], 10) || 0;
      const power = parseInt(cols[8], 10) || 0;
      const combat = parseInt(cols[9], 10) || 0;
      const totalPower = parseInt(cols[28], 10) || (intelligence + strength + speed + durability + power + combat);

      const fullName = cleanStr(cols[10]);
      const alterEgos = cleanStr(cols[11]);
      const placeOfBirth = cleanStr(cols[13]);
      const firstAppearance = cleanStr(cols[14]);
      const publisher = cleanStr(cols[15]);
      const rawAlign = (cols[16] || '').toLowerCase().trim();
      let alignment = existing.alignment || 'neutral';
      if (rawAlign === 'good') alignment = 'hero';
      else if (rawAlign === 'bad') alignment = 'villain';

      const gender = cleanStr(cols[17]);
      const race = cleanStr(cols[18]);
      const height = cleanStr(cols[19]);
      const weight = cleanStr(cols[20]);
      const eyeColor = cleanStr(cols[21]);
      const hairColor = cleanStr(cols[22]);
      const occupation = cleanStr(cols[23]);
      const base = cleanStr(cols[24]);
      const teamAffiliation = cleanStr(cols[25]);
      const relatives = cleanStr(cols[26]);

      let roleType = existing.role_type;
      const lowerName = name.toLowerCase();
      if (KNOWN_SIDEKICKS.has(lowerName)) {
        roleType = 'sidekick';
      } else if (KNOWN_HENCHMEN.has(lowerName) || (occupation && occupation.toLowerCase().includes('henchman'))) {
        roleType = 'henchman';
      } else if (!roleType) {
        if (alignment === 'villain') roleType = 'supervillain';
        else if (alignment === 'hero') roleType = 'superhero';
        else roleType = 'anti-hero';
      }

      let teams = existing.teams || [];
      if (teamAffiliation) {
        const extraTeams = teamAffiliation.split(/;|,/).map(t => t.trim()).filter(t => t.length > 1 && !t.startsWith('Formerly:'));
        teams = Array.from(new Set([...teams, ...extraTeams])).slice(0, 10);
      }

      heroDataMap.set(cleanK, {
        name: existing.name || name,
        slug: existing.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        abilities: existing.abilities || { intelligence, strength, speed, durability, power, combat },
        ability_score: existing.ability_score || totalPower,
        alignment: alignment,
        role_type: roleType,
        alter_ego: existing.alter_ego || fullName || alterEgos || name,
        super_persona: existing.super_persona || name,
        gender: existing.gender || gender,
        race: existing.race || race,
        height: existing.height || height,
        weight: existing.weight || weight,
        eye_color: existing.eye_color || eyeColor,
        hair_color: existing.hair_color || hairColor,
        place_of_birth: existing.place_of_birth || placeOfBirth,
        base_of_operations: existing.base_of_operations || base,
        relatives: existing.relatives || relatives,
        teams: teams,
        image_url: existing.image_url || null,
        images: existing.images || null,
        publisher: existing.publisher || publisher || 'Marvel Comics',
        first_appearance: existing.first_appearance || firstAppearance,
        source: existing.source || 'kaggle-superhero-dataset'
      });
      kaggleCount++;
    }
    console.log(`Merged ${kaggleCount} characters from Kaggle SuperheroDataset.csv.`);
  }

  // 5. Ingest Granular Superpowers from super_hero_powers.csv
  const powersCsvPath = '/Users/macuser/Projects/panel-profits/data/kaggle/super_hero_powers.csv';
  const characterSuperpowersMap = new Map();

  if (fs.existsSync(powersCsvPath)) {
    console.log(`Parsing 167 Granular Superpowers from super_hero_powers.csv...`);
    const stream = fs.createReadStream(powersCsvPath);
    const rl = readline.createInterface({ input: stream });

    let headers = [];
    let powerRows = 0;
    for await (const line of rl) {
      if (powerRows === 0) {
        headers = line.split(',').map(h => h.trim());
        powerRows++;
        continue;
      }
      if (!line.trim()) continue;
      const cols = line.split(',').map(c => c.trim());
      const heroName = cols[0];
      if (!heroName) continue;

      const activePowers = [];
      for (let i = 1; i < cols.length; i++) {
        const val = cols[i];
        if (val === 'True' || val === 'true' || val === '1') {
          const powerName = headers[i];
          if (powerName) {
            activePowers.push(powerName);
          }
        }
      }

      characterSuperpowersMap.set(normalizeKey(heroName), activePowers);
      powerRows++;
    }
    console.log(`Parsed granular superpowers for ${characterSuperpowersMap.size} characters.`);
  }

  // 6. Enrich Existing public.characters in Supabase
  console.log('⚡ Fetching all characters from public.characters for database enrichment...');
  const dbCharsRes = await client.query('SELECT id, name, slug, alignment, race, image_url, abilities, superpowers FROM characters;');
  console.log(`Found ${dbCharsRes.rows.length} existing characters in Supabase.`);

  const updateCandidates = [];
  const charPowerPairs = [];

  for (const c of dbCharsRes.rows) {
    const cleanK = normalizeKey(c.name);
    const cleanSlug = normalizeKey(c.slug || '');
    
    const data = heroDataMap.get(cleanK) || heroDataMap.get(cleanSlug);
    const powers = characterSuperpowersMap.get(cleanK) || characterSuperpowersMap.get(cleanSlug) || [];

    if (data || powers.length > 0) {
      const race = data?.race || null;
      const height = data?.height || null;
      const weight = data?.weight || null;
      const eyeColor = data?.eye_color || null;
      const hairColor = data?.hair_color || null;
      const alterEgo = data?.alter_ego || null;
      const superPersona = data?.super_persona || c.name;
      const roleType = data?.role_type || (c.alignment === 'villain' ? 'supervillain' : c.alignment === 'hero' ? 'superhero' : 'anti-hero');
      const baseOfOps = data?.base_of_operations || null;
      const placeOfBirth = data?.place_of_birth || null;
      const relatives = data?.relatives || null;
      const teams = data?.teams && data.teams.length > 0 ? data.teams : null;
      const abilities = data?.abilities || c.abilities || null;
      const abilityScore = data?.ability_score || (abilities ? Object.values(abilities).reduce((a, b) => a + (Number(b) || 0), 0) : null);
      const imageUrl = c.image_url || data?.image_url || null;
      const images = data?.images ? JSON.stringify(data.images) : null;
      const superpowers = powers.length > 0 ? powers : null;

      updateCandidates.push({
        id: c.id,
        race, height, weight, eyeColor, hairColor, alterEgo, superPersona, roleType,
        baseOfOps, placeOfBirth, relatives, teams, abilities, abilityScore,
        imageUrl, images, superpowers
      });

      if (powers.length > 0) {
        for (const pName of powers) {
          const powerId = powerMap.get(pName.toLowerCase().trim()) || powerMap.get(normalizeKey(pName));
          if (powerId) {
            charPowerPairs.push({ characterId: c.id, powerId });
          }
        }
      }
    }
  }

  console.log(`Enriching ${updateCandidates.length} matched characters in batches...`);
  const BATCH_SIZE = 50;
  for (let i = 0; i < updateCandidates.length; i += BATCH_SIZE) {
    const chunk = updateCandidates.slice(i, i + BATCH_SIZE);
    await client.query('BEGIN');
    for (const item of chunk) {
      await client.query(`
        UPDATE public.characters
        SET 
          race = COALESCE(race, $1),
          height = COALESCE(height, $2),
          weight = COALESCE(weight, $3),
          eye_color = COALESCE(eye_color, $4),
          hair_color = COALESCE(hair_color, $5),
          alter_ego = COALESCE(alter_ego, $6),
          super_persona = COALESCE(super_persona, $7),
          role_type = COALESCE(role_type, $8),
          base_of_operations = COALESCE(base_of_operations, $9),
          place_of_birth = COALESCE(place_of_birth, $10),
          relatives = COALESCE(relatives, $11),
          teams = COALESCE(teams, $12),
          abilities = COALESCE(abilities, $13),
          ability_score = COALESCE(ability_score, $14),
          image_url = COALESCE(image_url, $15),
          images = COALESCE(images, $16::jsonb),
          superpowers = COALESCE(superpowers, $17),
          updated_at = NOW()
        WHERE id = $18;
      `, [
        item.race, item.height, item.weight, item.eyeColor, item.hairColor, item.alterEgo, item.superPersona, item.roleType,
        item.baseOfOps, item.placeOfBirth, item.relatives, item.teams, item.abilities, item.abilityScore,
        item.imageUrl, item.images, item.superpowers, item.id
      ]);
    }
    await client.query('COMMIT');
    process.stdout.write(`\rProgress: ${Math.min(i + BATCH_SIZE, updateCandidates.length)} / ${updateCandidates.length}`);
  }
  console.log('\n✅ Characters enriched in database.');

  // 7. Batch Insert Character Powers
  console.log(`\n⚡ Batch inserting ${charPowerPairs.length} character-power mappings...`);
  const CP_BATCH_SIZE = 250;
  let cpInserted = 0;
  for (let i = 0; i < charPowerPairs.length; i += CP_BATCH_SIZE) {
    const chunk = charPowerPairs.slice(i, i + CP_BATCH_SIZE);
    const valueClauses = [];
    const params = [];
    let pIdx = 1;

    for (const item of chunk) {
      const cpId = generateDeterministicUUID(`cp_${item.characterId}_${item.powerId}`);
      valueClauses.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, 1, NOW())`);
      params.push(cpId, item.characterId, item.powerId);
      pIdx += 3;
    }

    if (valueClauses.length > 0) {
      await client.query(`
        INSERT INTO public.character_powers (id, character_id, power_id, power_level, created_at)
        VALUES ${valueClauses.join(', ')}
        ON CONFLICT (character_id, power_id) DO NOTHING;
      `, params);
      cpInserted += chunk.length;
      process.stdout.write(`\rProgress: ${Math.min(cpInserted, charPowerPairs.length)} / ${charPowerPairs.length}`);
    }
  }
  console.log('\n✅ Character-powers mapping complete.');

  // 8. Granular Canonical Sidekicks, Henchmen & Nemeses Relationships
  console.log('\n🔗 Populating Granular Sidekick, Henchman, and Nemesis Relationships...');
  const CANONICAL_RELATIONSHIPS = [
    // Sidekicks
    { char: 'Robin', related: 'Batman', type: 'sidekick', strength: 0.95 },
    { char: 'Bucky', related: 'Captain America', type: 'sidekick', strength: 0.95 },
    { char: 'Winter Soldier', related: 'Captain America', type: 'sidekick', strength: 0.85 },
    { char: 'Rick Jones', related: 'Hulk', type: 'sidekick', strength: 0.90 },
    { char: 'Wong', related: 'Doctor Strange', type: 'sidekick', strength: 0.90 },
    { char: 'Speedy', related: 'Green Arrow', type: 'sidekick', strength: 0.90 },
    { char: 'Kid Flash', related: 'Flash', type: 'sidekick', strength: 0.90 },
    { char: 'Aqualad', related: 'Aquaman', type: 'sidekick', strength: 0.85 },
    { char: 'Jimmy Olsen', related: 'Superman', type: 'sidekick', strength: 0.90 },
    { char: 'War Machine', related: 'Iron Man', type: 'sidekick', strength: 0.85 },
    { char: 'Falcon', related: 'Captain America', type: 'sidekick', strength: 0.90 },
    { char: 'Toro', related: 'Human Torch', type: 'sidekick', strength: 0.85 },

    // Henchmen & Minions
    { char: 'Mercy Graves', related: 'Lex Luthor', type: 'henchman', strength: 0.90 },
    { char: 'Bob, Agent of Hydra', related: 'Deadpool', type: 'henchman', strength: 0.85 },
    { char: 'Crossbones', related: 'Red Skull', type: 'henchman', strength: 0.90 },
    { char: 'Toad', related: 'Magneto', type: 'henchman', strength: 0.85 },
    { char: 'Pyro', related: 'Magneto', type: 'henchman', strength: 0.80 },
    { char: 'Blob', related: 'Magneto', type: 'henchman', strength: 0.80 },
    { char: 'Corvus Glaive', related: 'Thanos', type: 'henchman', strength: 0.95 },
    { char: 'Proxima Midnight', related: 'Thanos', type: 'henchman', strength: 0.95 },
    { char: 'Ebony Maw', related: 'Thanos', type: 'henchman', strength: 0.95 },
    { char: 'Cull Obsidian', related: 'Thanos', type: 'henchman', strength: 0.90 },

    // Nemeses & Arch-Enemies
    { char: 'Joker', related: 'Batman', type: 'nemesis', strength: 1.0 },
    { char: 'Green Goblin', related: 'Spider-Man', type: 'nemesis', strength: 1.0 },
    { char: 'Lex Luthor', related: 'Superman', type: 'nemesis', strength: 1.0 },
    { char: 'Magneto', related: 'Professor X', type: 'nemesis', strength: 0.95 },
    { char: 'Red Skull', related: 'Captain America', type: 'nemesis', strength: 1.0 },
    { char: 'Doctor Doom', related: 'Mister Fantastic', type: 'nemesis', strength: 1.0 },
    { char: 'Venom', related: 'Spider-Man', type: 'nemesis', strength: 0.95 },
    { char: 'Doctor Octopus', related: 'Spider-Man', type: 'nemesis', strength: 0.95 },
    { char: 'Thanos', related: 'Adam Warlock', type: 'nemesis', strength: 0.95 },
    { char: 'Kingpin', related: 'Daredevil', type: 'nemesis', strength: 0.95 },
    { char: 'Sinestro', related: 'Green Lantern', type: 'nemesis', strength: 0.95 },
    { char: 'Reverse Flash', related: 'Flash', type: 'nemesis', strength: 1.0 },
    { char: 'Sabretooth', related: 'Wolverine', type: 'nemesis', strength: 1.0 }
  ];

  let relInserted = 0;
  for (const rel of CANONICAL_RELATIONSHIPS) {
    const c1 = await client.query('SELECT id FROM characters WHERE LOWER(name) = LOWER($1) OR slug ILIKE $2 LIMIT 1;', [rel.char, `%${rel.char.toLowerCase()}%`]);
    const c2 = await client.query('SELECT id FROM characters WHERE LOWER(name) = LOWER($1) OR slug ILIKE $2 LIMIT 1;', [rel.related, `%${rel.related.toLowerCase()}%`]);

    if (c1.rows.length > 0 && c2.rows.length > 0) {
      const id1 = c1.rows[0].id;
      const id2 = c2.rows[0].id;
      const relId = generateDeterministicUUID(`rel_${id1}_${id2}_${rel.type}`);

      await client.query(`
        INSERT INTO public.character_relationships (
          id, character_id, related_character_id, relationship_type, strength, co_appearances, created_at
        ) VALUES ($1, $2, $3, $4, $5, 25, NOW())
        ON CONFLICT (character_id, related_character_id) DO UPDATE SET
          relationship_type = EXCLUDED.relationship_type,
          strength = EXCLUDED.strength;
      `, [relId, id1, id2, rel.type, rel.strength]);

      relInserted++;
    }
  }
  console.log(`✅ Granular Relationships Ingested: ${relInserted}`);

  // 9. Locations Enrichment
  console.log('\n📍 Populating Canonical Locations & Bases...');
  const CANONICAL_LOCATIONS = [
    { name: 'Sanctum Sanctorum', type: 'base', universe: 'Marvel-616', desc: 'Mystical residence and headquarters of Doctor Strange in Greenwich Village, NYC', score: 0.95 },
    { name: 'Batcave', type: 'base', universe: 'DC-Prime', desc: 'Subterranean headquarters of Batman beneath Wayne Manor in Gotham City', score: 1.0 },
    { name: 'Fortress of Solitude', type: 'base', universe: 'DC-Prime', desc: 'Kryptonian crystalline citadel of Superman in the Arctic', score: 1.0 },
    { name: 'Baxter Building', type: 'base', universe: 'Marvel-616', desc: '35-story Manhattan headquarters of the Fantastic Four', score: 0.95 },
    { name: 'Avengers Tower', type: 'base', universe: 'Marvel-616', desc: 'High-tech Manhattan skyscraper and primary headquarters of the Avengers', score: 0.95 },
    { name: 'X-Mansion', type: 'base', universe: 'Marvel-616', desc: 'Xavier Institute for Higher Learning and X-Men headquarters in Salem Center, NY', score: 0.95 },
    { name: 'Latveria', type: 'nation', universe: 'Marvel-616', desc: 'Sovereign Eastern European nation ruled by Doctor Doom', score: 0.90 },
    { name: 'Wakanda', type: 'nation', universe: 'Marvel-616', desc: 'Vibranium-rich technologically advanced African nation ruled by Black Panther', score: 0.95 },
    { name: 'Krakoa', type: 'nation', universe: 'Marvel-616', desc: 'Sentient mutant island nation and sanctuary for mutantkind', score: 0.90 },
    { name: 'The Daily Bugle', type: 'workplace', universe: 'Marvel-616', desc: 'New York tabloid newspaper building where Peter Parker works as a freelance photographer', score: 0.85 },
    { name: 'Daily Planet', type: 'workplace', universe: 'DC-Prime', desc: 'Major metropolitan newspaper in Metropolis where Clark Kent and Lois Lane work', score: 0.90 },
    { name: 'Arkham Asylum', type: 'prison', universe: 'DC-Prime', desc: 'Psychiatric hospital housing Gotham City\'s criminally insane supervillains', score: 0.95 },
    { name: 'The Raft', type: 'prison', universe: 'Marvel-616', desc: 'Maximum-security island prison for superhuman criminals off Ryker\'s Island, NYC', score: 0.90 },
    { name: 'Asgard', type: 'realm', universe: 'Marvel-616', desc: 'Extradimensional celestial realm and home of Thor and the Norse gods', score: 0.95 },
    { name: 'Oa', type: 'realm', universe: 'DC-Prime', desc: 'Planetary headquarters of the Guardians of the Universe and Green Lantern Corps', score: 0.95 },
    { name: 'Atlantis', type: 'kingdom', universe: 'Marvel-616', desc: 'Ancient undersea kingdom ruled by Namor the Sub-Mariner', score: 0.90 },
    { name: 'Hell\'s Kitchen', type: 'neighborhood', universe: 'Marvel-616', desc: 'Manhattan neighborhood protected by Daredevil', score: 0.85 }
  ];

  let locInserted = 0;
  for (const loc of CANONICAL_LOCATIONS) {
    const locId = generateDeterministicUUID(`loc_${loc.name}`);
    await client.query(`
      INSERT INTO public.locations (id, name, location_type, universe, description, significance_score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        location_type = EXCLUDED.location_type,
        description = EXCLUDED.description,
        significance_score = EXCLUDED.significance_score;
    `, [locId, loc.name, loc.type, loc.universe, loc.desc, loc.score]);
    locInserted++;
  }
  console.log(`✅ Canonical Locations Ingested: ${locInserted}`);

  // Final summary statistics
  const summaryRes = await client.query(`
    SELECT 
      count(*) as total_characters,
      count(image_url) as with_image,
      count(abilities) as with_abilities,
      count(race) as with_race,
      count(height) as with_height,
      count(weight) as with_weight,
      count(superpowers) as with_superpowers,
      count(role_type) as with_role_type
    FROM characters;
  `);

  console.log('\n📊 FINAL ENRICHMENT VERIFICATION STATS:');
  console.log(summaryRes.rows[0]);

  const powersTotal = await client.query('SELECT count(*) as total_char_powers FROM character_powers;');
  console.log(`📊 Total Character-Power mappings in character_powers: ${powersTotal.rows[0].total_char_powers}`);

  const rolesBreakdown = await client.query(`
    SELECT role_type, count(*) 
    FROM characters 
    WHERE role_type IS NOT NULL 
    GROUP BY role_type ORDER BY count DESC;
  `);
  console.log('\n🎭 Characters by Granular Role Type:');
  console.table(rolesBreakdown.rows);

  const racesBreakdown = await client.query(`
    SELECT race, count(*) 
    FROM characters 
    WHERE race IS NOT NULL 
    GROUP BY race ORDER BY count DESC LIMIT 10;
  `);
  console.log('\n🧬 Characters by Alien / Lifeform Race (Top 10):');
  console.table(racesBreakdown.rows);

  await client.end();
}

main().catch(err => {
  console.error('Fatal error during character enrichment:', err);
  process.exit(1);
});

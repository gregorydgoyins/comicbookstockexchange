import fs from 'fs';
import path from 'path';

export interface EnrichedCharacterTraits {
  name: string;
  slug: string;
  role_type?: string;
  alter_ego?: string;
  super_persona?: string;
  race?: string;
  gender?: string;
  height?: string;
  weight?: string;
  eye_color?: string;
  hair_color?: string;
  place_of_birth?: string;
  base_of_operations?: string;
  relatives?: string;
  teams?: string[];
  superpowers?: string[];
  abilities?: {
    intelligence: number;
    strength: number;
    speed: number;
    durability: number;
    power: number;
    combat: number;
  };
  ability_score?: number;
  imageUrl?: string | null;
}

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
  'jubilee', 'jubilation lee'
]);

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
  'rhino', 'aleksei sytsevich'
]);

let cachedCharMap: Map<string, EnrichedCharacterTraits> | null = null;

function normalizeKey(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function loadEnrichedCharacterIndex(): Map<string, EnrichedCharacterTraits> {
  if (cachedCharMap) return cachedCharMap;
  cachedCharMap = new Map();

  try {
    const jsonPath = path.join(process.cwd(), 'data/superhero-api.json');
    if (fs.existsSync(jsonPath)) {
      const heroes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Also try to load powers map from super_hero_powers.csv if available
      const powersMap = new Map<string, string[]>();
      const powersPath = '/Users/macuser/Projects/panel-profits/data/kaggle/super_hero_powers.csv';
      if (fs.existsSync(powersPath)) {
        const fileContent = fs.readFileSync(powersPath, 'utf8');
        const lines = fileContent.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(',').map((h) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',').map((c) => c.trim());
            const hName = cols[0];
            if (!hName) continue;
            const activePowers: string[] = [];
            for (let j = 1; j < cols.length; j++) {
              if (cols[j] === 'True' || cols[j] === 'true' || cols[j] === '1') {
                if (headers[j]) activePowers.push(headers[j]);
              }
            }
            powersMap.set(normalizeKey(hName), activePowers);
          }
        }
      }

      for (const h of heroes) {
        const rawName = h.name.trim();
        const cleanK = normalizeKey(rawName);
        const slugK = h.slug ? h.slug.replace(/^[0-9]+-/, '') : rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const heightStr = h.appearance?.height ? h.appearance.height.filter((x: string) => x && x !== '-').join(' // ') : undefined;
        const weightStr = h.appearance?.weight ? h.appearance.weight.filter((x: string) => x && x !== '-').join(' // ') : undefined;

        let alterEgo = h.biography?.fullName && h.biography.fullName !== '-' ? h.biography.fullName.trim() : undefined;
        if (!alterEgo || alterEgo.toLowerCase() === rawName.toLowerCase()) {
          alterEgo = h.biography?.alterEgos && h.biography.alterEgos !== 'No alter egos found.' ? h.biography.alterEgos.trim() : undefined;
        }

        const rawAlign = (h.biography?.alignment || 'neutral').toLowerCase().trim();
        let roleType = 'superhero';
        const lowerName = rawName.toLowerCase();
        if (KNOWN_SIDEKICKS.has(lowerName)) {
          roleType = 'sidekick';
        } else if (KNOWN_HENCHMEN.has(lowerName)) {
          roleType = 'henchman';
        } else if (rawAlign === 'bad') {
          roleType = 'supervillain';
        } else if (rawAlign === 'neutral') {
          roleType = 'anti-hero';
        }

        let teams: string[] = [];
        if (h.connections?.groupAffiliation && h.connections.groupAffiliation !== '-') {
          teams = h.connections.groupAffiliation
            .split(/;|,/)
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 1 && !t.startsWith('Formerly:'))
            .slice(0, 8);
        }

        const abilities = {
          intelligence: Number(h.powerstats?.intelligence) || 0,
          strength: Number(h.powerstats?.strength) || 0,
          speed: Number(h.powerstats?.speed) || 0,
          durability: Number(h.powerstats?.durability) || 0,
          power: Number(h.powerstats?.power) || 0,
          combat: Number(h.powerstats?.combat) || 0,
        };
        const abilityScore = Object.values(abilities).reduce((a, b) => a + b, 0);

        const powers = powersMap.get(cleanK) || powersMap.get(normalizeKey(slugK)) || [];

        const trait: EnrichedCharacterTraits = {
          name: rawName,
          slug: slugK,
          role_type: roleType,
          alter_ego: alterEgo || rawName,
          super_persona: rawName,
          race: h.appearance?.race && h.appearance.race !== '-' ? h.appearance.race : undefined,
          gender: h.appearance?.gender && h.appearance.gender !== '-' ? h.appearance.gender : undefined,
          height: heightStr,
          weight: weightStr,
          eye_color: h.appearance?.eyeColor && h.appearance.eyeColor !== '-' ? h.appearance.eyeColor : undefined,
          hair_color: h.appearance?.hairColor && h.appearance.hairColor !== '-' ? h.appearance.hairColor : undefined,
          place_of_birth: h.biography?.placeOfBirth && h.biography.placeOfBirth !== '-' ? h.biography.placeOfBirth : undefined,
          base_of_operations: h.work?.base && h.work.base !== '-' ? h.work.base : undefined,
          relatives: h.connections?.relatives && h.connections.relatives !== '-' ? h.connections.relatives : undefined,
          teams: teams.length > 0 ? teams : undefined,
          superpowers: powers.length > 0 ? powers : undefined,
          abilities,
          ability_score: abilityScore > 0 ? abilityScore : undefined,
          imageUrl: h.images?.lg || h.images?.md || h.images?.sm || null,
        };

        cachedCharMap.set(cleanK, trait);
        cachedCharMap.set(normalizeKey(slugK), trait);
        if (alterEgo) {
          cachedCharMap.set(normalizeKey(alterEgo), trait);
        }
      }

      // ── Curated Iconic Figures Not in Raw Kaggle/SuperHero API ──
      const curatedExtras: EnrichedCharacterTraits[] = [
        {
          name: "Miles Morales",
          slug: "miles-morales",
          role_type: "superhero",
          alter_ego: "Miles Gonzalo Morales",
          super_persona: "Spider-Man (Brooklyn)",
          race: "Human / Mutate",
          gender: "Male",
          height: "5'8 // 173 cm",
          weight: "160 lb // 73 kg",
          eye_color: "Brown",
          hair_color: "Black",
          place_of_birth: "Brooklyn, New York City",
          base_of_operations: "Brooklyn, New York City",
          relatives: "Jefferson Davis (father), Rio Morales (mother), Aaron Davis / Prowler (uncle)",
          teams: ["Champions", "Avengers", "Web-Warriors", "Spider-Army"],
          superpowers: [
            "Wall-Crawling",
            "Superhuman Strength & Agility",
            "Spider-Sense (Precognition)",
            "Bio-Electric Venom Blast",
            "Optical Camouflage (Invisibility)",
            "Venom Threading",
            "Dimensional Travel (Multiverse)",
          ],
          abilities: { intelligence: 82, strength: 58, speed: 64, durability: 68, power: 75, combat: 78 },
          ability_score: 425,
          imageUrl: "https://static.wikia.nocookie.net/marveldatabase/images/9/9b/Miles_Morales_%28Earth-8%29_from_Spider-Gwen_Vol_2_18_001.jpg/revision/latest?cb=20170328205637",
        },
        {
          name: "Alan Scott",
          slug: "alan-scott",
          role_type: "superhero",
          alter_ego: "Alan Ladd Wellington Scott",
          super_persona: "Golden Age Green Lantern",
          race: "Human",
          gender: "Male",
          height: "6'0 // 183 cm",
          weight: "201 lb // 91 kg",
          eye_color: "Blue",
          hair_color: "Blond",
          place_of_birth: "Milwaukee, Wisconsin",
          base_of_operations: "Gotham City / New York City",
          relatives: "Molly Mayne-Scott / Harlequin (wife), Todd Rice / Obsidian (son), Jennie-Lynn Hayden / Jade (daughter)",
          teams: ["Justice Society of America", "All-Star Squadron", "Checkmate"],
          superpowers: [
            "Starheart Green Flame Channeling",
            "Solid-Light Energy Constructs",
            "Interstellar Flight",
            "Force Fields & Energy Shields",
            "Intangibility / Phasing",
            "Pyrokinetic Blasts",
          ],
          abilities: { intelligence: 63, strength: 80, speed: 23, durability: 90, power: 98, combat: 32 },
          ability_score: 386,
          imageUrl: "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/lg/14-alan-scott.jpg",
        },
        {
          name: "Leonardo",
          slug: "leonardo",
          role_type: "superhero",
          alter_ego: "Leonardo Hamato",
          super_persona: "Leader of the TMNT",
          race: "Mutant Turtle",
          gender: "Male",
          height: "5'1 // 155 cm",
          weight: "170 lb // 77 kg",
          eye_color: "Brown / Blue Bandana",
          hair_color: "None",
          place_of_birth: "New York City Sewers",
          base_of_operations: "Manhattan Sewer Lair, New York City",
          relatives: "Master Splinter / Hamato Yoshi (father/sensei), Raphael, Donatello, Michelangelo (brothers)",
          teams: ["Teenage Mutant Ninja Turtles", "Foot Clan (temporarily)"],
          superpowers: [
            "Master Ninjutsu & Kenjutsu",
            "Dual Katana Precision",
            "Tactical Leadership & Strategy",
            "Superhuman Agility & Reflexes",
            "Stealth Infiltration",
            "Carapace Armor",
          ],
          abilities: { intelligence: 78, strength: 55, speed: 65, durability: 75, power: 45, combat: 95 },
          ability_score: 413,
          imageUrl: "https://static.wikia.nocookie.net/tmnt2012series/images/1/15/Leo_tortuga.png/revision/latest?cb=20150611185921",
        },
        {
          name: "Daily Bugle",
          slug: "daily-bugle",
          role_type: "institution",
          alter_ego: "The DB! (Daily Bugle Building)",
          super_persona: "New York City Tabloid Newspaper Nexus",
          race: "Corporation / Architecture",
          gender: "Neutral",
          place_of_birth: "New York City",
          base_of_operations: "39th Street & Second Avenue, Manhattan",
          relatives: "J. Jonah Jameson (publisher), Robbie Robertson (editor-in-chief), Peter Parker (photographer), Betty Brant, Ned Leeds",
          teams: ["The Pulse", "Front Line"],
          superpowers: [
            "Investigative Journalism",
            "Mass Media Narrative Influence",
            "Public Opinion Shaping",
            "Forensic Photojournalism",
          ],
          abilities: { intelligence: 92, strength: 20, speed: 30, durability: 85, power: 70, combat: 40 },
          ability_score: 337,
          imageUrl: "https://static.wikia.nocookie.net/marveldatabase/images/e/eb/Daily_Bugle_%28The_DB%21%29_%28Earth-616%29_from_The_Pulse_Vol_1_2_001.jpg/revision/latest/scale-to-width-down/500?cb=20210509035537",
        },
      ];

      for (const extra of curatedExtras) {
        cachedCharMap.set(normalizeKey(extra.name), extra);
        cachedCharMap.set(normalizeKey(extra.slug), extra);
        if (extra.alter_ego) cachedCharMap.set(normalizeKey(extra.alter_ego), extra);
      }
    }
  } catch (err) {
    console.error('Error loading enriched character traits:', err);
  }

  return cachedCharMap;
}

export function getEnrichedCharacterBySlug(slug: string): EnrichedCharacterTraits | null {
  const map = loadEnrichedCharacterIndex();
  if (!slug) return null;
  const cleanK = normalizeKey(slug);
  const found = map.get(cleanK);
  if (found) return found;

  // Try title or alias variants (e.g. "peter-parker-earth-616" -> "peterparker" -> spider-man)
  const baseSlug = slug.replace(/-(earth-616|earth-1|prime|marvel|dc).*$/, '');
  const baseK = normalizeKey(baseSlug);
  if (map.has(baseK)) return map.get(baseK)!;

  return null;
}

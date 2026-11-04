import superheroDataRaw from "@/data/superhero-api.json";

export type ContenderCategory =
  | "heroes"
  | "villains"
  | "sidekicks"
  | "weapons"
  | "abilities"
  | "places"
  | "vehicles"
  | "teams"
  | "creators";

export interface PowerStats {
  intelligence: number;
  strength: number;
  speed: number;
  durability: number;
  power: number;
  combat: number;
}

export interface SuperheroContender {
  id: number;
  name: string;
  fullName: string;
  slug: string;
  powerstats: PowerStats;
  overallRating: number;
  powerTier: "Street Level" | "City Defender" | "Planetary Heavyweight" | "Cosmic Deity" | "Multiversal Threat";
  publisher: string;
  alignment: "good" | "bad" | "neutral";
  category: ContenderCategory;
  image: string;
  firstAppearance: string;
  firstAppearanceValueRawUsd?: number;
  firstAppearanceValue98Usd?: number;
  signatureWeapon?: string;
  cinematicFranchise?: string;
  debutComicId?: string;
}

export interface BattleRound {
  roundNumber: number;
  title: string;
  narrative: string;
  advantage: "contenderA" | "contenderB" | "even";
  statFocus: keyof PowerStats;
}

export interface BattleSimulationResult {
  contenderA: SuperheroContender;
  contenderB: SuperheroContender;
  winner: SuperheroContender;
  loser: SuperheroContender;
  winProbabilityA: number;
  winProbabilityB: number;
  tacticalAnalysis: string;
  financialAdvantage: {
    higherValueHero: string;
    valueDifference98: number;
    analysis: string;
  };
  rounds: BattleRound[];
  historicCanonCrossed: boolean;
  crossoverContext: string;
}

// Canonical Debut Issue Pricing Crosswalk from Panel Profits Data Estate
const DEBUT_MARKET_CAPS: Record<string, { raw: number; grade98: number; comicId?: string; weapon?: string; movie?: string }> = {
  "Batman": { raw: 1500000, grade98: 8500000, weapon: "Batarangs & WayneTech Disruptor", movie: "The Dark Knight Trilogy (Christopher Nolan)" },
  "Spider-Man": { raw: 32000, grade98: 3600000, weapon: "Web-Shooters & Spider-Sense", movie: "MCU / Sony Spider-Verse" },
  "Superman": { raw: 2400000, grade98: 9000000, weapon: "Kryptonian Solar Physiology", movie: "DC Cinematic Universe (James Gunn / Snyder)" },
  "Thor": { raw: 14000, grade98: 1850000, weapon: "Mjolnir (Enchanted Uru Hammer)", movie: "Marvel Cinematic Universe (MCU Phase 1-5)" },
  "Wolverine": { raw: 4200, grade98: 650000, weapon: "Adamantium Claws & Skeleton", movie: "X-Men Franchise & Deadpool 3" },
  "Deathstroke": { raw: 450, grade98: 12500, weapon: "Promethium Broadsword & Energy Lance", movie: "DC Extended Universe / Titans" },
  "Doctor Doom": { raw: 16000, grade98: 980000, weapon: "Titanium Armor & Latverian Mystic Arts", movie: "Avengers: Doomsday (MCU Phase 6)" },
  "Lex Luthor": { raw: 28000, grade98: 1450000, weapon: "Kryptonite Warsuit & Apex Intellect", movie: "DCU Superman (2025)" },
  "Thanos": { raw: 3800, grade98: 340000, weapon: "Infinity Gauntlet & Cosmic Stasis", movie: "Avengers: Infinity War & Endgame" },
  "Darkseid": { raw: 850, grade98: 48000, weapon: "Omega Beams & Anti-Life Equation", movie: "Zack Snyder's Justice League" },
  "Hulk": { raw: 48000, grade98: 2900000, weapon: "Gamma-Ray Kinetic Impact", movie: "Marvel Cinematic Universe (The Avengers)" },
  "Doomsday": { raw: 120, grade98: 1800, weapon: "Adaptive Cellular Regeneration", movie: "Batman v Superman: Dawn of Justice" },
  "Deadpool": { raw: 450, grade98: 3500, weapon: "Dual Katanas & 4th-Wall Disruption", movie: "Deadpool & Wolverine (2024)" },
  "Harley Quinn": { raw: 250, grade98: 2400, weapon: "Oversized Mallet & Toxic Alchemy", movie: "The Suicide Squad & Birds of Prey" },
  "Magneto": { raw: 42000, grade98: 2400000, weapon: "Electromagnetic Shielding & Ferrous Control", movie: "X-Men Franchise (Ian McKellen / Michael Fassbender)" },
  "Hal Jordan": { raw: 18000, grade98: 1200000, weapon: "Oan Power Ring & Willpower Battery", movie: "DCU Lanterns (HBO / DC Studios)" },
  "Green Arrow": { raw: 12000, grade98: 820000, weapon: "Trick Arrow Arsenal & Compound Bow", movie: "Arrowverse (CW)" },
  "Hawkeye": { raw: 3200, grade98: 240000, weapon: "Vibranium Bow & Sonic Arrowheads", movie: "Marvel Cinematic Universe (Avengers)" },
  "Carnage": { raw: 180, grade98: 1600, weapon: "Symbiote Tendrils & Plasma Daggers", movie: "Venom: Let There Be Carnage" },
  "Joker": { raw: 450000, grade98: 3800000, weapon: "Joker Venom & Acid Lapel Flower", movie: "Joker / The Dark Knight" },
  "Iron Man": { raw: 36000, grade98: 2200000, weapon: "Mark LXXXV Nanotech Armor & Arc Reactor", movie: "Marvel Cinematic Universe (Robert Downey Jr.)" },
  "Captain America": { raw: 380000, grade98: 3100000, weapon: "Vibranium Concave Shield", movie: "Marvel Cinematic Universe (Chris Evans)" },
  "Daredevil": { raw: 12000, grade98: 750000, weapon: "Billy Club & Radar Sense", movie: "Daredevil: Born Again (MCU)" },
  "Nightwing": { raw: 320, grade98: 2800, weapon: "Escrima Sticks & Wingding Glider", movie: "Titans / DCU Batman: Brave and the Bold" },
  "Doctor Strange": { raw: 22000, grade98: 1450000, weapon: "Eye of Agamotto & Cloak of Levitation", movie: "Doctor Strange in the Multiverse of Madness" },
  "Doctor Fate": { raw: 35000, grade98: 1900000, weapon: "Helmet of Nabu & Amulet of Anubis", movie: "Black Adam (Pierce Brosnan)" },
  "Black Panther": { raw: 18000, grade98: 1250000, weapon: "Vibranium Weave Suit & Energy Daggers", movie: "Black Panther / Wakanda Forever" },
  "Silver Surfer": { raw: 16000, grade98: 1100000, weapon: "Power Cosmic & Cosmic Surfboard", movie: "Fantastic Four: First Steps (2025)" },
  "Martian Manhunter": { raw: 24000, grade98: 1350000, weapon: "Martian Telepathy, Density Control & Phasing", movie: "Zack Snyder's Justice League" },
  "Flash": { raw: 65000, grade98: 3200000, weapon: "Speed Force Channeling & Phasing Vibrations", movie: "The Flash (2023) / Arrowverse" },
  "Venom": { raw: 280, grade98: 4200, weapon: "Klyntar Symbiote Biomass & Tendrils", movie: "Venom Trilogy (Tom Hardy)" },
  "Spawn": { raw: 15, grade98: 180, weapon: "Necroplasm & K7-Leetha Symbiotic Armor", movie: "Spawn (Todd McFarlane / Image Comics)" },
  "She-Hulk": { raw: 80, grade98: 420, weapon: "Gamma Cellular Density & 4th-Wall Breaking", movie: "She-Hulk: Attorney at Law (MCU)" },
  "Moon Knight": { raw: 380, grade98: 48000, weapon: "Khonshu Crescent Darts, Truncheon & Scythes", movie: "Moon Knight (MCU Phase 4)" },
  "Robin": { raw: 24000, grade98: 2200000, weapon: "WayneTech Batarangs & Acrobatic Bo-Staff", movie: "DCU The Brave and the Bold" },
  "Krypto": { raw: 1200, grade98: 185000, weapon: "Kryptonian Canine Biology & Heat Vision", movie: "Superman (2025 DCU)" },
  "Mister Mxyzptlk": { raw: 22000, grade98: 480000, weapon: "5th-Dimensional Reality Warping & Hypertime Magic", movie: "DC Animated Universe / Superman Lore" },
  "Miles Morales": { raw: 450, grade98: 3200, weapon: "Bio-Electric Venom Blast & Optical Camouflage", movie: "Spider-Man: Into the Spider-Verse" },
  "Alan Scott": { raw: 280000, grade98: 3800000, weapon: "Sentient Pre-Universe Starheart Green Flame", movie: "DCU Lanterns (HBO / DC Studios)" },
};

function determinePowerTier(stats: PowerStats): SuperheroContender["powerTier"] {
  const sum = stats.intelligence + stats.strength + stats.speed + stats.durability + stats.power + stats.combat;
  if (sum >= 520) return "Multiversal Threat";
  if (sum >= 440) return "Cosmic Deity";
  if (sum >= 350) return "Planetary Heavyweight";
  if (sum >= 240) return "City Defender";
  return "Street Level";
}

/**
 * Curated Archetypes for Weapons, Vehicles, Teams, Creators, and Specialized Sidekicks
 */
const SPECIALIZED_CONTENDERS: SuperheroContender[] = [
  // ── 1. Henchmen, Sidekicks & Animal Companions ──
  {
    id: 9001,
    name: "Harley's Hyenas (Bud & Lou)",
    fullName: "Bud and Lou the Laughing Hyenas",
    slug: "harleys-hyenas",
    powerstats: { intelligence: 35, strength: 65, speed: 70, durability: 68, power: 45, combat: 78 },
    overallRating: 62,
    powerTier: "Street Level",
    publisher: "DC Comics",
    alignment: "neutral",
    category: "sidekicks",
    image: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Batman: The Animated Series #1 / Harley Quinn #1",
    firstAppearanceValueRawUsd: 250,
    firstAppearanceValue98Usd: 2400,
    signatureWeapon: "1,100 PSI Bone-Crushing Jaws & Pack Ambush",
    cinematicFranchise: "Birds of Prey / DC Extended Universe",
  },
  {
    id: 9002,
    name: "Goose the Flerken",
    fullName: "Goose / Chewie the Flerken",
    slug: "goose-the-flerken",
    powerstats: { intelligence: 60, strength: 55, speed: 65, durability: 72, power: 88, combat: 75 },
    overallRating: 72,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "neutral",
    category: "sidekicks",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Giant-Size Ms. Marvel #1 (April 2006)",
    firstAppearanceValueRawUsd: 45,
    firstAppearanceValue98Usd: 380,
    signatureWeapon: "Pocket-Dimension Oropharyngeal Tentacles & Tesseract Digestion",
    cinematicFranchise: "Marvel Cinematic Universe (Captain Marvel)",
  },
  {
    id: 9003,
    name: "Bob, Agent of Hydra",
    fullName: "Bob Dobalina (Hydra Soldier #42)",
    slug: "bob-agent-of-hydra",
    powerstats: { intelligence: 48, strength: 35, speed: 50, durability: 40, power: 25, combat: 52 },
    overallRating: 42,
    powerTier: "Street Level",
    publisher: "Marvel Comics",
    alignment: "neutral",
    category: "sidekicks",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Cable & Deadpool #38 (May 2007)",
    firstAppearanceValueRawUsd: 35,
    firstAppearanceValue98Usd: 220,
    signatureWeapon: "Tactical Cowardice, Hydra Sidearm & Deadpool Shielding",
    cinematicFranchise: "Deadpool (2016)",
  },
  {
    id: 9004,
    name: "Ace the Bat-Hound",
    fullName: "Ace the German Shepherd / Bat-Hound",
    slug: "ace-the-bat-hound",
    powerstats: { intelligence: 55, strength: 58, speed: 72, durability: 65, power: 30, combat: 76 },
    overallRating: 60,
    powerTier: "Street Level",
    publisher: "DC Comics",
    alignment: "good",
    category: "sidekicks",
    image: "https://images.unsplash.com/photo-1589941013453-ec89f33b5455?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Batman #92 (June 1955)",
    firstAppearanceValueRawUsd: 2400,
    firstAppearanceValue98Usd: 120000,
    signatureWeapon: "Forensic Scent Tracking, Kevlar Hood & Gotham K9 Takedown",
    cinematicFranchise: "DC League of Super-Pets",
  },

  // ── 2. Weapons & Relic Artifacts ──
  {
    id: 9101,
    name: "Batman's Utility Belt",
    fullName: "WayneTech Micro-Modular Combat Utility Belt",
    slug: "batmans-utility-belt",
    powerstats: { intelligence: 98, strength: 40, speed: 65, durability: 85, power: 82, combat: 92 },
    overallRating: 81,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "good",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Detective Comics #29 (July 1939)",
    firstAppearanceValueRawUsd: 650000,
    firstAppearanceValue98Usd: 3200000,
    signatureWeapon: "Cryo-Capsules, Thermite Gel, EMP Grenades & Sonic Batarangs",
    cinematicFranchise: "Batman Film Canon",
  },
  {
    id: 9102,
    name: "Spider-Man's Web-Shooters",
    fullName: "Parker Twin Solenoid High-Pressure Web-Shooters",
    slug: "spider-mans-web-shooters",
    powerstats: { intelligence: 95, strength: 75, speed: 88, durability: 78, power: 80, combat: 85 },
    overallRating: 84,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Amazing Fantasy #15 (August 1962)",
    firstAppearanceValueRawUsd: 32000,
    firstAppearanceValue98Usd: 3600000,
    signatureWeapon: "120-lb PSI Shear-Tensile Fluid, Taser Webbing & Impact Cushions",
    cinematicFranchise: "Spider-Man MCU / Raimi / Webb",
  },
  {
    id: 9103,
    name: "Moon Knight Crescent Scythes & Darts",
    fullName: "Khonshu Lunar Adamantine Scythes & Throwing Darts",
    slug: "moon-knight-crescent-scythes",
    powerstats: { intelligence: 78, strength: 60, speed: 75, durability: 80, power: 84, combat: 89 },
    overallRating: 80,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "neutral",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Werewolf by Night #32 (August 1975)",
    firstAppearanceValueRawUsd: 380,
    firstAppearanceValue98Usd: 48000,
    signatureWeapon: "Silver-Alloy Crescent Blades, Khonshu Ankh Scythes & Truncheon",
    cinematicFranchise: "Moon Knight (MCU)",
  },
  {
    id: 9104,
    name: "Batman's Batarangs",
    fullName: "WayneTech Aerodynamic Folding Batarang Arsenal",
    slug: "batmans-batarangs",
    powerstats: { intelligence: 90, strength: 50, speed: 82, durability: 75, power: 76, combat: 91 },
    overallRating: 79,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "good",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Detective Comics #31 (September 1939)",
    firstAppearanceValueRawUsd: 1500000,
    firstAppearanceValue98Usd: 8500000,
    signatureWeapon: "Explosive, Remote-Controlled & Electrified Micro-Fold Blades",
    cinematicFranchise: "Batman Canon",
  },
  {
    id: 9105,
    name: "Mjolnir (Enchanted Uru Hammer)",
    fullName: "Mjolnir: Forged in the Heart of a Dying Star",
    slug: "mjolnir-hammer",
    powerstats: { intelligence: 70, strength: 98, speed: 90, durability: 100, power: 99, combat: 92 },
    overallRating: 94,
    powerTier: "Cosmic Deity",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Journey into Mystery #83 (August 1962)",
    firstAppearanceValueRawUsd: 14000,
    firstAppearanceValue98Usd: 1850000,
    signatureWeapon: "God-Tempest Vortex, Antimatter Channeling & Worthiness Ward",
    cinematicFranchise: "Marvel Cinematic Universe",
  },
  {
    id: 9106,
    name: "Green Lantern Power Ring",
    fullName: "Oan Willpower Power Ring (Sector 2814)",
    slug: "green-lantern-ring",
    powerstats: { intelligence: 85, strength: 92, speed: 96, durability: 95, power: 98, combat: 85 },
    overallRating: 92,
    powerTier: "Cosmic Deity",
    publisher: "DC Comics",
    alignment: "good",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Showcase #22 (October 1959)",
    firstAppearanceValueRawUsd: 18000,
    firstAppearanceValue98Usd: 1200000,
    signatureWeapon: "Solid-Light Willpower Manifestations, FTL Flight & Force Fields",
    cinematicFranchise: "DCU Lanterns (HBO)",
  },
  {
    id: 9107,
    name: "The Infinity Gauntlet",
    fullName: "Uru Gauntlet with Six Cosmic Infinity Stones",
    slug: "the-infinity-gauntlet",
    powerstats: { intelligence: 98, strength: 100, speed: 98, durability: 99, power: 100, combat: 90 },
    overallRating: 98,
    powerTier: "Multiversal Threat",
    publisher: "Marvel Comics",
    alignment: "bad",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "The Infinity Gauntlet #1 (July 1991)",
    firstAppearanceValueRawUsd: 50,
    firstAppearanceValue98Usd: 450,
    signatureWeapon: "Omnipresent Mastery over Time, Space, Mind, Soul, Reality, Power",
    cinematicFranchise: "Avengers: Infinity War / Endgame",
  },
  {
    id: 9108,
    name: "The Anti-Life Equation",
    fullName: "Metaphysical Proof of the Absolute Subjugation of Free Will",
    slug: "anti-life-equation",
    powerstats: { intelligence: 100, strength: 90, speed: 95, durability: 98, power: 100, combat: 88 },
    overallRating: 96,
    powerTier: "Multiversal Threat",
    publisher: "DC Comics",
    alignment: "bad",
    category: "weapons",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Forever People #5 (November 1971)",
    firstAppearanceValueRawUsd: 180,
    firstAppearanceValue98Usd: 3200,
    signatureWeapon: "Total Mental Subjugation, Despair Induction & Cosmic Reality Shatter",
    cinematicFranchise: "Zack Snyder's Justice League",
  },

  // ── 3. Vehicles & Transit ──
  {
    id: 9201,
    name: "The Batmobile (Tumbler / 1989)",
    fullName: "Wayne Enterprises Armored Urban Assault Batmobile",
    slug: "the-batmobile",
    powerstats: { intelligence: 92, strength: 88, speed: 85, durability: 94, power: 86, combat: 84 },
    overallRating: 88,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "good",
    category: "vehicles",
    image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Detective Comics #27 / Batman #5 (Spring 1941)",
    firstAppearanceValueRawUsd: 1500000,
    firstAppearanceValue98Usd: 8500000,
    signatureWeapon: "Dual 20mm Autocannons, Jet Turbine Afterburner & EMP Plating",
    cinematicFranchise: "The Dark Knight / The Batman",
  },
  {
    id: 9202,
    name: "The Fantasticar (Mark II)",
    fullName: "Baxter Building Modular Quad-Section Flying Fantasticar",
    slug: "the-fantasticar",
    powerstats: { intelligence: 96, strength: 78, speed: 92, durability: 82, power: 85, combat: 76 },
    overallRating: 84,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "vehicles",
    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Fantastic Four #3 (March 1962)",
    firstAppearanceValueRawUsd: 12000,
    firstAppearanceValue98Usd: 420000,
    signatureWeapon: "Mach 7 Breakaway Pods, Ion Thrusters & Kinetic Energy Shields",
    cinematicFranchise: "Fantastic Four: First Steps (2025)",
  },
  {
    id: 9203,
    name: "Watchmen's Owlship (Archimedes)",
    fullName: "Dan Dreiberg's Archimedes Stealth Submersible Aerocraft",
    slug: "owlship-archimedes",
    powerstats: { intelligence: 90, strength: 74, speed: 84, durability: 86, power: 82, combat: 78 },
    overallRating: 82,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "good",
    category: "vehicles",
    image: "https://images.unsplash.com/photo-1519074069444-1ba4ea16e6f1?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Watchmen #1 (September 1986)",
    firstAppearanceValueRawUsd: 60,
    firstAppearanceValue98Usd: 320,
    signatureWeapon: "Archimedes Flamethrowers, Sonic Screechers & Hydro-Submersible Mode",
    cinematicFranchise: "Watchmen (Zack Snyder / HBO)",
  },
  {
    id: 9204,
    name: "Wolverine's Motorcycle & Blackbird",
    fullName: "Logan's Harley-Davidson & X-Men SR-71 Blackbird Jet",
    slug: "wolverine-motorcycle-blackbird",
    powerstats: { intelligence: 82, strength: 80, speed: 94, durability: 88, power: 84, combat: 85 },
    overallRating: 85,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "vehicles",
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Giant-Size X-Men #1 (May 1975)",
    firstAppearanceValueRawUsd: 4200,
    firstAppearanceValue98Usd: 650000,
    signatureWeapon: "Shi'ar Cloaking Devices, Mach 4.2 Scramjet & Adamantium Racks",
    cinematicFranchise: "X-Men Franchise & Deadpool 3",
  },
  {
    id: 9205,
    name: "Ghost Rider's Hell Cycle",
    fullName: "Spirit of Vengeance Hellfire Combustion Motorcycle",
    slug: "ghost-rider-hell-cycle",
    powerstats: { intelligence: 70, strength: 88, speed: 96, durability: 92, power: 96, combat: 84 },
    overallRating: 89,
    powerTier: "Planetary Heavyweight",
    publisher: "Marvel Comics",
    alignment: "neutral",
    category: "vehicles",
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Marvel Spotlight #5 (August 1972)",
    firstAppearanceValueRawUsd: 1200,
    firstAppearanceValue98Usd: 85000,
    signatureWeapon: "Hellfire Flamed Wheels, Vertical Surface Traction & Ethereal Speed",
    cinematicFranchise: "Ghost Rider / Agents of S.H.I.E.L.D.",
  },
  {
    id: 9206,
    name: "Lobo's Spacehog",
    fullName: "The Main Man's 600-Horsepower Spiketrike Space Chopper",
    slug: "lobos-spacehog",
    powerstats: { intelligence: 72, strength: 86, speed: 95, durability: 90, power: 92, combat: 82 },
    overallRating: 87,
    powerTier: "Planetary Heavyweight",
    publisher: "DC Comics",
    alignment: "neutral",
    category: "vehicles",
    image: "https://images.unsplash.com/photo-1558980664-769d59546b3d?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Omega Men #3 (June 1983)",
    firstAppearanceValueRawUsd: 80,
    firstAppearanceValue98Usd: 1400,
    signatureWeapon: "Interstellar Hyperspace Turbines & Front mounted Particle Lasers",
    cinematicFranchise: "DC Universe (Jason Momoa)",
  },

  // ── 4. Teams & Factions ──
  {
    id: 9301,
    name: "The Avengers",
    fullName: "Earth's Mightiest Heroes (Founding 6 + Extended Roster)",
    slug: "the-avengers",
    powerstats: { intelligence: 94, strength: 95, speed: 90, durability: 94, power: 96, combat: 96 },
    overallRating: 94,
    powerTier: "Multiversal Threat",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "teams",
    image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "The Avengers #1 (September 1963)",
    firstAppearanceValueRawUsd: 25000,
    firstAppearanceValue98Usd: 480000,
    signatureWeapon: "Thor's Lightning, Iron Man Repulsors, Cap's Shield & Hulk Rage",
    cinematicFranchise: "Marvel Cinematic Universe",
  },
  {
    id: 9302,
    name: "Justice League of America",
    fullName: "The World's Greatest Superheroes (The Trinity & Core Pantheon)",
    slug: "justice-league",
    powerstats: { intelligence: 95, strength: 98, speed: 96, durability: 96, power: 97, combat: 95 },
    overallRating: 96,
    powerTier: "Multiversal Threat",
    publisher: "DC Comics",
    alignment: "good",
    category: "teams",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "The Brave and the Bold #28 (February 1960)",
    firstAppearanceValueRawUsd: 38000,
    firstAppearanceValue98Usd: 850000,
    signatureWeapon: "Superman Solar Might, WayneTech Tactics, Amazonian Lash & Speed Force",
    cinematicFranchise: "DC Extended Universe",
  },
  {
    id: 9303,
    name: "The X-Men",
    fullName: "Children of the Atom (Gold & Blue Strike Teams)",
    slug: "the-x-men",
    powerstats: { intelligence: 92, strength: 88, speed: 89, durability: 90, power: 95, combat: 93 },
    overallRating: 91,
    powerTier: "Planetary Heavyweight",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "teams",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "X-Men #1 (September 1963) / Giant-Size #1 (1975)",
    firstAppearanceValueRawUsd: 42000,
    firstAppearanceValue98Usd: 880000,
    signatureWeapon: "Cerebro Tactical Network, Optic Blasts, Adamantium & Weather Magic",
    cinematicFranchise: "X-Men Franchise (Fox / MCU)",
  },
  {
    id: 9304,
    name: "The New Teen Titans",
    fullName: "Titans Tower Strike Force (Wolfman & Perez Lineup)",
    slug: "the-new-teen-titans",
    powerstats: { intelligence: 88, strength: 84, speed: 86, durability: 85, power: 88, combat: 89 },
    overallRating: 87,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "good",
    category: "teams",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "DC Comics Presents #26 / New Teen Titans #1 (1980)",
    firstAppearanceValueRawUsd: 180,
    firstAppearanceValue98Usd: 2200,
    signatureWeapon: "Nightwing Leadership, Starbolts, Cyborg White Noise & Raven Soul-Self",
    cinematicFranchise: "Titans / DC Animated Universe",
  },
  {
    id: 9305,
    name: "Suicide Squad (Task Force X)",
    fullName: "Amanda Waller's Expendable Incarcerated Black Ops Unit",
    slug: "suicide-squad",
    powerstats: { intelligence: 85, strength: 80, speed: 78, durability: 82, power: 84, combat: 88 },
    overallRating: 83,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "neutral",
    category: "teams",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "The Brave and the Bold #25 (1959) / Legends #3 (1987)",
    firstAppearanceValueRawUsd: 450,
    firstAppearanceValue98Usd: 16500,
    signatureWeapon: "Implanted Cranial Nanites, Heavy Ordnance & Lethal Recklessness",
    cinematicFranchise: "The Suicide Squad (James Gunn)",
  },
  {
    id: 9306,
    name: "The Thunderbolts",
    fullName: "Baron Zemo's Masters of Evil Turned Heroic Shock Troops",
    slug: "the-thunderbolts",
    powerstats: { intelligence: 86, strength: 82, speed: 80, durability: 84, power: 85, combat: 87 },
    overallRating: 84,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "neutral",
    category: "teams",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Incredible Hulk #449 / Thunderbolts #1 (1997)",
    firstAppearanceValueRawUsd: 65,
    firstAppearanceValue98Usd: 650,
    signatureWeapon: "Zemo Tactical Genius, Vibranium Knives & False-Flag Infiltration",
    cinematicFranchise: "Marvel's Thunderbolts* (2025)",
  },
  {
    id: 9307,
    name: "The Sinister Six",
    fullName: "Doctor Octopus's Coordinated Anti-Spider Syndicate",
    slug: "sinister-six",
    powerstats: { intelligence: 90, strength: 88, speed: 82, durability: 88, power: 90, combat: 86 },
    overallRating: 87,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "bad",
    category: "teams",
    image: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Amazing Spider-Man Annual #1 (1964)",
    firstAppearanceValueRawUsd: 1800,
    firstAppearanceValue98Usd: 145000,
    signatureWeapon: "Doc Ock Adamantium Arms, Electro Arc-Lightning, Sandman Mass",
    cinematicFranchise: "Spider-Man: No Way Home",
  },
  {
    id: 9308,
    name: "The Legion of Doom",
    fullName: "Lex Luthor & Brainiac's Anti-Justice League Syndicate",
    slug: "legion-of-doom",
    powerstats: { intelligence: 96, strength: 92, speed: 88, durability: 92, power: 94, combat: 88 },
    overallRating: 92,
    powerTier: "Planetary Heavyweight",
    publisher: "DC Comics",
    alignment: "bad",
    category: "teams",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Challenge of the Super Friends #1 / Justice League #1",
    firstAppearanceValueRawUsd: 850,
    firstAppearanceValue98Usd: 42000,
    signatureWeapon: "Hall of Doom Submerged Citadel, Coluan Technology & Kryptonite Ordnance",
    cinematicFranchise: "DC Universe Canon",
  },

  // ── 5. Creators & Architects ──
  {
    id: 9401,
    name: "Stan Lee & Jack Kirby",
    fullName: "Architects of the Marvel Universe (The King & The General)",
    slug: "stan-lee-jack-kirby",
    powerstats: { intelligence: 99, strength: 80, speed: 85, durability: 98, power: 98, combat: 92 },
    overallRating: 94,
    powerTier: "Multiversal Threat",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "creators",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Fantastic Four #1 (November 1961)",
    firstAppearanceValueRawUsd: 150000,
    firstAppearanceValue98Usd: 14500000,
    signatureWeapon: "Marvel Method Storytelling, Kirby Krackle & Limitless Cosmic Imagination",
    cinematicFranchise: "Marvel Cinematic Universe & Disney Box Office",
  },
  {
    id: 9402,
    name: "Bob Kane & Bill Finger",
    fullName: "Founding Architects of Batman & Gotham City Mythos",
    slug: "bob-kane-bill-finger",
    powerstats: { intelligence: 98, strength: 78, speed: 82, durability: 96, power: 96, combat: 90 },
    overallRating: 92,
    powerTier: "Multiversal Threat",
    publisher: "DC Comics",
    alignment: "good",
    category: "creators",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Detective Comics #27 (May 1939) / Batman #1 (1940)",
    firstAppearanceValueRawUsd: 250000,
    firstAppearanceValue98Usd: 17500000,
    signatureWeapon: "Gotham Noir Urban Architecture, The Rogue's Gallery & Batcave Lore",
    cinematicFranchise: "Batman Warner Bros. Franchise",
  },
  {
    id: 9403,
    name: "Alan Moore",
    fullName: "Magus of Northampton & Graphic Novel Deconstructionist",
    slug: "alan-moore",
    powerstats: { intelligence: 100, strength: 70, speed: 75, durability: 95, power: 96, combat: 85 },
    overallRating: 90,
    powerTier: "Cosmic Deity",
    publisher: "DC Comics",
    alignment: "neutral",
    category: "creators",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Saga of the Swamp Thing #20 (1984) / Watchmen #1 (1986)",
    firstAppearanceValueRawUsd: 80,
    firstAppearanceValue98Usd: 3500,
    signatureWeapon: "Deconstructionist Formalism, Non-Linear Sequential Pacing & Glycon Magic",
    cinematicFranchise: "Watchmen / V for Vendetta / From Hell",
  },
  {
    id: 9404,
    name: "Grant Morrison",
    fullName: "Metanarrative Magician & Fifth-Dimensional Hypertime Architect",
    slug: "grant-morrison",
    powerstats: { intelligence: 99, strength: 72, speed: 80, durability: 94, power: 97, combat: 86 },
    overallRating: 91,
    powerTier: "Cosmic Deity",
    publisher: "DC Comics",
    alignment: "neutral",
    category: "creators",
    image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Animal Man #1 (1988) / All-Star Superman #1 (2005)",
    firstAppearanceValueRawUsd: 45,
    firstAppearanceValue98Usd: 1800,
    signatureWeapon: "Hypersigil Metanarrative, 4th-Wall Shatter & Cosmic Esotericism",
    cinematicFranchise: "All-Star Superman / Doom Patrol / DCU Slate",
  },
  {
    id: 9405,
    name: "Frank Miller",
    fullName: "Pioneer of Hardboiled Grim & Gritty Comic Expressionism",
    slug: "frank-miller",
    powerstats: { intelligence: 94, strength: 76, speed: 78, durability: 92, power: 90, combat: 90 },
    overallRating: 88,
    powerTier: "Planetary Heavyweight",
    publisher: "DC Comics",
    alignment: "neutral",
    category: "creators",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Daredevil #158 (1979) / The Dark Knight Returns #1 (1986)",
    firstAppearanceValueRawUsd: 220,
    firstAppearanceValue98Usd: 18000,
    signatureWeapon: "Neo-Noir Chiaroscuro Inking, Ruthless Street Pacing & Operatic Violence",
    cinematicFranchise: "The Dark Knight Returns / Sin City / 300",
  },
  {
    id: 9406,
    name: "Todd McFarlane",
    fullName: "Founder of Image Comics & Dynamic Kinetic Visual Revolutionary",
    slug: "todd-mcfarlane",
    powerstats: { intelligence: 95, strength: 75, speed: 82, durability: 94, power: 92, combat: 88 },
    overallRating: 89,
    powerTier: "Planetary Heavyweight",
    publisher: "Image Comics",
    alignment: "neutral",
    category: "creators",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "The Amazing Spider-Man #298 (1988) / Spawn #1 (1992)",
    firstAppearanceValueRawUsd: 35,
    firstAppearanceValue98Usd: 4200,
    signatureWeapon: "Spaghetti-Webbing Dynamism, Creator Sovereignty & Spawn Toy Empire",
    cinematicFranchise: "Spawn / Image Comics Multiverse",
  },

  // ── 5. Abilities & Superpower Matrices ──
  {
    id: 9501,
    name: "Reality Warping (5D & Chaos Magic)",
    fullName: "5th-Dimensional & Eldritch Reality Restructuring",
    slug: "reality-warping-ability",
    powerstats: { intelligence: 100, strength: 70, speed: 90, durability: 95, power: 100, combat: 80 },
    overallRating: 95,
    powerTier: "Multiversal Threat",
    publisher: "Multiverse",
    alignment: "neutral",
    category: "abilities",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Superman #30 / Avengers #503",
    firstAppearanceValueRawUsd: 12000,
    firstAppearanceValue98Usd: 450000,
    signatureWeapon: "Subatomic Alteration, Probability Rewrites & Dimensional Erasure",
    cinematicFranchise: "Multiverse of Madness / Superman Lore",
  },
  {
    id: 9502,
    name: "Starheart Green Flame (Mystic Constructs)",
    fullName: "Sentient Pre-Universe Cosmic Green Flame of Alan Scott",
    slug: "starheart-green-flame",
    powerstats: { intelligence: 82, strength: 85, speed: 78, durability: 92, power: 98, combat: 78 },
    overallRating: 89,
    powerTier: "Planetary Heavyweight",
    publisher: "DC Comics",
    alignment: "good",
    category: "abilities",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "All-American Comics #16 (July 1940)",
    firstAppearanceValueRawUsd: 280000,
    firstAppearanceValue98Usd: 3800000,
    signatureWeapon: "Solid-Light Starheart Constructs, Phasing & Pyrokinetic Flame",
    cinematicFranchise: "DCU Lanterns / Stargirl (CW)",
  },
  {
    id: 9503,
    name: "Bio-Electric Venom Blast (Neural Shock)",
    fullName: "Miles Morales's Direct Neuro-Electric Overload Burst",
    slug: "venom-blast-ability",
    powerstats: { intelligence: 82, strength: 75, speed: 88, durability: 72, power: 94, combat: 86 },
    overallRating: 86,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "abilities",
    image: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Ultimate Fallout #4 (October 2011)",
    firstAppearanceValueRawUsd: 450,
    firstAppearanceValue98Usd: 3200,
    signatureWeapon: "Direct Nervous-System Short-Circuit, Venom Threading & Mega-Blast",
    cinematicFranchise: "Spider-Man: Into the Spider-Verse",
  },
  {
    id: 9504,
    name: "Spider-Sense & Precognition",
    fullName: "Clairvoyant Danger Reflex & Synaptic Threat Anticipation",
    slug: "spider-sense-ability",
    powerstats: { intelligence: 90, strength: 70, speed: 98, durability: 80, power: 86, combat: 92 },
    overallRating: 89,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "abilities",
    image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Amazing Fantasy #15 (August 1962)",
    firstAppearanceValueRawUsd: 32000,
    firstAppearanceValue98Usd: 3600000,
    signatureWeapon: "360-Degree Neurological Pre-Cognition & Instant Subconscious Avoidance",
    cinematicFranchise: "Spider-Man Cinema Canon",
  },
  {
    id: 9505,
    name: "The Omega Effect (Omega Beams)",
    fullName: "Apokoliptian Unavoidable Matter-Disintegration Trajectory",
    slug: "omega-beams-ability",
    powerstats: { intelligence: 95, strength: 95, speed: 96, durability: 98, power: 100, combat: 92 },
    overallRating: 96,
    powerTier: "Multiversal Threat",
    publisher: "DC Comics",
    alignment: "bad",
    category: "abilities",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Forever People #1 (February 1971)",
    firstAppearanceValueRawUsd: 650,
    firstAppearanceValue98Usd: 8500,
    signatureWeapon: "Right-Angle Homing Disintegration, Transmutation & Omega Sanction",
    cinematicFranchise: "Zack Snyder's Justice League",
  },
  {
    id: 9506,
    name: "Cosmic Power Siphon Array",
    fullName: "Victor von Doom's Eldritch Energy Stealing Mechanism",
    slug: "cosmic-power-siphon",
    powerstats: { intelligence: 100, strength: 80, speed: 82, durability: 95, power: 99, combat: 90 },
    overallRating: 94,
    powerTier: "Cosmic Deity",
    publisher: "Marvel Comics",
    alignment: "bad",
    category: "abilities",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Fantastic Four #57 (December 1966) / Secret Wars #10",
    firstAppearanceValueRawUsd: 1400,
    firstAppearanceValue98Usd: 18000,
    signatureWeapon: "Bio-Synthesized Energy Drainage of Gods, Surfers & Beyonders",
    cinematicFranchise: "Avengers: Secret Wars",
  },

  // ── 6. Places, Sanctuaries & Sovereign Fortresses ──
  {
    id: 9601,
    name: "Castle Doom (Latveria)",
    fullName: "Citadel of Doomstadt: Sovereign Latverian Bastion",
    slug: "castle-doom",
    powerstats: { intelligence: 100, strength: 85, speed: 60, durability: 100, power: 96, combat: 90 },
    overallRating: 92,
    powerTier: "Planetary Heavyweight",
    publisher: "Marvel Comics",
    alignment: "bad",
    category: "places",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Fantastic Four #5 (July 1962)",
    firstAppearanceValueRawUsd: 16000,
    firstAppearanceValue98Usd: 980000,
    signatureWeapon: "Orbital Molecular Forcefields, Doombot Garrison & Arcane Dungeon Vaults",
    cinematicFranchise: "Avengers: Doomsday",
  },
  {
    id: 9602,
    name: "The Batcave (Gotham City)",
    fullName: "Wayne Manor Subterranean Forensic Command Nexus",
    slug: "the-batcave",
    powerstats: { intelligence: 100, strength: 80, speed: 75, durability: 95, power: 88, combat: 92 },
    overallRating: 90,
    powerTier: "City Defender",
    publisher: "DC Comics",
    alignment: "good",
    category: "places",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Detective Comics #83 / Batman #12 (1942)",
    firstAppearanceValueRawUsd: 35000,
    firstAppearanceValue98Usd: 850000,
    signatureWeapon: "Batcomputer AI Mainframe, Tactical Vaults, T-Rex & Nuclear Reactor",
    cinematicFranchise: "The Dark Knight Trilogy",
  },
  {
    id: 9603,
    name: "Sanctum Sanctorum (Greenwich Village)",
    fullName: "177A Bleecker Street: Mystical Nexus of Earth-616",
    slug: "sanctum-sanctorum",
    powerstats: { intelligence: 98, strength: 75, speed: 70, durability: 96, power: 98, combat: 88 },
    overallRating: 91,
    powerTier: "Planetary Heavyweight",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "places",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Strange Tales #110 (July 1963)",
    firstAppearanceValueRawUsd: 18000,
    firstAppearanceValue98Usd: 1150000,
    signatureWeapon: "Vishanti Seal of the Nexus, Cauldron of the Cosmos & Eldritch Wards",
    cinematicFranchise: "Doctor Strange (MCU)",
  },
  {
    id: 9604,
    name: "The 5th Dimension (Zrfff)",
    fullName: "Non-Euclidean Hyper-Reality Matrix of Mister Mxyzptlk",
    slug: "the-fifth-dimension",
    powerstats: { intelligence: 100, strength: 60, speed: 100, durability: 100, power: 100, combat: 80 },
    overallRating: 96,
    powerTier: "Multiversal Threat",
    publisher: "DC Comics",
    alignment: "bad",
    category: "places",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Superman #30 (September 1944)",
    firstAppearanceValueRawUsd: 22000,
    firstAppearanceValue98Usd: 480000,
    signatureWeapon: "Non-Linear Spacetime Continuum, Infinite Imagination & 3D Reality Erasure",
    cinematicFranchise: "Superman Animated Series / DCU",
  },
  {
    id: 9605,
    name: "Fortress of Solitude (Arctic)",
    fullName: "Kryptonian Sunstone Vault & Multiversal Archive",
    slug: "fortress-of-solitude",
    powerstats: { intelligence: 98, strength: 90, speed: 70, durability: 98, power: 95, combat: 85 },
    overallRating: 91,
    powerTier: "Planetary Heavyweight",
    publisher: "DC Comics",
    alignment: "good",
    category: "places",
    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Action Comics #241 (June 1958)",
    firstAppearanceValueRawUsd: 4500,
    firstAppearanceValue98Usd: 120000,
    signatureWeapon: "Kryptonian Eradicator, Phantom Zone Projector & Giant Golden Key",
    cinematicFranchise: "Superman (1978 / 2025)",
  },
  {
    id: 9606,
    name: "Krakoa (Sentient Island)",
    fullName: "Living Mutant Sanctuary & Bio-Technological Nation",
    slug: "krakoa-sentient-island",
    powerstats: { intelligence: 92, strength: 95, speed: 70, durability: 98, power: 98, combat: 88 },
    overallRating: 92,
    powerTier: "Planetary Heavyweight",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "places",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    firstAppearance: "Giant-Size X-Men #1 (May 1975) / House of X #1 (2019)",
    firstAppearanceValueRawUsd: 4200,
    firstAppearanceValue98Usd: 65000,
    signatureWeapon: "Krakoan Teleport Gateways, Resurrection Protocols & Sentient Flora",
    cinematicFranchise: "X-Men Reign of X / MCU",
  },

  // ── 7. Additional Signature Heroes ──
  {
    id: 9701,
    name: "Miles Morales",
    fullName: "Miles Morales (Spider-Man of Brooklyn)",
    slug: "miles-morales",
    powerstats: { intelligence: 82, strength: 58, speed: 64, durability: 68, power: 75, combat: 78 },
    overallRating: 81,
    powerTier: "City Defender",
    publisher: "Marvel Comics",
    alignment: "good",
    category: "heroes",
    image: "https://cdn.marvel.com/u/prod/marvel/i/mg/f/50/537bcfa9a0225.jpg",
    firstAppearance: "Ultimate Fallout #4 (October 2011)",
    firstAppearanceValueRawUsd: 450,
    firstAppearanceValue98Usd: 3200,
    signatureWeapon: "Bio-Electric Venom Blast, Optical Camouflage & Web-Shooters",
    cinematicFranchise: "Spider-Man: Into the Spider-Verse",
  },
  {
    id: 9702,
    name: "Alan Scott",
    fullName: "Alan Ladd Wellington Scott (Golden Age Green Lantern)",
    slug: "alan-scott",
    powerstats: { intelligence: 63, strength: 80, speed: 23, durability: 90, power: 98, combat: 32 },
    overallRating: 78,
    powerTier: "Planetary Heavyweight",
    publisher: "DC Comics",
    alignment: "good",
    category: "heroes",
    image: "https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/images/lg/14-alan-scott.jpg",
    firstAppearance: "All-American Comics #16 (July 1940)",
    firstAppearanceValueRawUsd: 280000,
    firstAppearanceValue98Usd: 3800000,
    signatureWeapon: "Mystical Starheart Ring & Green Energy Constructs",
    cinematicFranchise: "DCU Lanterns / Stargirl",
  },
];

/**
 * Normalizes superhero data from Superhero API into typed Contender records
 * and combines them with specialized archetypes (weapons, vehicles, teams, creators, sidekicks).
 */
export function getAllSuperheroContenders(): SuperheroContender[] {
  const rawList = superheroDataRaw as any[];
  const mappedHeroes: SuperheroContender[] = rawList.map((h) => {
    const stats: PowerStats = {
      intelligence: Number(h.powerstats?.intelligence) || 50,
      strength: Number(h.powerstats?.strength) || 50,
      speed: Number(h.powerstats?.speed) || 50,
      durability: Number(h.powerstats?.durability) || 50,
      power: Number(h.powerstats?.power) || 50,
      combat: Number(h.powerstats?.combat) || 50,
    };
    const overall = Math.round(
      (stats.intelligence * 1.2 +
        stats.strength * 1.0 +
        stats.speed * 1.1 +
        stats.durability * 1.0 +
        stats.power * 1.3 +
        stats.combat * 1.4) /
        7.0
    );

    let displayName = h.name;
    if (h.id === 69) displayName = "Batman (Batman Beyond)";
    if (h.id === 70) displayName = "Batman";
    if (h.id === 156) displayName = "Shazam (Captain Marvel)";
    if (h.id === 157) displayName = "Captain Marvel (Carol Danvers)";
    if (h.id === 260) displayName = "Firestorm (Jason Rusch)";
    if (h.id === 261) displayName = "Firestorm (Ronnie Raymond)";
    if (h.id === 97) displayName = "Black Canary (Laurel Lance)";
    if (h.id === 98) displayName = "Black Canary (Dinah Drake)";
    if (h.id === 496) displayName = "Nova (Richard Rider)";
    if (h.id === 497) displayName = "Nova (Frankie Raye)";
    if (h.id === 23) displayName = "Angel (Buffyverse)";
    if (h.id === 24) displayName = "Angel (Warren Worthington III)";

    const meta = DEBUT_MARKET_CAPS[displayName] || DEBUT_MARKET_CAPS[h.name] || {};

    let category: ContenderCategory = "heroes";
    const alignment = (h.biography?.alignment || "good").toLowerCase();
    if (alignment === "bad") {
      category = "villains";
    }
    if (displayName.toLowerCase().includes("robin") || displayName.toLowerCase() === "krypto") {
      category = "sidekicks";
    }

    return {
      id: h.id,
      name: displayName,
      fullName: h.biography?.fullName || displayName,
      slug: h.slug || String(h.id),
      powerstats: stats,
      overallRating: Math.min(100, Math.max(10, overall)),
      powerTier: determinePowerTier(stats),
      publisher: h.biography?.publisher || "Independent",
      alignment: (h.biography?.alignment || "good").toLowerCase() as any,
      category,
      image: h.images?.md || h.images?.lg || h.images?.sm || "",
      firstAppearance: h.biography?.firstAppearance || "Archival Debut",
      firstAppearanceValueRawUsd: meta.raw,
      firstAppearanceValue98Usd: meta.grade98,
      signatureWeapon: meta.weapon,
      cinematicFranchise: meta.movie,
    };
  });

  return [...mappedHeroes, ...SPECIALIZED_CONTENDERS];
}

export interface DreamMatchupConfig {
  id: string;
  title: string;
  category: ContenderCategory;
  tagline: string;
  heroA: string;
  heroB: string;
  canonHistory: string;
}

export const CANONICAL_DREAM_MATCHUPS: DreamMatchupConfig[] = [
  // ── USER REQUESTED CLASHES ──
  {
    id: "doctor-doom-vs-mister-mxyzptlk",
    title: "Doctor Doom vs. Mister Mxyzptlk",
    category: "villains",
    tagline: "Latverian Arcane Sorcery & Tech vs. 5th-Dimensional Reality Manipulation",
    heroA: "Doctor Doom",
    heroB: "Mister Mxyzptlk",
    canonHistory: "Never occurred in official publication history. A collision of Victor von Doom's iron willpower, cosmic siphon arrays, and arcane wards against the physics-defying trickery of the 5th Dimension.",
  },
  {
    id: "alan-scott-vs-miles-morales",
    title: "Alan Scott vs. Miles Morales",
    category: "heroes",
    tagline: "Golden Age Starheart Mystic Flame vs. Modern Bio-Electric Spider-Power",
    heroA: "Alan Scott",
    heroB: "Miles Morales",
    canonHistory: "Unprecedented generational collision: the 1940 Golden Age founding sentinel of the Justice Society wielding ancient cosmic green flame against Brooklyn's high-voltage Spider-Man.",
  },

  // ── HEROES & ANTI-HEROES ──
  {
    id: "spawn-vs-she-hulk",
    title: "Spawn vs. She-Hulk",
    category: "heroes",
    tagline: "Hellspawn Necroplasm vs. Fourth-Wall Gamma Might",
    heroA: "Spawn",
    heroB: "She-Hulk",
    canonHistory: "Never occurred in official publication history. A collision between Image Comics' premiere occult avenger and Marvel's gamma-powered attorney.",
  },
  {
    id: "batman-vs-spider-man",
    title: "Batman vs. Spider-Man",
    category: "heroes",
    tagline: "The Detective of Gotham vs. The Web-Slinger of Queens",
    heroA: "Batman",
    heroB: "Spider-Man",
    canonHistory: "Briefly met in 1995's Spider-Man and Batman: Disordered Minds against Carnage and Joker, but never fought to a decisive 1-on-1 finish.",
  },
  {
    id: "superman-vs-thor",
    title: "Superman vs. Thor",
    category: "heroes",
    tagline: "The Last Son of Krypton vs. The Norse God of Thunder",
    heroA: "Superman",
    heroB: "Thor",
    canonHistory: "Clashed in 2003's JLA/Avengers #2 where Superman famously caught Mjolnir, but Thor's magical lightning remains a direct vulnerability.",
  },
  {
    id: "wolverine-vs-deathstroke",
    title: "Wolverine vs. Deathstroke",
    category: "heroes",
    tagline: "Weapon X Adamantium vs. The Enhanced Terminator",
    heroA: "Wolverine",
    heroB: "Deathstroke",
    canonHistory: "Met briefly in 1982's Uncanny X-Men and The New Teen Titans, but never waged an all-out blood duel between their respective healing factors.",
  },
  {
    id: "doctor-doom-vs-lex-luthor",
    title: "Doctor Doom vs. Lex Luthor",
    category: "heroes",
    tagline: "The Sorcerer King of Latveria vs. Apex Humanity",
    heroA: "Doctor Doom",
    heroB: "Lex Luthor",
    canonHistory: "Uneasy allies in 1981's Marvel Treasury Edition #28, but their supreme egos have never collided in a solo sovereign war.",
  },
  {
    id: "thanos-vs-darkseid",
    title: "Thanos vs. Darkseid",
    category: "heroes",
    tagline: "The Mad Titan vs. The Lord of Apokolips",
    heroA: "Thanos",
    heroB: "Darkseid",
    canonHistory: "Briefly crossed paths in Marvel vs DC (1996) where Thanos tested the Anti-Life equation, but never fought in their apex cosmic forms.",
  },
  {
    id: "hulk-vs-doomsday",
    title: "Hulk vs. Doomsday",
    category: "heroes",
    tagline: "Worldbreaker Infinite Rage vs. The Monster Who Killed Superman",
    heroA: "Hulk",
    heroB: "Doomsday",
    canonHistory: "Fought in DC Versus Marvel #3 (1996) where Superman fought Hulk, but Hulk never faced Doomsday directly in a survival war.",
  },
  {
    id: "deadpool-vs-harley-quinn",
    title: "Deadpool vs. Harley Quinn",
    category: "heroes",
    tagline: "The Merc with a Mouth vs. The Maiden of Mischief",
    heroA: "Deadpool",
    heroB: "Harley Quinn",
    canonHistory: "Never occurred in official publication history. A pure multiversal fourth-wall collision of anarchic slapstick and lethal combat.",
  },
  {
    id: "magneto-vs-hal-jordan",
    title: "Magneto vs. Hal Jordan",
    category: "heroes",
    tagline: "Master of Magnetism vs. Green Lantern Willpower",
    heroA: "Magneto",
    heroB: "Hal Jordan",
    canonHistory: "A direct metaphysical clash of the Electromagnetic Spectrum against the Emerald Emotional Spectrum that has never happened in comic canon.",
  },
  {
    id: "carnage-vs-joker",
    title: "Carnage vs. The Joker",
    category: "heroes",
    tagline: "Maximum Alien Carnage vs. The Harlequin of Hate",
    heroA: "Carnage",
    heroB: "Joker",
    canonHistory: "Paired in 1995's Spider-Man and Batman, but their ideological feud over 'pure slaughter' vs 'theatrical comedy' remained unresolved.",
  },

  // ── HENCHMEN & SIDEKICKS ──
  {
    id: "robin-vs-krypto",
    title: "Robin vs. Krypto the Superdog",
    category: "sidekicks",
    tagline: "Gotham's Boy Wonder vs. The Kryptonian Super-Canine",
    heroA: "Robin",
    heroB: "Krypto",
    canonHistory: "Allies in occasional Superman/Batman family gatherings, but Robin's tactical WayneTech arsenal has never attempted to subdue Krypto's solar physiology.",
  },
  {
    id: "harley-hyenas-vs-goose",
    title: "Harley's Hyenas vs. Goose the Flerken",
    category: "sidekicks",
    tagline: "Laughing Apex Predators vs. Eldritch Pocket-Dimension Flerken",
    heroA: "Harley's Hyenas (Bud & Lou)",
    heroB: "Goose the Flerken",
    canonHistory: "Unprecedented animal companion showdown: Bud & Lou's 1,100 PSI bone-crushing bite against Goose's lovecraftian multidimensional tentacles.",
  },
  {
    id: "bob-hydra-vs-ace-bathound",
    title: "Bob, Agent of Hydra vs. Ace the Bat-Hound",
    category: "sidekicks",
    tagline: "Hydra's Most Reluctant Grunt vs. The Batcave's Tracking Dog",
    heroA: "Bob, Agent of Hydra",
    heroB: "Ace the Bat-Hound",
    canonHistory: "Bob attempts to run away from Gotham while Ace the Bat-Hound enforces nighttime justice with Kevlar armor and forensic scent-tracking.",
  },

  // ── WEAPONS & RELICS ──
  {
    id: "utility-belt-vs-web-shooters",
    title: "Batman's Utility Belt vs. Spider-Man's Web-Shooters",
    category: "weapons",
    tagline: "WayneTech Micro-Tactical Arsenal vs. Parker Tensile Engineering",
    heroA: "Batman's Utility Belt",
    heroB: "Spider-Man's Web-Shooters",
    canonHistory: "The ultimate clash of superhero equipment: WayneTech cryo-pellets, thermite foam, and EMPs against Peter Parker's shear-tensile liquid webbing.",
  },
  {
    id: "moon-knight-scythes-vs-batarangs",
    title: "Moon Knight Scythes vs. Batman's Batarangs",
    category: "weapons",
    tagline: "Khonshu's Lunar Blades vs. WayneTech Aerodynamic Projectiles",
    heroA: "Moon Knight Crescent Scythes & Darts",
    heroB: "Batman's Batarangs",
    canonHistory: "Ancient Egyptian lunar adamantine and throwing scythes collide with Gotham's aerodynamic high-velocity folding micro-alloys.",
  },
  {
    id: "mjolnir-vs-gl-ring",
    title: "Mjolnir vs. Green Lantern Power Ring",
    category: "weapons",
    tagline: "Asgardian Enchanted Uru vs. Oan Emerald Willpower",
    heroA: "Mjolnir (Enchanted Uru Hammer)",
    heroB: "Green Lantern Power Ring",
    canonHistory: "The greatest weapon in the Marvel pantheon meets the most versatile weapon in DC cosmic lore in an absolute clash of storm and hard-light.",
  },
  {
    id: "infinity-gauntlet-vs-anti-life",
    title: "The Infinity Gauntlet vs. The Anti-Life Equation",
    category: "weapons",
    tagline: "Six Cosmic Reality Stones vs. Absolute Subjugation of Free Will",
    heroA: "The Infinity Gauntlet",
    heroB: "The Anti-Life Equation",
    canonHistory: "The ultimate metaphysical weapon clash in comic history: reality manipulation across time and space versus the mathematical destruction of consciousness.",
  },

  // ── VEHICLES & TRANSIT ──
  {
    id: "batmobile-vs-fantasticar",
    title: "The Batmobile vs. The Fantasticar",
    category: "vehicles",
    tagline: "WayneTech Armored Assault vs. Baxter Building VTOL Ion Transport",
    heroA: "The Batmobile (Tumbler / 1989)",
    heroB: "The Fantasticar (Mark II)",
    canonHistory: "Heavy jet-turbine street armor and autocannons clash against Reed Richards' modular Mach-7 breakaway flying bathtub.",
  },
  {
    id: "owlship-vs-blackbird",
    title: "Owlship Archimedes vs. Wolverine's Motorcycle & Blackbird",
    category: "vehicles",
    tagline: "Nite Owl's Solar Stealth Aerocraft vs. X-Men Scramjet & Chopper",
    heroA: "Watchmen's Owlship (Archimedes)",
    heroB: "Wolverine's Motorcycle & Blackbird",
    canonHistory: "Dan Dreiberg's solar-powered stealth submersible craft squares off against Wolverine's roar of the road and the Mach 4.2 mutant scramjet.",
  },
  {
    id: "hell-cycle-vs-spacehog",
    title: "Ghost Rider's Hell Cycle vs. Lobo's Spacehog",
    category: "vehicles",
    tagline: "Supernatural Hellfire Wheels vs. Cyber-Propelled Interstellar Spiketrike",
    heroA: "Ghost Rider's Hell Cycle",
    heroB: "Lobo's Spacehog",
    canonHistory: "A roaring interstellar demolition derby: Johnny Blaze's demonic supernatural motorcycle versus Lobo's heavy-ordnance cosmic chopper.",
  },

  // ── TEAMS & FACTIONS ──
  {
    id: "avengers-vs-justice-league",
    title: "The Avengers vs. Justice League of America",
    category: "teams",
    tagline: "Earth's Mightiest Heroes vs. The World's Greatest Superheroes",
    heroA: "The Avengers",
    heroB: "Justice League of America",
    canonHistory: "The monumental crossover from Kurt Busiek and George Pérez (2003) brought to life with dynamic census-backed comic equity valuation stakes.",
  },
  {
    id: "x-men-vs-teen-titans",
    title: "The X-Men vs. The New Teen Titans",
    category: "teams",
    tagline: "Children of the Atom vs. Titans Tower Roster",
    heroA: "The X-Men",
    heroB: "The New Teen Titans",
    canonHistory: "Revisiting the landmark 1982 crossover by Chris Claremont and Walt Simonson where Darkseid and Dark Phoenix threatened the multiverse.",
  },
  {
    id: "suicide-squad-vs-thunderbolts",
    title: "Suicide Squad vs. The Thunderbolts",
    category: "teams",
    tagline: "Amanda Waller's Convicts vs. Baron Zemo's False-Flag Operatives",
    heroA: "Suicide Squad (Task Force X)",
    heroB: "The Thunderbolts",
    canonHistory: "The ultimate government black-ops anti-hero war: Task Force X cranial explosives versus the covert military intrigue of the Thunderbolts.",
  },
  {
    id: "sinister-six-vs-legion-of-doom",
    title: "Sinister Six vs. The Legion of Doom",
    category: "teams",
    tagline: "Doctor Octopus's NYC Syndicate vs. Lex Luthor's Villain Coalition",
    heroA: "The Sinister Six",
    heroB: "The Legion of Doom",
    canonHistory: "Urban villain coordination meets global super-science in an all-out syndicate war for multiversal territory.",
  },

  // ── CREATORS & ARCHITECTS ──
  {
    id: "stan-kirby-vs-kane-finger",
    title: "Stan Lee & Jack Kirby vs. Bob Kane & Bill Finger",
    category: "creators",
    tagline: "Marvel Universe Architects vs. Gotham City Founders",
    heroA: "Stan Lee & Jack Kirby",
    heroB: "Bob Kane & Bill Finger",
    canonHistory: "The definitive clash of comic book royalty: the creators who birthed the Marvel Age against the visionaries who built Batman, Gotham, and modern detective noir.",
  },
  {
    id: "alan-moore-vs-grant-morrison",
    title: "Alan Moore vs. Grant Morrison",
    category: "creators",
    tagline: "Deconstructionist Literature vs. Metanarrative Magick",
    heroA: "Alan Moore",
    heroB: "Grant Morrison",
    canonHistory: "Decades of British Invasion literary rivalry, magical philosophy, and contrasting views on the deconstruction versus celebration of superhero mythology.",
  },
  {
    id: "frank-miller-vs-todd-mcfarlane",
    title: "Frank Miller vs. Todd McFarlane",
    category: "creators",
    tagline: "The Grim & Gritty Noir Pioneer vs. The Image Comics Sovereign Revolutionary",
    heroA: "Frank Miller",
    heroB: "Todd McFarlane",
    canonHistory: "The visual renegades who shattered industry conventions: Miller's The Dark Knight Returns cinematic storytelling against McFarlane's record-shattering Spawn sovereignty.",
  },

  // ── PLACES & SANCTUARIES ──
  {
    id: "castle-doom-vs-sanctum-sanctorum",
    title: "Castle Doom vs. Sanctum Sanctorum",
    category: "places",
    tagline: "Latverian Sovereign Bastion vs. Greenwich Village Eldritch Nexus",
    heroA: "Castle Doom (Latveria)",
    heroB: "Sanctum Sanctorum (Greenwich Village)",
    canonHistory: "The ultimate stronghold siege: Doctor Doom's fortress armed with Doombot garrisons and molecular forcefields colliding with Doctor Strange's ancient Vishanti dimensional wards and cosmic relics.",
  },
  {
    id: "batcave-vs-fortress-of-solitude",
    title: "The Batcave vs. Fortress of Solitude",
    category: "places",
    tagline: "Wayne Forensic Command Nexus vs. Kryptonian Multiversal Archive",
    heroA: "The Batcave (Gotham City)",
    heroB: "Fortress of Solitude (Arctic)",
    canonHistory: "Subterranean WayneTech AI forensics and cryogenic defenses challenge Kryptonian crystalline sunstone databases and Phantom Zone projectors.",
  },

  // ── ABILITIES & SUPERPOWER MATRICES ──
  {
    id: "reality-warping-vs-starheart",
    title: "Reality Warping vs. Starheart Green Flame",
    category: "abilities",
    tagline: "5th-Dimensional Omnipotence vs. Sentient Pre-Universe Cosmic Fire",
    heroA: "Reality Warping (5D & Chaos Magic)",
    heroB: "Starheart Green Flame (Mystic Constructs)",
    canonHistory: "Conceptual power showdown: rewriting the laws of physics and probability against the immortal, sentient mystical fire that predates universal creation.",
  },
  {
    id: "venom-blast-vs-utility-belt",
    title: "Bio-Electric Venom Blast vs. Batman's Utility Belt",
    category: "abilities",
    tagline: "High-Voltage Neural Disruption vs. WayneTech Micro-Tactical Arsenal",
    heroA: "Bio-Electric Venom Blast (Neural Shock)",
    heroB: "Batman's Utility Belt",
    canonHistory: "Can Batman's insulated gauntlets, EMP dampeners, and cryogenic pellets neutralize Miles Morales's nervous-system short-circuiting mega-blast before point-blank contact?",
  },
];

/**
 * Advanced Combat Simulation Engine
 * Calculates multi-dimensional combat dynamics based on canonical powerstats,
 * tactical genius, equipment synergies, and comic equity valuations.
 */
export function simulateSuperheroBattle(
  heroA: SuperheroContender,
  heroB: SuperheroContender
): BattleSimulationResult {
  const statsA = heroA.powerstats;
  const statsB = heroB.powerstats;

  // 1. Scoring dimensions
  const intellectDiff = statsA.intelligence - statsB.intelligence;
  const strengthDiff = statsA.strength - statsB.strength;
  const speedDiff = statsA.speed - statsB.speed;
  const durabilityDiff = statsA.durability - statsB.durability;
  const powerDiff = statsA.power - statsB.power;
  const combatDiff = statsA.combat - statsB.combat;

  // Weighted combat calculus
  // Combat skill (25%), Power/Energy (25%), Durability (20%), Speed (15%), Strength (10%), Intellect (5%)
  const combatScoreA =
    statsA.combat * 2.5 +
    statsA.power * 2.5 +
    statsA.durability * 2.0 +
    statsA.speed * 1.5 +
    statsA.strength * 1.0 +
    statsA.intelligence * 1.0;

  const combatScoreB =
    statsB.combat * 2.5 +
    statsB.power * 2.5 +
    statsB.durability * 2.0 +
    statsB.speed * 1.5 +
    statsB.strength * 1.0 +
    statsB.intelligence * 1.0;

  const totalScore = combatScoreA + combatScoreB;
  let winProbA = Math.round((combatScoreA / totalScore) * 100);
  let winProbB = 100 - winProbA;

  // Ensure plausible bounds
  winProbA = Math.min(88, Math.max(12, winProbA));
  winProbB = 100 - winProbA;

  const isAWinner = winProbA >= winProbB;
  const winner = isAWinner ? heroA : heroB;
  const loser = isAWinner ? heroB : heroA;

  // 2. Generate 3 Round-by-Round Encounters (customizing by category)
  const rounds: BattleRound[] = [];
  const cat = heroA.category === heroB.category ? heroA.category : "heroes";

  if (cat === "weapons") {
    // Weapons clash rounds
    rounds.push({
      roundNumber: 1,
      title: "Round 1: Mechanical Deployment & Trajectory Velocity",
      statFocus: "speed",
      advantage: speedDiff > 5 ? "contenderA" : speedDiff < -5 ? "contenderB" : "even",
      narrative:
        speedDiff > 5
          ? `${heroA.name} activates with superior deployment speed (${statsA.speed} vs ${statsB.speed}), delivering rapid initial strikes and preempting countermeasures.`
          : speedDiff < -5
          ? `${heroB.name} establishes early perimeter dominance through superior projectile velocity (${statsB.speed} vs ${statsA.speed}), suppressing initial attacks.`
          : `Both armaments engage with near-simultaneous activation triggers, discharging initial volleys into a deadlocked crossfire.`,
    });

    rounds.push({
      roundNumber: 2,
      title: "Round 2: Structural Integrity & Energy Output",
      statFocus: "power",
      advantage: powerDiff > 5 ? "contenderA" : powerDiff < -5 ? "contenderB" : "even",
      narrative:
        powerDiff > 5
          ? `${heroA.name} releases overwhelming energetic output (${statsA.power} rating), severely stressing the containment matrix of ${heroB.name}.`
          : powerDiff < -5
          ? `${heroB.name} unleashes crushing kinetic force (${statsB.power} rating), overwhelming the defensive tolerances of ${heroA.name}.`
          : `A blinding energetic detonation reverberates through the arena as both relic arsenals release peak output without fracture.`,
    });

    rounds.push({
      roundNumber: 3,
      title: "Round 3: Peak Payload & Operational Overdrive",
      statFocus: "combat",
      advantage: isAWinner ? "contenderA" : "contenderB",
      narrative: isAWinner
        ? `In the final threshold of stress testing, ${heroA.name}'s flawless precision engineering (${statsA.combat} Combat) overpowers ${heroB.name} to achieve catastrophic functional disruption.`
        : `${heroB.name}'s relentless operational superiority (${statsB.combat} Combat) pierces through the remaining safeguards of ${heroA.name}, claiming total victory.`,
    });
  } else if (cat === "vehicles") {
    // Vehicles clash rounds
    rounds.push({
      roundNumber: 1,
      title: "Round 1: Acceleration, Handling & Aerial Maneuvers",
      statFocus: "speed",
      advantage: speedDiff > 5 ? "contenderA" : speedDiff < -5 ? "contenderB" : "even",
      narrative:
        speedDiff > 5
          ? `${heroA.name} out-accelerates off the line with superior thrust-to-weight ratio (${statsA.speed} vs ${statsB.speed}), securing dominant tactical positioning.`
          : speedDiff < -5
          ? `${heroB.name} takes the outside line with greater top-end velocity (${statsB.speed} vs ${statsA.speed}), executing high-G evasion maneuvers.`
          : `Both machines launch in tandem, engines redlining at peak RPM as they enter the combat zone bumper-to-bumper.`,
    });

    rounds.push({
      roundNumber: 2,
      title: "Round 2: Armored Hull Integrity & Countermeasure Intercepts",
      statFocus: "durability",
      advantage: durabilityDiff > 5 ? "contenderA" : durabilityDiff < -5 ? "contenderB" : "even",
      narrative:
        durabilityDiff > 5
          ? `${heroA.name}'s reinforced hull plating (${statsA.durability} Durability) deflects high-caliber incoming ordnance, preserving structural integrity.`
          : durabilityDiff < -5
          ? `${heroB.name}'s defensive countermeasures (${statsB.durability} Durability) absorb the primary payload of ${heroA.name} without breach.`
          : `Metal grinds against armor in a deafening broadside collision, sending plumes of sparks as both chassis hold firm.`,
    });

    rounds.push({
      roundNumber: 3,
      title: "Round 3: Maximum Ramming Kinetic Force & Final Pursuit",
      statFocus: "power",
      advantage: isAWinner ? "contenderA" : "contenderB",
      narrative: isAWinner
        ? `${heroA.name} engages full afterburners and tactical ordnance (${statsA.power} Power), ramming ${heroB.name} off the tarmac into terminal structural failure.`
        : `${heroB.name} executes an evasive counter-ram maneuver (${statsB.power} Power), disabling the propulsion core of ${heroA.name} to take the flag.`,
    });
  } else if (cat === "creators") {
    // Creators clash rounds
    rounds.push({
      roundNumber: 1,
      title: "Round 1: Archetype Innovation & Foundational Mythology",
      statFocus: "intelligence",
      advantage: intellectDiff > 3 ? "contenderA" : intellectDiff < -3 ? "contenderB" : "even",
      narrative:
        intellectDiff > 3
          ? `${heroA.name} lays down foundational storytelling pillars that redefine the medium, introducing concepts that will anchor decades of pop culture.`
          : intellectDiff < -3
          ? `${heroB.name} establishes psychological depth and iconic iconography, captivating reader imaginations across the international market.`
          : `Both visionary masterminds deliver landmark opening runs that irrevocably transform graphic sequential art forever.`,
    });

    rounds.push({
      roundNumber: 2,
      title: "Round 2: Visual Dynamics & Cinematic Box Office Footprint",
      statFocus: "power",
      advantage: powerDiff > 3 ? "contenderA" : powerDiff < -3 ? "contenderB" : "even",
      narrative:
        powerDiff > 3
          ? `${heroA.name} drives billions in modern cinematic adaptation revenue, cementing unprecedented worldwide cultural market saturation.`
          : powerDiff < -3
          ? `${heroB.name} shapes visual storytelling aesthetics and auteur prestige, earning critical acclaim and evergreen shelf longevity.`
          : `Both creator legacies dominate global box office receipts and prestige literary discourse in equal measure.`,
    });

    rounds.push({
      roundNumber: 3,
      title: "Round 3: Certified Comic Equity Valuation & Century-Spanning Legacy",
      statFocus: "combat",
      advantage: isAWinner ? "contenderA" : "contenderB",
      narrative: isAWinner
        ? `In certified secondary auction hammers and immortal creator reverence, ${heroA.name} claims historical supremacy with record-shattering certified 9.8 market capitalizations.`
        : `Through revolutionary craft and lasting sovereign influence, ${heroB.name} takes the mantle as the ultimate architect of sequential literature.`,
    });
  } else if (cat === "teams") {
    // Teams clash rounds
    rounds.push({
      roundNumber: 1,
      title: "Round 1: Vanguard Incursion & Team Coordination",
      statFocus: "speed",
      advantage: speedDiff > 5 ? "contenderA" : speedDiff < -5 ? "contenderB" : "even",
      narrative:
        speedDiff > 5
          ? `${heroA.name} strikes first with synchronized squad cohesion (${statsA.speed} Speed), breaking the vanguard lines of ${heroB.name}.`
          : speedDiff < -5
          ? `${heroB.name} establishes defensive tactical formations (${statsB.speed} Speed), intercepting early skirmishers with textbook discipline.`
          : `Both rosters collide across the entire frontline, neither team giving up an inch of terrain in the opening exchange.`,
    });

    rounds.push({
      roundNumber: 2,
      title: "Round 2: Heavy-Hitter Synergy & Elemental Volleys",
      statFocus: "power",
      advantage: powerDiff > 5 ? "contenderA" : powerDiff < -5 ? "contenderB" : "even",
      narrative:
        powerDiff > 5
          ? `${heroA.name}'s powerhouse members unleash combined ultimate abilities (${statsA.power} Power), cracking the defensive perimeter of ${heroB.name}.`
          : powerDiff < -5
          ? `${heroB.name} retaliates with overwhelming synergistic firepower (${statsB.power} Power), driving ${heroA.name} into defensive retreat.`
          : `Cosmic energy, lightning, and kinetic shockwaves rock the battlefield as the heavy hitters of both factions clash at maximum output.`,
    });

    rounds.push({
      roundNumber: 3,
      title: "Round 3: Tactical Endgame & Faction Supremacy",
      statFocus: "combat",
      advantage: isAWinner ? "contenderA" : "contenderB",
      narrative: isAWinner
        ? `${heroA.name}'s tactical leadership and battle-tested endurance (${statsA.combat} Combat) systematically overwhelm ${heroB.name}'s remaining defenders to seal the victory.`
        : `${heroB.name}'s masterclass execution and clutch member synergies (${statsB.combat} Combat) break ${heroA.name}, securing triumphant faction dominance.`,
    });
  } else if (cat === "abilities") {
    // Abilities & Superpower Matrix clash rounds
    rounds.push({
      roundNumber: 1,
      title: "Round 1: Activation Latency & Area-of-Effect Radius",
      statFocus: "speed",
      advantage: speedDiff > 5 ? "contenderA" : speedDiff < -5 ? "contenderB" : "even",
      narrative:
        speedDiff > 5
          ? `${heroA.name} triggers instantaneous field manifestation (${statsA.speed} Velocity), overwhelming ${heroB.name} with rapid subatomic coverage.`
          : speedDiff < -5
          ? `${heroB.name} achieves immediate energetic propagation (${statsB.speed} Velocity), preempting the initial activation cycle of ${heroA.name}.`
          : `Both metaphysical superpowers detonate in simultaneous synchronization, interlocking energy matrices across the theater.`,
    });

    rounds.push({
      roundNumber: 2,
      title: "Round 2: Destructive Yield & Conceptual Reality Strain",
      statFocus: "power",
      advantage: powerDiff > 5 ? "contenderA" : powerDiff < -5 ? "contenderB" : "even",
      narrative:
        powerDiff > 5
          ? `${heroA.name} exerts staggering energetic pressure (${statsA.power} Power), fracturing the metaphysical barrier of ${heroB.name}.`
          : powerDiff < -5
          ? `${heroB.name} uncoils raw omnipotent output (${statsB.power} Power), neutralizing and absorbing ${heroA.name}'s forward surge.`
          : `Spacetime groans as both abilities collide at absolute peak wattage, creating a localized reality warp.`,
    });

    rounds.push({
      roundNumber: 3,
      title: "Round 3: Conceptual Supremacy & Terminal Impact",
      statFocus: "combat",
      advantage: isAWinner ? "contenderA" : "contenderB",
      narrative: isAWinner
        ? `In the final threshold of dimensional stress, ${heroA.name}'s supreme precision focus (${statsA.combat} Mastery) shatters ${heroB.name}'s integrity to claim definitive supremacy.`
        : `${heroB.name}'s insurmountable potency and resilience (${statsB.combat} Mastery) dissolve ${heroA.name}'s field, establishing absolute conceptual victory.`,
    });
  } else if (cat === "places") {
    // Places & Bastions clash rounds
    rounds.push({
      roundNumber: 1,
      title: "Round 1: Orbital Perimeter & Boundary Infiltration",
      statFocus: "durability",
      advantage: durabilityDiff > 5 ? "contenderA" : durabilityDiff < -5 ? "contenderB" : "even",
      narrative:
        durabilityDiff > 5
          ? `${heroA.name}'s outer perimeter wards and fortifications (${statsA.durability} Durability) repel the initial siege assault without structural deformation.`
          : durabilityDiff < -5
          ? `${heroB.name}'s defensive matrices (${statsB.durability} Durability) absorb the primary opening bombardment from ${heroA.name} without a breach.`
          : `Heavy defensive grids and acoustic wards on both strongholds illuminate under synchronous reciprocal fire.`,
    });

    rounds.push({
      roundNumber: 2,
      title: "Round 2: Garrison Deployment & Arsenal Siphon Arrays",
      statFocus: "intelligence",
      advantage: intellectDiff > 5 ? "contenderA" : intellectDiff < -5 ? "contenderB" : "even",
      narrative:
        intellectDiff > 5
          ? `${heroA.name}'s tactical AI systems and ancient archives (${statsA.intelligence} Intellect) out-calculate enemy incursions, trapping ${heroB.name}'s advance.`
          : intellectDiff < -5
          ? `${heroB.name}'s automated defenses and forensic mainframes (${statsB.intelligence} Intellect) coordinate a surgical counter-strike against ${heroA.name}.`
          : `Automated garrisons, defensive drones, and mystical runes trade continuous tactical salvos in an unyielding siege.`,
    });

    rounds.push({
      roundNumber: 3,
      title: "Round 3: Bastion Supremacy & Territorial Conquest",
      statFocus: "power",
      advantage: isAWinner ? "contenderA" : "contenderB",
      narrative: isAWinner
        ? `${heroA.name}'s fortress core channels supreme environmental power (${statsA.power} Output), collapsing ${heroB.name}'s foundation to secure sovereign dominion.`
        : `${heroB.name}'s indestructible bastion core (${statsB.power} Output) overpowers the outer containment of ${heroA.name}, claiming absolute territorial supremacy.`,
    });
  } else {
    // Standard hero / sidekick clash rounds
    const r1Adv = speedDiff > 10 ? "contenderA" : speedDiff < -10 ? "contenderB" : "even";
    rounds.push({
      roundNumber: 1,
      title: "Opening Incursion: Speed & Spatial Engagement",
      statFocus: "speed",
      advantage: r1Adv,
      narrative:
        r1Adv === "contenderA"
          ? `${heroA.name} seizes immediate spatial superiority with superior kinetic velocity (${statsA.speed} vs ${statsB.speed}), circling ${heroB.name} and testing perimeter defenses.`
          : r1Adv === "contenderB"
          ? `${heroB.name} dictates early tempo, utilizing superior speed and reflexes (${statsB.speed} vs ${statsA.speed}) to evade initial advances and land decisive precision strikes.`
          : `Both combatants exchange lightning opening volleys with near-identical operational reflexes, neither yielding ground in the opening clash.`,
    });

    const r2Adv = powerDiff + strengthDiff > 15 ? "contenderA" : powerDiff + strengthDiff < -15 ? "contenderB" : "even";
    rounds.push({
      roundNumber: 2,
      title: "Apex Escalation: Heavy Armament & Energy Output",
      statFocus: "power",
      advantage: r2Adv,
      narrative:
        r2Adv === "contenderA"
          ? `${heroA.name} unleashes full destructive capacity (${statsA.power} Power rating), forcing ${heroB.name} onto the back foot with overwhelming concussive force.`
          : r2Adv === "contenderB"
          ? `${heroB.name} counters with devastating offensive potency (${statsB.power} Power rating), breaking through ${heroA.name}'s forward defensive perimeter.`
          : `An apocalyptic kinetic collision rocks the arena as ${heroA.name} and ${heroB.name}'s signature arsenals collide in a deadlocked shockwave.`,
    });

    const r3Adv = isAWinner ? "contenderA" : "contenderB";
    rounds.push({
      roundNumber: 3,
      title: "The Decisive Finish: Combat Mastery & Attrition",
      statFocus: "combat",
      advantage: r3Adv,
      narrative:
        r3Adv === "contenderA"
          ? `In the grueling war of attrition, ${heroA.name}'s supreme hand-to-hand discipline (${statsA.combat} Combat) and endurance (${statsA.durability} Durability) break ${heroB.name}'s posture, securing a definitive victory.`
          : `Exploiting an opening in the late exchanges, ${heroB.name}'s elite martial execution (${statsB.combat} Combat) overwhelms ${heroA.name}, landing the closing blow to claim the battle.`,
    });
  }

  // 3. Tactical Analysis Summary
  let tactical = `${winner.name} triumphs with an estimated ${Math.max(winProbA, winProbB)}% win probability. `;
  if (Math.abs(combatDiff) > 15) {
    tactical += `The primary decider was the stark differential in martial combat execution (${winner.powerstats.combat} vs ${loser.powerstats.combat}). `;
  } else if (Math.abs(powerDiff) > 20) {
    tactical += `Raw destructive energy projection (${winner.powerstats.power} vs ${loser.powerstats.power}) proved insurmountable in prolonged exchanges. `;
  } else {
    tactical += `Both contenders demonstrated elite parity, with the margin of victory secured through tactical conditioning and superior durability recovery. `;
  }

  // 4. Financial Comic Equity Valuation Comparison
  const valA = heroA.firstAppearanceValue98Usd || 0;
  const valB = heroB.firstAppearanceValue98Usd || 0;
  const higherHero = valA >= valB ? heroA.name : heroB.name;
  const diffVal = Math.abs(valA - valB);

  let finAnalysis = "";
  if (valA > 0 && valB > 0) {
    finAnalysis = `${higherHero}'s landmark first appearance (${higherHero === heroA.name ? heroA.firstAppearance : heroB.firstAppearance}) holds a commanding secondary market valuation edge of $${diffVal.toLocaleString()} in certified CGC 9.8.`;
  } else {
    finAnalysis = "Secondary market transactions reflect continuous collector institutional liquidity for both foundational keys.";
  }

  // Check matching dream matchup for lore
  const matchConfig = CANONICAL_DREAM_MATCHUPS.find(
    (m) =>
      (m.heroA.toLowerCase() === heroA.name.toLowerCase() && m.heroB.toLowerCase() === heroB.name.toLowerCase()) ||
      (m.heroB.toLowerCase() === heroA.name.toLowerCase() && m.heroA.toLowerCase() === heroB.name.toLowerCase())
  );

  return {
    contenderA: heroA,
    contenderB: heroB,
    winner,
    loser,
    winProbabilityA: winProbA,
    winProbabilityB: winProbB,
    tacticalAnalysis: tactical,
    financialAdvantage: {
      higherValueHero: higherHero,
      valueDifference98: diffVal,
      analysis: finAnalysis,
    },
    rounds,
    historicCanonCrossed: !!matchConfig,
    crossoverContext:
      matchConfig?.canonHistory ||
      "HISTORIC MULTIVERSE FIRST: This exact 1-on-1 battle has never occurred in official Marvel or DC canonical continuity.",
  };
}

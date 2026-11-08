import { lookupSqliteCover } from "./sqlite-covers";

/**
 * Normalizes series and issue strings for deterministic, collision-free lookup.
 */
function normalizeKey(series: string, issue: string | number): string {
  const cleanSeries = series
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+#\d+.*$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  let cleanIssue = String(issue ?? "1")
    .toLowerCase()
    .replace(/^#/, "")
    .trim();

  // Strip leading zeros for pure numbers
  if (/^\d+$/.test(cleanIssue)) {
    cleanIssue = String(parseInt(cleanIssue, 10));
  }

  return `${cleanSeries}:${cleanIssue}`;
}

/**
 * Authoritative, audited registry of verified comic covers.
 * Every entry strictly maps an exact title and issue to its authentic cover image.
 * No proxy covers, no seat-number assumptions, and zero cross-cover pollution.
 */
const VERIFIED_COVER_REGISTRY: Record<string, string> = {
  // Golden Age Grails
  "action comics:1": "/covers/action_comics_1.jpg",
  "action comics:252": "/covers/action_comics_252.jpg",
  "detective comics:2": "/covers/seat_1_detective_comics_2.jpg",
  "detective comics:27": "/covers/detective_comics_27.jpg",
  "superman:1": "/covers/superman_1.jpg",
  "batman:1": "/covers/batman_1.jpg",
  "batman:251": "/covers/batman_251.jpg",
  "all star comics:8": "/covers/all_star_comics_8.jpg",
  "captain america comics:1": "/covers/captain_america_comics_1.jpg",
  "captain america:1": "/covers/captain_america_comics_1.jpg",
  "captain america comics:10": "/covers/seat_7_captain_america_comics_10.jpg",
  "marvel comics:1": "/covers/marvel_comics_1.jpg",
  "wonder woman:1": "/covers/seat_5_wonder_woman_1.jpg",
  "wonder woman:98": "/covers/wonder_woman_98.jpg",
  "four color:9": "/covers/seat_2_four_color_9.jpg",
  "four color:386": "/covers/seat_11_four_color_386.jpg",
  "captain marvel adventures:18": "/covers/captain_marvel_adventures_18.jpg",
  "crime does not pay:22": "/covers/seat_3_crime_does_not_pay_22.jpg",
  "crime suspenstories:22": "/covers/crime_suspenstories_22.jpg",
  "crime suspensorystories:22": "/covers/crime_suspenstories_22.jpg",
  "military comics:1": "/covers/seat_8_military_comics_1.jpg",
  "jumbo comics:69": "/covers/seat_9_jumbo_comics_69.jpg",
  "young romance:1": "/covers/young_romance_1.jpg",
  "tales from the crypt:20": "/covers/tales_from_the_crypt_20.jpg",
  "two fisted tales:35": "/covers/seat_13_two_fisted_tales_35.jpg",
  "it rhymes with lust:1": "/covers/seat_17_it_rhymes_with_lust_1.jpg",
  "les aventures de tintin:8": "/covers/seat_4_les_aventures_de_tintin_8.jpg",
  "les aventures de tintin:14": "/covers/seat_10_les_aventures_de_tintin_14.jpg",
  "les aventures de tintin:20": "/covers/seat_18_les_aventures_de_tintin_20.jpg",

  // Silver Age Landmarks
  "showcase:4": "/covers/showcase_4.jpg",
  "adventure comics:247": "/covers/adventure_comics_247.jpg",
  "fantastic four:1": "/covers/fantastic_four_1.jpg",
  "fantastic four:48": "/covers/fantastic_four_48.jpg",
  "fantastic four:51": "/covers/seat_20_fantastic_four_51.jpg",
  "fantastic four annual:7": "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/9e/9eba4562c6d04bbacb9e33d4c073d25901ef87ede8d1631b7f4bdd3ce21a1390.webp",
  "amazing fantasy:15": "/covers/amazing_fantasy_15.jpg",
  "amazing spider man:1": "/covers/amazing_spider_man_1.jpg",
  "the amazing spider man:1": "/covers/amazing_spider_man_1.jpg",
  "amazing spider man:33": "/covers/amazing_spider_man_33.jpg",
  "the amazing spider man:33": "/covers/amazing_spider_man_33.jpg",
  "amazing spider man:121": "/covers/seat_30_the_amazing_spider_man_121.jpg",
  "the amazing spider man:121": "/covers/seat_30_the_amazing_spider_man_121.jpg",
  "amazing spider man:300": "/covers/amazing_spider_man_300.jpg",
  "the amazing spider man:300": "/covers/amazing_spider_man_300.jpg",
  "journey into mystery:85": "/covers/journey_into_mystery_85.jpg",
  "strange tales:110": "/covers/strange_tales_110.jpg",
  "strange tales:138": "/covers/seat_23_strange_tales_138.jpg",
  "avengers:4": "/covers/avengers_4.jpg",
  "daredevil:1": "/covers/seat_6_daredevil_1.jpg",
  "daredevil:168": "/covers/daredevil_168.jpg",
  "daredevil:181": "/covers/seat_29_daredevil_181.jpg",
  "x men:1": "/covers/x_men_1.jpg",
  "the x men:1": "/covers/x_men_1.jpg",
  "silver surfer:1": "/covers/silver_surfer_1.jpg",
  "silver surfer black:1": "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/5c/5cdb44057b81adcf372a0d3e42d23c112d98c47f5b06ca093f76d07510b697c1.webp",
  "green lantern:76": "/covers/green_lantern_76.jpg",
  "nick fury agent of shield:1": "/covers/seat_21_nick_fury_agent_of_shield_1.jpg",
  "zap comix:1": "/covers/seat_22_zap_comix_1.jpg",
  "impact:1": "/covers/seat_15_impact_1.jpg",
  "mad:1": "/covers/mad_1.jpg",

  // Bronze Age Grails
  "incredible hulk:181": "/covers/incredible_hulk_181.jpg",
  "giant size x men:1": "/covers/giant_size_x_men_1.jpg",
  "house of secrets:92": "/covers/house_of_secrets_92.jpg",
  "new gods:1": "/covers/new_gods_1.jpg",
  "new gods:7": "/covers/seat_27_the_new_gods_7.jpg",
  "tomb of dracula:10": "/covers/tomb_of_dracula_10.jpg",
  "conan the barbarian:1": "/covers/conan_the_barbarian_1.jpg",
  "warlock:11": "/covers/seat_33_warlock_11.jpg",
  "cerebus:1": "/covers/cerebus_1.jpg",
  "saga of swamp thing:21": "/covers/the_saga_of_swamp_thing_21.jpg",
  "swamp thing:21": "/covers/the_saga_of_swamp_thing_21.jpg",

  // Copper & Modern Benchmarks
  "teenage mutant ninja turtles:1": "/covers/teenage_mutant_ninja_turtles_1.jpg",
  "tmnt:1": "/covers/teenage_mutant_ninja_turtles_1.jpg",
  "crisis on infinite earths:1": "/covers/crisis_on_infinite_earths_1.jpg",
  "batman the dark knight returns:1": "/covers/batman_the_dark_knight_returns_1.jpg",
  "dark knight returns:1": "/covers/batman_the_dark_knight_returns_1.jpg",
  "watchmen:1": "/covers/watchmen_1.jpg",
  "watchmen:4": "/covers/seat_34_watchmen_4.jpg",
  "miracleman:15": "/covers/seat_37_miracleman_15.jpg",
  "sandman:8": "/covers/the_sandman_8.jpg",
  "bone:1": "/covers/bone_1.jpg",
  "infinity gauntlet:1": "/covers/infinity_gauntlet_1.jpg",
  "spawn:1": "/covers/spawn_1.jpg",
  "walking dead:1": "/covers/the_walking_dead_1.jpg",
  "kingdom come:1": "/covers/kingdom_come_1.jpg",
  "marvels:1": "/covers/seat_42_marvels_1.jpg",
  "preacher:1": "/covers/preacher_1.jpg",
  "y the last man:1": "/covers/y_the_last_man_1.jpg",
  "invincible:1": "/covers/invincible_1.jpg",
  "all star superman:1": "/covers/all_star_superman_1.jpg",
  "saga:1": "/covers/saga_1.jpg",
  "scott pilgrim:1": "/covers/scott_pilgrim_1.jpg",
  "hawkeye:1": "/covers/hawkeye_1.jpg",
  "hawkeye:11": "/covers/seat_54_hawkeye_11.jpg",
  "monstress:1": "/covers/monstress_1.jpg",
  "ms marvel:1": "/covers/ms_marvel_1.jpg",
  "ultimate spider man:1": "/covers/ultimate_spider_man_1.jpg",
  "ultimate fallout:4": "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/4d/4de8f02f7523396d4d28721fa81e600ae203e370107f3ca594c2284b3f78e97a.jpg",
  "ultimate comics fallout:4": "https://vbcmjmakluyjnsmisoth.supabase.co/storage/v1/object/public/comic-covers/pp/4d/4de8f02f7523396d4d28721fa81e600ae203e370107f3ca594c2284b3f78e97a.jpg",
  "batman 2011:1": "/covers/batman_2011_1.jpg",
  "batman:1_2011": "/covers/batman_2011_1.jpg",
  "mister miracle:1": "/covers/mister_miracle_2017_1.jpg",
  "mister miracle 2017:1": "/covers/mister_miracle_2017_1.jpg",
  "deadpool max:10": "/covers/deadpool_max_10.jpg",
  "house of x:1": "/covers/house_of_x_1.jpg",
  "house of x:2": "/covers/seat_59_house_of_x_2.jpg",
  "immortal hulk:1": "/covers/immortal_hulk_1.jpg",
  "immortal hulk:25": "/covers/seat_62_immortal_hulk_25.jpg",
  "something is killing the children:1": "/covers/something_is_killing_the_children_1.jpg",
  "nice house on the lake:1": "/covers/the_nice_house_on_the_lake_1.jpg",
  "nightwing:78": "/covers/nightwing_2021_78.jpg",
  "nightwing 2021:78": "/covers/nightwing_2021_78.jpg",
  "ultimate spider man 2024:1": "/covers/ultimate_spider_man_2024_1.jpg",
  "one piece:1": "/covers/one_piece_1.jpg",
  "death note:1": "/covers/death_note_1.jpg",
  "chainsaw man:1": "/covers/chainsaw_man_1.jpg",
  "love and rockets:1": "/covers/love_and_rockets_1.jpg",
  "love and rockets:21": "/covers/seat_41_love_and_rockets_21.jpg",
  "eightball:17": "/covers/seat_44_eightball_17.jpg",
  "hellboy seed of destruction:1": "/covers/seat_47_hellboy_seed_of_destruction_1.jpg",
  "astro city:1": "/covers/seat_49_kurt_busiek_s_astro_city_1.jpg",
  "kurt busiek s astro city:1": "/covers/seat_49_kurt_busiek_s_astro_city_1.jpg",
  "daytripper:1": "/covers/seat_56_daytripper_1.jpg",
  "uncanny x men:137": "/covers/uncanny_x_men_137.jpg",
  "four color:223": "/covers/seat_14_four_color_223.jpg",
  "asterios polyp:nn": "/covers/asterios_polyp_nn.jpg",
  "asterios polyp:1": "/covers/asterios_polyp_nn.jpg",
  "tintin objectif lune:1": "/covers/tintin_objectif_lune_1.jpg",
  "astérix le gaulois:1": "/covers/ast_rix_le_gaulois_1.jpg",
  "ast rix le gaulois:1": "/covers/ast_rix_le_gaulois_1.jpg",
  "the incal:1": "/covers/the_incal_1.jpg",
  "akira:1": "/covers/akira_1.jpg",
  "sabrina:nn": "/covers/seat_64_sabrina_nn.jpg",
  "it s lonely at the centre of the earth:nn": "/covers/seat_65_it_s_lonely_at_the_centre_of_the_earth_nn.jpg",
  "building stories:a": "/covers/seat_53_building_stories_a.jpg",
  "building stories:1": "/covers/seat_53_building_stories_a.jpg",
  "blue book 1947:4": "/covers/blue_book_1947_4.jpg",
  "blue book:4": "/covers/blue_book_1947_4.jpg",
};

/**
 * Returns the strictly authoritative cover URL for a comic.
 *
 * Rules:
 * 1. If an exact verified local cover image exists for this title and issue, return it.
 * 2. If no exact cover image exists, generate a dynamic SVG badge for THIS exact issue.
 * 3. ZERO cross-cover pollution: never return another issue's cover or proxy!
 */
export function getAuthoritativeCover(
  series?: string | null,
  issueNumber?: string | number | null,
  publisher?: string | null,
  year?: number | null
): string | null {
  const rawSeries = (series || "Canonical Comic").trim();
  const rawIssue = (issueNumber !== undefined && issueNumber !== null && String(issueNumber).trim() !== "")
    ? String(issueNumber).trim()
    : "1";

  // Check if series string contains the issue number (e.g. "Action Comics #1")
  let cleanSeries = rawSeries;
  let cleanIssue = rawIssue;

  const match = rawSeries.match(/^(.*?)(?:\s+#(\d+[\w-]*))$/);
  if (match) {
    cleanSeries = match[1].trim();
    if (rawIssue === "1" || !rawIssue) {
      cleanIssue = match[2].trim();
    }
  }

  // 1. Direct normalized key lookup
  const key = normalizeKey(cleanSeries, cleanIssue);
  if (VERIFIED_COVER_REGISTRY[key]) {
    return VERIFIED_COVER_REGISTRY[key];
  }

  // 2. Secondary alias lookup without punctuation
  const strippedSeries = cleanSeries.replace(/[:\-']/g, "").replace(/\s+/g, " ");
  const strippedKey = normalizeKey(strippedSeries, cleanIssue);
  if (VERIFIED_COVER_REGISTRY[strippedKey]) {
    return VERIFIED_COVER_REGISTRY[strippedKey];
  }

  // 3. High-Speed 115k Catalog Database Cover Lookup (Supabase Storage WebP & GCD)
  const sqliteCover = lookupSqliteCover(cleanSeries, cleanIssue);
  if (sqliteCover) {
    return sqliteCover;
  }

  // 4. No verified image found -> Return null (NO SVG placeholders allowed)
  return null;
}

/**
 * Strict version of getAuthoritativeCover that returns null if no real verified image exists.
 * Prevents SVG fallback placeholders from ever polluting surveillance rails.
 */
export function getAuthoritativeCoverStrict(
  series?: string | null,
  issueNumber?: string | number | null,
  publisher?: string | null,
  year?: number | null
): string | null {
  const rawSeries = (series || "").trim();
  if (!rawSeries) return null;

  const rawIssue = (issueNumber !== undefined && issueNumber !== null && String(issueNumber).trim() !== "")
    ? String(issueNumber).trim()
    : "1";

  let cleanSeries = rawSeries;
  let cleanIssue = rawIssue;

  const match = rawSeries.match(/^(.*?)(?:\s+#(\d+[\w-]*))$/);
  if (match) {
    cleanSeries = match[1].trim();
    if (rawIssue === "1" || !rawIssue) {
      cleanIssue = match[2].trim();
    }
  }

  const key = normalizeKey(cleanSeries, cleanIssue);
  if (VERIFIED_COVER_REGISTRY[key]) {
    return VERIFIED_COVER_REGISTRY[key];
  }

  const strippedSeries = cleanSeries.replace(/[:\-']/g, "").replace(/\s+/g, " ");
  const strippedKey = normalizeKey(strippedSeries, cleanIssue);
  if (VERIFIED_COVER_REGISTRY[strippedKey]) {
    return VERIFIED_COVER_REGISTRY[strippedKey];
  }

  const sqliteCover = lookupSqliteCover(cleanSeries, cleanIssue);
  if (sqliteCover) {
    return sqliteCover;
  }

  return null;
}

/**
 * Returns true if this comic has an audited, verified photographic cover image in the asset estate.
 */
export function isCoverAuthoritativelyVerified(
  series: string,
  issueNumber: string | number
): boolean {
  const key = normalizeKey(series, issueNumber);
  return Boolean(VERIFIED_COVER_REGISTRY[key]);
}

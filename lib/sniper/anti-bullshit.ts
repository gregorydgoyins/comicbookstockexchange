import { ComicEra, GradingCompany, SniperFilterProfile } from "./types";

// Blacklisted keywords that immediately disqualify a listing as modern reprint / toy / giveaway
const REPRINT_REJECTIONS = [
  "facsimile",
  "reprint",
  "replica",
  "tribute edition",
  "golden record",
  "true believers",
  "millennium edition",
  "free comic book day",
  "fcbd",
  "pocket digest",
  "digest size",
  "mini comic",
  "mini-comic",
  "giveaway",
  "halloween comicfest",
  "loot crate",
  "marvel legends pack-in",
  "newspaper insert",
  "poster book",
  "sample",
];

// Deceased & Legendary comic creators whose verified signatures command permanent premium
export const LEGENDARY_CREATORS = [
  "stan lee",
  "jack kirby",
  "steve ditko",
  "george perez",
  "george pérez",
  "neal adams",
  "bernie wrightson",
  "john buscema",
  "len wein",
  "carmine infantino",
  "joe kubert",
  "dave cockrum",
  "curt swan",
  "jim aparo",
  "tim sale",
  "kevin o'neill",
];

// Misspelled Comic Title Patterns (Stealth typos that hide listings from general buyer searches)
export const MISSPELLED_PATTERNS: Array<{ pattern: RegExp; correct: string }> = [
  { pattern: /\b(spidre-?man|spiderman|spidermn)\b/i, correct: "Spider-Man" },
  { pattern: /\b(wolvarine|wovlerine|wolverine\s*#?\s*1(?=.*wovle))\b/i, correct: "Wolverine" },
  { pattern: /\b(x-?men(?!\s*#|\s*\d))\b/i, correct: "X-Men" },
  { pattern: /\b(batmn|bat-man)\b/i, correct: "Batman" },
  { pattern: /\b(supermna|sperman)\b/i, correct: "Superman" },
  { pattern: /\b(avangers|advengers)\b/i, correct: "Avengers" },
  { pattern: /\b(carnge)\b/i, correct: "Carnage" },
  { pattern: /\b(spawnn)\b/i, correct: "Spawn" },
  { pattern: /\b(mcfarlen|mcfarland)\b/i, correct: "McFarlane" },
  { pattern: /\b(fantatsic|fatastic)\b/i, correct: "Fantastic" },
  { pattern: /\b(punsiher|punshier)\b/i, correct: "Punisher" },
  { pattern: /\b(catwman|cat-woman)\b/i, correct: "Catwoman" },
  { pattern: /\b(daredevl|dare-devil)\b/i, correct: "Daredevil" },
  { pattern: /\b(dective\s*comics|detectve)\b/i, correct: "Detective Comics" },
  { pattern: /\b(action\s*comcs)\b/i, correct: "Action Comics" },
  { pattern: /\b(invisable)\b/i, correct: "Invisible" },
];

export const CRACKED_CASE_REGEX = /\b(crack(?:ed)?\s*(?:case|slab|holder|plastic|corner|shell)|scuff(?:ed)?\s*case|reholder\s*(?:candidate|play)?|scratched\s*holder|broken\s*case|damaged\s*(?:slab|case|holder)|case\s*crack)\b/i;

export function normalizeAuctionTitle(rawTitle: string): string {
  if (!rawTitle) return "Unknown Comic";

  let title = rawTitle;

  // 1. Remove prominent noise and seller spam tags
  title = title
    .replace(/\b(?:1\s*of\s*only\s*\d+\s*on\s*census!?|highest\s*graded|boston\s*pedigree!?|white\s*pages|off-white|pages)\b/gi, "")
    .replace(/\b(?:hot!?|key!?|rare!?|grail!?|l@@k|look!?|wow!?|must\s*see!?|invest!?)\b/gi, "")
    .replace(/\b(?:lot\s*[a-z0-9]|lot\s*#?\d+)\b/gi, "")
    .replace(/\b(?:nm\/?m?|vf\/?nm?|fn|vg|gd|pr)\b/gi, "")
    .replace(/\b(?:cgc|cbcs|pgx)\s*(?:10(?:\.0)?|9\.[0-9]|8\.[0-9]|7\.[0-9]|6\.[0-9]|5\.[0-9]|4\.[0-9]|3\.[0-9]|2\.[0-9]|1\.[0-9]|0\.5)\b/gi, "")
    .replace(/[-*•~_]{2,}/g, " ")
    .replace(/[*•~]+/g, " ");

  // 2. Remove prefixes & weird punctuation
  title = title
    .replace(/^Marvel Comic\s+/i, "")
    .replace(/^DC\s+/i, "")
    .replace(/\s*-\s*Supe$/i, "")
    .replace(/\s*,\s*19\d{2}\b/g, "")
    .replace(/\s*,\s*20\d{2}\b/g, "")
    .replace(/\s*-\s*$/i, "")
    .replace(/#\s+/g, "#");

  // 3. Fix merged text e.g. "halo:uprising#2" -> "Halo: Uprising #2"
  title = title.replace(/:([a-zA-Z])/g, ": $1");
  title = title.replace(/([a-zA-Z])#(\d+)/g, "$1 #$2");

  // 4. Clean trailing garbage & whitespace
  title = title
    .replace(/\s+/g, " ")
    .replace(/^[-*–—\s,]+|[-*–—\s,]+$/g, "")
    .trim();

  // 5. Title case if all-caps
  if (title === title.toUpperCase() && title.length > 4) {
    title = title
      .toLowerCase()
      .split(" ")
      .map((w, idx) => {
        if (idx > 0 && ["and", "the", "of", "in", "on", "a", "an", "to", "for", "by", "with"].includes(w)) {
          return w;
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }

  return title.trim();
}

export interface TitleParseResult {
  isCertifiedSlab: boolean;
  gradingCompany: GradingCompany | null;
  grade: number | null;
  isReprintOrToy: boolean;
  reprintTrigger?: string;
  isDamagedSlab: boolean;
  isCrackAndPressCandidate: boolean;
  isCrackedCase: boolean;
  isMisspelled: boolean;
  misspellingSnippet?: string;
  normalizedTitle: string;
  isNewsstand: boolean;
  isConvention: boolean;
  isSigned: boolean;
  signatureCount: number;
  isLegendarySigned: boolean;
  signer?: string;
  certNumber?: string;
  certLookupUrl?: string;
  extractedSeries: string;
  extractedIssue: string;
  extractedYear?: number;
  extractedEra: ComicEra;
}

export function parseAndFilterListing(
  title: string,
  description: string = "",
  graderNotes: string = ""
): TitleParseResult {
  const fullText = `${title} ${description} ${graderNotes}`.toLowerCase();

  // 1. Check for Reprints / Mini-comics / Giveaways
  let isReprintOrToy = false;
  let reprintTrigger: string | undefined;

  for (const term of REPRINT_REJECTIONS) {
    if (fullText.includes(term)) {
      isReprintOrToy = true;
      reprintTrigger = term;
      break;
    }
  }

  // 2. Certification & Grade Extraction (CGC / CBCS)
  let gradingCompany: GradingCompany | null = null;
  let grade: number | null = null;
  let isCertifiedSlab = false;

  if (/\bcgc\b/i.test(title)) {
    gradingCompany = "CGC";
    isCertifiedSlab = true;
  } else if (/\bcbcs\b/i.test(title)) {
    gradingCompany = "CBCS";
    isCertifiedSlab = true;
  } else if (/\bpsa\b/i.test(title)) {
    gradingCompany = "PSA";
    isCertifiedSlab = true;
  } else if (/\bpgx\b/i.test(title)) {
    gradingCompany = "PGX";
    isCertifiedSlab = true;
  }

  // Extract Grade: e.g. 10, 9.9, 9.8, 9.6, 9.4, 9.2, 9.0, 8.5
  const gradeMatch = title.match(/\b(10(?:\.0)?|9\.[0-9]|8\.[0-9]|7\.[0-9]|6\.[0-9]|5\.[0-9]|4\.[0-9]|3\.[0-9]|2\.[0-9]|1\.[0-9]|0\.5)\b/);
  if (gradeMatch) {
    grade = parseFloat(gradeMatch[1]);
  }

  // 2b. Extract Certification Number (CGC / CBCS / PSA cert #)
  let certNumber: string | undefined;
  let certLookupUrl: string | undefined;

  const certMatch = fullText.match(/\b(?:cert(?:ification)?|cgc|cbcs|psa|pgx)?\s*(?:#|no\.?|number)?\s*:?\s*([0-9]{7,10}(?:-[0-9]{3})?)\b/i);
  if (certMatch && certMatch[1] && certMatch[1].length >= 7) {
    certNumber = certMatch[1];
    const cleanCert = certNumber.replace(/[^0-9]/g, "");
    if (gradingCompany === "CBCS") {
      certLookupUrl = `https://www.cbcscomics.com/grading/verify-certification-number?cert_num=${cleanCert}`;
    } else if (gradingCompany === "PSA") {
      certLookupUrl = `https://www.psacard.com/cert/${cleanCert}`;
    } else if (gradingCompany === "PGX") {
      certLookupUrl = `https://pgxcomics.com/verify-cert/?cert=${cleanCert}`;
    } else {
      // Default to CGC lookup
      certLookupUrl = `https://www.cgccomics.com/certlookup/${cleanCert}/`;
    }
  }

  // 3. Damaged Slab / Cracked Case Angle
  const isCrackedCase = CRACKED_CASE_REGEX.test(fullText);
  const isDamagedSlab = isCrackedCase;

  // 3b. Misspelled Title Detection (Stealth typo sleeper play)
  let isMisspelled = false;
  let misspellingSnippet: string | undefined;

  for (const { pattern, correct } of MISSPELLED_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      isMisspelled = true;
      misspellingSnippet = `Listed as '${match[0]}' instead of '${correct}'`;
      break;
    }
  }

  // 4. Crack and Press Candidate Detection (pressable grader defects)
  const pressDefectRegex = /\b(non-color\s*breaking|light\s+bend|pressable|waviness|wavy\s+cover|finger\s+bend|light\s+indent|spine\s+roll|surface\s+dirt)\b/i;
  const isCrackAndPressCandidate = (grade !== null && grade >= 9.0 && grade <= 9.6) && pressDefectRegex.test(fullText);

  // 4b. Normalized Clean Title
  const normalizedTitle = normalizeAuctionTitle(title);

  // 5. Newsstand & Convention Edition Detection
  const isNewsstand = /\bnewsstand\b/i.test(fullText) || /\b(upc|barcode)\b/i.test(fullText);
  const isConvention = /\b(convention|con\s+exclusive|sdcc|nycc|eccc|c2e2)\b/i.test(fullText);

  // 6. Signature Detection & Multi-Sig Stacking
  let isSigned = false;
  let signatureCount = 0;
  let isLegendarySigned = false;
  let signer: string | undefined;

  const yellowLabel = /\b(signature\s+series|ss|yellow\s+label|gold\s+label|signed\s+by|signed|autographed)\b/i.test(fullText);
  if (yellowLabel) {
    isSigned = true;
    signatureCount = 1;
    // Check multi-sig counts in title/desc
    if (/\b(quad\s*signed|4x\s*signed|4\s*signatures|signed\s+by\s+4)\b/i.test(fullText)) {
      signatureCount = 4;
    } else if (/\b(triple\s*signed|3x\s*signed|3\s*signatures|signed\s+by\s+3)\b/i.test(fullText)) {
      signatureCount = 3;
    } else if (/\b(dual\s*signed|double\s*signed|2x\s*signed|2\s*signatures|signed\s+by\s+2)\b/i.test(fullText)) {
      signatureCount = 2;
    }

    for (const creator of LEGENDARY_CREATORS) {
      if (fullText.includes(creator)) {
        isLegendarySigned = true;
        signer = creator.toUpperCase();
        break;
      }
    }
  }

  // 7. Series & Issue Extraction
  let extractedSeries = "Unknown Series";
  let extractedIssue = "1";
  let extractedYear: number | undefined;

  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    extractedYear = parseInt(yearMatch[1], 10);
  }

  // Issue number match (e.g. #128, #7, No. 128, # 128)
  const hashMatch = title.match(/#\s*(\d+[a-zA-Z]?(?:\.\d+)?)/);
  if (hashMatch) {
    extractedIssue = hashMatch[1];
    const beforeHash = title.substring(0, title.indexOf("#"));
    const cleanedBefore = beforeHash
      .replace(/\b(cgc|cbcs|pgx)\b/gi, "")
      .replace(/\b(19\d{2}|20\d{2})\b/g, "")
      .replace(/\bvol(?:\.|ume)?\s*\d+/gi, "")
      .replace(/[\[\]\(\)\{\}]/g, "")
      .trim();
    if (cleanedBefore.length > 0) {
      extractedSeries = cleanedBefore;
    }
  } else {
    const noMatch = title.match(/\bno\.\s*(\d+)/i);
    if (noMatch) {
      extractedIssue = noMatch[1];
    }
  }

  // Check for independent / alternative publishers
  const isIndyPublisher = /\b(image|dark\s*horse|valiant|idw|boom|dynamite|vertigo|fantagraphics|mirage|pacific|kitchen\s*sink|malibu|eclipse|crossgen|avatar|oni\s*press)\b/i.test(fullText);

  // Determine Era with full canonical precision
  let extractedEra: ComicEra = "modern";
  if (isIndyPublisher && (extractedYear ? extractedYear >= 1980 : true)) {
    extractedEra = "indy";
  } else if (extractedYear) {
    if (extractedYear < 1938) extractedEra = "platinum";
    else if (extractedYear <= 1945) extractedEra = "golden";
    else if (extractedYear <= 1955) extractedEra = "atomic";
    else if (extractedYear <= 1969) extractedEra = "silver";
    else if (extractedYear <= 1983) extractedEra = "bronze";
    else if (extractedYear <= 1991) extractedEra = "copper";
    else if (extractedYear <= 2009) extractedEra = "modern";
    else extractedEra = "postmodern";
  } else {
    // Heuristic era fallback from series keywords
    if (/action comics|detective comics|batman|superman/i.test(title) && grade !== null && grade <= 9.2) {
      extractedEra = "silver";
    }
  }

  return {
    isCertifiedSlab,
    gradingCompany,
    grade,
    isReprintOrToy,
    reprintTrigger,
    isDamagedSlab,
    isCrackAndPressCandidate,
    isCrackedCase,
    isMisspelled,
    misspellingSnippet,
    normalizedTitle,
    isNewsstand,
    isConvention,
    isSigned,
    signatureCount,
    isLegendarySigned,
    signer,
    certNumber,
    certLookupUrl,
    extractedSeries,
    extractedIssue,
    extractedYear,
    extractedEra,
  };
}

export function getEraDisplayName(era: ComicEra): string {
  switch (era) {
    case "platinum":
      return "Platinum Age (<1938)";
    case "golden":
      return "Golden Age (1938-1945)";
    case "atomic":
      return "Atomic Age (1946-1955)";
    case "silver":
      return "Silver Age (1956-1969)";
    case "bronze":
      return "Bronze Age (1970-1983)";
    case "copper":
      return "Copper Age (1984-1991)";
    case "modern":
      return "Modern Age (1992-2009)";
    case "postmodern":
      return "Post-Modern (2010+)";
    case "indy":
      return "Indy / Alternative";
    default:
      return era;
  }
}

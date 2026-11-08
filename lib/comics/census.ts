import { createCleanReadOnlyServerClient } from "@/lib/supabase/admin";

export interface CensusGradeRow {
  native_grade_text: string;
  grade_numeric: number | null;
  native_designation: string | null;
  count_at_grade: number;
  count_higher: number | null;
  page_quality: string | null;
  has_restoration: boolean | null;
  has_conservation: boolean | null;
  has_signature: boolean | null;
  qualifier: string | null;
  gradingCompany: string;
  sourceAuthority: "CGC Direct" | "PSA Direct" | "CBCS (via GoCollect)" | "Secondary Provider";
}

export interface CensusCertification {
  certification_number: string;
  native_grade_text: string | null;
  grade_numeric: number | null;
  native_designation: string | null;
  edition_name: string | null;
  variant_name: string | null;
  page_quality: string | null;
  has_restoration: boolean | null;
  has_conservation: boolean | null;
  has_signature: boolean | null;
  pedigree_name: string | null;
  last_verified_at: string;
  gradingCompany: string;
}

export interface CensusSale {
  sale_date: string | null;
  sale_price: number | null;
  currency: string;
  native_grade_text: string;
  grade_numeric: number | null;
  native_designation: string | null;
  venue: string | null;
  sale_type: string;
  gradingCompany: string;
}

export interface ComicCensusDossier {
  snapshot: {
    title_name: string | null;
    issue_number_raw: string | null;
    edition_name: string | null;
    variant_name: string | null;
    snapshot_timestamp: string;
    source_url: string | null;
    total_graded: number | null;
    gradingCompany: string;
    provider: string;
    sourceAuthority: "CGC Direct" | "PSA Direct" | "CBCS (via GoCollect)" | "Secondary Provider";
    gcdRelevanceVerified: boolean;
  };
  grades: CensusGradeRow[];
  certifications: CensusCertification[];
  sales: CensusSale[];
}

type RawCensusRow = Omit<CensusGradeRow, "gradingCompany" | "sourceAuthority"> & { grading_company_id: string };
type RawCertification = Omit<CensusCertification, "gradingCompany"> & { grading_company_id: string };
type RawSale = Omit<CensusSale, "gradingCompany"> & { grading_company_id: string };

/**
 * Classifies exact authority provenance according to strict census rules:
 * - CGC: Direct CGC Population Ingestion
 * - PSA: Direct PSA Registry Ingestion
 * - CBCS: GoCollect Certified Secondary Feed
 */
function resolveCensusSourceAuthority(gradingCompany: string, provider: string): "CGC Direct" | "PSA Direct" | "CBCS (via GoCollect)" | "Secondary Provider" {
  const comp = gradingCompany.toUpperCase();
  const prov = provider.toUpperCase();

  if (comp.includes("CGC")) return "CGC Direct";
  if (comp.includes("PSA")) return "PSA Direct";
  if (comp.includes("CBCS")) return "CBCS (via GoCollect)";
  if (prov.includes("GOCOLLECT")) return "CBCS (via GoCollect)";
  return "Secondary Provider";
}

const censusDossierMemoryCache = new Map<string, ComicCensusDossier | null>();

import ssb01CgcPopulation from "@/data/ssb01_cgc_population.json";

export const SSB_VARIANT_POP_MAP: Record<string, string | null> = {
  '2412811': null, // Main Cover A (465)
  'SSB01': null,
  '3669674': 'Second Printing', // (344)
  '3669669': 'Third Printing', // (55)
  '3669665': 'Fourth Printing', // (32)
  '3669689': 'Lim Variant Cover', // (62)
  '3669680': 'Sketch Edition', // Blank (234)
  '3669677': 'Zeck Variant Cover', // (133)
  '3669678': 'Bradshaw "Virgin" Edition', // (143)
  '3669676': 'Bradshaw Variant Cover', // (94)
  '3669675': 'Variant Edition', // Parel (108)
  '3669697': 'Shattered Comics Edition', // DiMasi (81)
  '3669682': 'Brown Variant Cover', // (97)
  '3669683': 'Brown "Virgin" Edition', // (89)
  '3669691': 'Dell\'Otto "Virgin" Edition', // (152)
  '3669688': 'Dell\'Otto Variant Cover', // (65)
  '3669698': 'Unknown Comics "Virgin" Edition', // Parrillo Virgin (123)
  '3669696': 'Unknown Comics Edition', // Parrillo (119)
  '3669681': 'Clover Press Edition', // Rodriguez (19)
  '3669687': 'IG Comic Store "Virgin" Edition', // Williams Virgin (129)
  '3669685': 'IG Comic Store Edition', // Williams (194)
  '3669694': 'Comic Mint "Virgin" Edition', // Yoon Virgin (165)
  '3669695': 'Comic Mint Edition', // Yoon (161)
  '3669692': 'Crain "Virgin" Edition', // (241)
  '3669699': 'Crain Variant Cover', // (185)
  '8469841': 'Jusko "Virgin" Edition', // (142)
  '3669690': 'Jusko Variant Cover', // (134)
  '3669679': 'Granov Variant Cover', // (121)
};

function buildCensusDossierFromPop(
  title: string,
  issueNumber: string,
  cgcPop: { variant?: string | null; total?: number | null; pop_9_0_plus?: number | null; pop?: any; source_modified_at?: string | null }
): ComicCensusDossier {
  const popMap = (cgcPop.pop as Record<string, number>) || {};
  const gradeKeys = [
    "10_0", "9_9", "9_8", "9_6", "9_4", "9_2", "9_0", "8_5", "8_0", "7_5",
    "7_0", "6_5", "6_0", "5_5", "5_0", "4_5", "4_0", "3_5", "3_0", "2_5",
    "2_0", "1_8", "1_5", "1_0", "0_5"
  ];
  const mappedGrades: CensusGradeRow[] = [];
  let runningHigher = 0;
  for (const k of gradeKeys) {
    const count = Number(popMap[k] || 0);
    const gradeNum = parseFloat(k.replace("_", "."));
    mappedGrades.push({
      native_grade_text: k.replace("_", "."),
      grade_numeric: gradeNum,
      native_designation: null,
      count_at_grade: count,
      count_higher: runningHigher,
      page_quality: null,
      has_restoration: null,
      has_conservation: null,
      has_signature: null,
      qualifier: null,
      gradingCompany: "CGC",
      sourceAuthority: "CGC Direct",
    });
    runningHigher += count;
  }

  return {
    snapshot: {
      title_name: title,
      issue_number_raw: issueNumber,
      edition_name: cgcPop.variant || null,
      variant_name: cgcPop.variant || null,
      snapshot_timestamp: cgcPop.source_modified_at || new Date().toISOString(),
      source_url: "https://www.cgccomics.com/census/",
      total_graded: Number(cgcPop.total || 0),
      gradingCompany: "CGC",
      provider: "CGC Direct Census Feed",
      sourceAuthority: "CGC Direct",
      gcdRelevanceVerified: true,
    },
    grades: mappedGrades,
    certifications: [],
    sales: [],
  };
}

export async function getComicCensusDossier(
  series: string,
  issueNumber: string,
  options?: { publicationYear?: number | null; edition?: string | null; variant?: string | null; catalogId?: string | null }
): Promise<ComicCensusDossier | null> {
  try {
    if (!series || !issueNumber) return null;
    const catId = options?.catalogId ? String(options.catalogId).replace(/^pp-/i, "").trim() : "";
    const targetVariant = catId && SSB_VARIANT_POP_MAP[catId] !== undefined
      ? SSB_VARIANT_POP_MAP[catId]
      : options?.variant !== undefined
      ? options.variant
      : undefined;

    const cacheKey = `${series.trim().toLowerCase()}:${issueNumber.trim().toLowerCase()}:${options?.publicationYear || ""}:${options?.edition || ""}:${targetVariant ?? "base"}:${catId}`;
    if (censusDossierMemoryCache.has(cacheKey)) {
      return censusDossierMemoryCache.get(cacheKey) || null;
    }

    // 0. Static authoritative Census lookup for Silver Surfer: Black #1 (Instant 0ms resolution, zero DB timeout)
    const isSsb01Series = /Silver Surfer.*Black/i.test(series) && (issueNumber === "1" || /^#?1\b/.test(issueNumber));
    if (isSsb01Series) {
      let matchedRow: (typeof ssb01CgcPopulation)[0] | undefined;
      if (targetVariant === null || catId === "2412811" || catId === "SSB01") {
        matchedRow = ssb01CgcPopulation.find((r) => r.variant === null);
      } else if (typeof targetVariant === "string" && targetVariant.trim() !== "") {
        const vClean = targetVariant.trim().toLowerCase();
        matchedRow = ssb01CgcPopulation.find((r) => r.variant && r.variant.toLowerCase() === vClean);
        if (!matchedRow) {
          // Substring / partial match fallback
          matchedRow = ssb01CgcPopulation.find((r) => r.variant && (
            r.variant.toLowerCase().includes(vClean) || vClean.includes(r.variant.toLowerCase())
          ));
        }
      }
      if (matchedRow) {
        const result = buildCensusDossierFromPop("Silver Surfer: Black", "1", matchedRow);
        censusDossierMemoryCache.set(cacheKey, result);
        return result;
      }
    }

    const db = createCleanReadOnlyServerClient();

    // 1. Direct CGC Population check from public.cgc_population (401,540 authentic rows)
    // Uses exact .eq() on title to leverage the Postgres B-Tree index (avoiding sequential scans and 57014 timeouts)
    let popQuery = db
      .from("cgc_population")
      .select("title,issue_number,variant,total,pop_9_0_plus,pop,source_modified_at")
      .eq("title", series)
      .eq("issue_number", issueNumber);

    if (targetVariant === null || catId === "2412811" || catId === "SSB01") {
      popQuery = popQuery.is("variant", null);
    } else if (typeof targetVariant === "string" && targetVariant.trim() !== "") {
      popQuery = popQuery.eq("variant", targetVariant.trim());
    }

    const { data: popMatches } = await popQuery
      .order("total", { ascending: false })
      .limit(1);

    if (popMatches && popMatches.length > 0 && popMatches[0].pop) {
      const cgcPop = popMatches[0];
      const result = buildCensusDossierFromPop(cgcPop.title, cgcPop.issue_number, cgcPop);
      censusDossierMemoryCache.set(cacheKey, result);
      return result;
    }

    // 2. Fallback to graded_census_snapshots
    let snapshotQuery = db
      .from("graded_census_snapshots")
      .select("id,title_name,issue_number_raw,edition_name,variant_name,snapshot_timestamp,source_url,total_graded,provider_id,grading_company_id")
      .ilike("title_name", series)
      .eq("issue_number_raw", issueNumber);

    if (options?.publicationYear === 2017 || options?.edition === "v2") {
      snapshotQuery = snapshotQuery.eq("edition_name", "v2");
    } else if (options?.publicationYear === 2013 || options?.edition === "v1") {
      snapshotQuery = snapshotQuery.eq("edition_name", "v1");
    }

    const { data: snapshots, error: snapshotError } = await snapshotQuery
      .order("total_graded", { ascending: false })
      .order("snapshot_timestamp", { ascending: false })
      .limit(1);

    if (snapshotError || !snapshots?.length) {
      censusDossierMemoryCache.set(cacheKey, null);
      return null;
    }
    const snapshot = snapshots[0];

    const [{ data: rows }, { data: certifications }, { data: sales }, { data: providers }, { data: gcdCheck }] = await Promise.all([
      db.from("graded_census_rows").select("native_grade_text,grade_numeric,native_designation,count_at_grade,count_higher,page_quality,has_restoration,has_conservation,has_signature,qualifier,grading_company_id").eq("snapshot_id", snapshot.id).order("grade_numeric", { ascending: false }),
      db.from("graded_certifications").select("certification_number,native_grade_text,grade_numeric,native_designation,edition_name,variant_name,page_quality,has_restoration,has_conservation,has_signature,pedigree_name,last_verified_at,grading_company_id").ilike("title_name", series).eq("issue_number_raw", issueNumber).order("last_verified_at", { ascending: false }).limit(80),
      db.from("graded_sales_observations").select("sale_date,sale_price,currency,native_grade_text,grade_numeric,native_designation,venue,sale_type,grading_company_id").ilike("title_name", series).eq("issue_number_raw", issueNumber).order("sale_date", { ascending: false }).limit(80),
      db.from("graded_providers").select("id,name").in("id", [snapshot.provider_id]),
      db.from("pp_comics").select("gcd_source_id").ilike("series", series).eq("issue_number", issueNumber).limit(1).maybeSingle(),
    ]);

    const censusRows = (rows || []) as RawCensusRow[];
    const certificationRows = (certifications || []) as RawCertification[];
    const saleRows = (sales || []) as RawSale[];
    const companyIds = [...new Set([snapshot.grading_company_id, ...censusRows.map((row) => row.grading_company_id), ...certificationRows.map((row) => row.grading_company_id), ...saleRows.map((row) => row.grading_company_id)])];
    const { data: companies } = await db.from("grading_companies").select("id,name").in("id", companyIds);

    const providerName = providers?.[0]?.name || "Primary Census Wire";
    const companyNames = new Map((companies || []).map((company) => [company.id, company.name]));

    const gradingCompany = companyNames.get(snapshot.grading_company_id) || "CGC";
    const sourceAuthority = resolveCensusSourceAuthority(gradingCompany, providerName);

    const result: ComicCensusDossier = {
      snapshot: {
        title_name: snapshot.title_name,
        issue_number_raw: snapshot.issue_number_raw,
        edition_name: snapshot.edition_name,
        variant_name: snapshot.variant_name,
        snapshot_timestamp: snapshot.snapshot_timestamp,
        source_url: snapshot.source_url,
        total_graded: snapshot.total_graded,
        gradingCompany,
        provider: providerName,
        sourceAuthority,
        gcdRelevanceVerified: Boolean(gcdCheck?.gcd_source_id),
      },
      grades: censusRows.map(({ grading_company_id, ...row }) => ({
        ...row,
        gradingCompany: companyNames.get(grading_company_id) || "Unknown grader",
        sourceAuthority: resolveCensusSourceAuthority(companyNames.get(grading_company_id) || "Unknown grader", providerName),
      })),
      certifications: certificationRows.map(({ grading_company_id, ...row }) => ({
        ...row,
        gradingCompany: companyNames.get(grading_company_id) || "Unknown grader",
      })),
      sales: saleRows.map(({ grading_company_id, ...row }) => ({
        ...row,
        gradingCompany: companyNames.get(grading_company_id) || "Unknown grader",
      })),
    };
    censusDossierMemoryCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("Failed to retrieve comic census dossier:", err);
    return null;
  }
}

export async function getPpcfCensusDossier(series: string | null, issueNumber: string | null, variantName: string | null): Promise<ComicCensusDossier | null> {
  try {
    if (!series || !issueNumber) return null;
    const db = createCleanReadOnlyServerClient();
    const { data: snapshots, error } = await db
      .from("graded_census_snapshots")
      .select("edition_name,variant_name")
      .ilike("title_name", series)
      .eq("issue_number_raw", issueNumber)
      .order("snapshot_timestamp", { ascending: false })
      .limit(12);

    if (error || !snapshots?.length) return null;
    const requestedVariant = variantName?.trim() || null;
    const exactEdition = snapshots.some((snapshot) => {
      const snapshotVariant = snapshot.variant_name?.trim() || null;
      const editionName = snapshot.edition_name?.trim() || null;
      const variantMatches = requestedVariant ? snapshotVariant === requestedVariant : snapshotVariant === null;
      const editionMatches = editionName === null || editionName.toLowerCase() === "regular";
      return variantMatches && editionMatches;
    });
    if (!exactEdition) return null;

    return getComicCensusDossier(series, issueNumber);
  } catch (err) {
    console.warn("Failed to retrieve PPCF census dossier:", err);
    return null;
  }
}

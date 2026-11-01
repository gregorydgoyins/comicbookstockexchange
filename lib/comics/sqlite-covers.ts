let dbInstance: any = null;

function getSqliteDb() {
  if (typeof window !== "undefined") return null;
  if (dbInstance) return dbInstance;
  try {
    // eval('require') completely hides node native modules from webpack client bundle analysis
    const req = eval("require");
    const fs = req("fs");
    const path = req("path");
    const { DatabaseSync } = req("node:sqlite");

    const candidates = [
      path.join(process.cwd(), "public", "covers_direct_index.sqlite"),
      path.join(process.cwd(), "data", "highres_covers_all.sqlite"),
      path.join(process.cwd(), "data", "pp115k.sqlite"),
      path.join(process.cwd(), "panel-profits", "public", "covers_direct_index.sqlite"),
      path.join(process.cwd(), "panel-profits", "data", "highres_covers_all.sqlite"),
      path.join(process.cwd(), "panel-profits", "data", "pp115k.sqlite"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const absPath = path.resolve(p);
        try {
          const uri = `file:${absPath}?mode=ro&immutable=1`;
          dbInstance = new DatabaseSync(uri, { readOnly: true });
        } catch (_) {
          dbInstance = new DatabaseSync(absPath, { readOnly: true });
        }
        return dbInstance;
      }
    }
  } catch (err) {
    console.warn("node:sqlite bypassed in current execution environment:", err);
  }
  return null;
}

/**
 * High-speed authoritative cover lookup from the 115k catalog SQLite index.
 * Retrieves authentic Supabase Storage WebP covers and verified GCS covers.
 * Strictly avoids Cloudflare 403 GCD hotlinks and broken 526.jpg placeholders.
 */
export function lookupSqliteCover(series: string, issueNumber: string | number): string | null {
  if (typeof window !== "undefined") return null;
  const db = getSqliteDb();
  if (!db) return null;
  try {
    const rawSeries = String(series || "").trim();
    const cleanSeries = rawSeries.replace(/^the\s+/i, "").trim();
    const strippedSeries = cleanSeries.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
    const cleanIssue = String(issueNumber || "1").replace(/^#/, "").trim();

    // Candidate series variations for high-accuracy lookup
    const seriesCandidates = [cleanSeries, strippedSeries];
    if (cleanSeries.toLowerCase() === "swamp thing") {
      seriesCandidates.push("Saga of the Swamp Thing");
    } else if (cleanSeries.toLowerCase() === "uncanny x-men") {
      seriesCandidates.push("X-Men");
    } else if (cleanSeries.toLowerCase() === "walking dead") {
      seriesCandidates.push("The Walking Dead");
    }

    const sanitizeUrl = (url: string | null | undefined): string | null => {
      if (!url || typeof url !== "string") return null;
      let trimmed = url.trim();
      if (!trimmed || trimmed.includes("526.jpg") || trimmed.includes("files1.comics.org") || trimmed.includes("wikia.nocookie.net")) return null;
      while (trimmed.includes("%25")) {
        try { trimmed = decodeURI(trimmed); } catch { break; }
      }
      try {
        return encodeURI(decodeURI(trimmed));
      } catch {
        return trimmed;
      }
    };

    // 0. Try direct 839k ComicBase Google Cloud cover index (fastest, constant time microsecond lookup)
    try {
      const cleanT = cleanSeries.toLowerCase().replace(/,\s*the$/, "").replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
      const cleanI = cleanIssue.toLowerCase().replace(/[^a-z0-9]/g, "");
      const directKey = `${cleanT}:${cleanI}`;
      const cbRow = db.prepare(`SELECT gcs_path FROM comicbase_covers WHERE lookup_key = ? LIMIT 1`).get(directKey);
      if (cbRow && cbRow.gcs_path) {
        const fullGcsUrl = `https://storage.googleapis.com/panel-profits-covers-all/${cbRow.gcs_path.replace(/^Pictures\//, "Pictures/")}`;
        return fullGcsUrl;
      }
    } catch (_) {
      // Table may not exist if falling back to legacy db
    }

    // 1. Try verified_equities (Audited 42k sovereign & market assets with authentic WebP covers)
    try {
      for (const cand of seriesCandidates) {
        const ve = db.prepare(
          `SELECT cover_url FROM verified_equities 
           WHERE (series = ? OR series LIKE ? OR series LIKE ?) AND issue_number = ? 
           AND cover_url IS NOT NULL AND cover_url != ''
           ORDER BY CASE WHEN cover_url LIKE '%supabase.co%' THEN 0 ELSE 1 END
           LIMIT 1`
        ).get(cand, cand + "%", "%" + cand + "%", cleanIssue);

        const sanitized = sanitizeUrl(ve?.cover_url);
        if (sanitized) return sanitized;
      }
    } catch (_) {}

    // 2. Try highres_covers (Prioritizing high-resolution Supabase Storage WebP)
    try {
      for (const cand of seriesCandidates) {
        const hr = db.prepare(
          `SELECT cover_url FROM highres_covers 
           WHERE (series = ? OR series LIKE ? OR series LIKE ?) AND issue_number = ? 
           AND cover_url NOT LIKE '%526.jpg%'
           AND cover_url NOT LIKE '%files1.comics.org%'
           AND cover_url NOT LIKE '%wikia.nocookie%'
           ORDER BY CASE WHEN cover_url LIKE '%supabase.co%' THEN 0 ELSE 1 END 
           LIMIT 1`
        ).get(cand, cand + "%", "%" + cand + "%", cleanIssue);

        const sanitized = sanitizeUrl(hr?.cover_url);
        if (sanitized) return sanitized;
      }
    } catch (_) {}

    // 3. Try comics table (filtering out broken 526.jpg or files1.comics.org 403 links)
    try {
      for (const cand of seriesCandidates) {
        const c = db.prepare(
          `SELECT cover_url FROM comics 
           WHERE (series = ? OR series LIKE ? OR series LIKE ?) AND issue_number = ? 
           AND cover_url NOT LIKE '%526.jpg%'
           AND cover_url NOT LIKE '%files1.comics.org%'
           AND cover_url NOT LIKE '%wikia.nocookie%'
           LIMIT 1`
        ).get(cand, cand + "%", "%" + cand + "%", cleanIssue);

        const sanitized = sanitizeUrl(c?.cover_url);
        if (sanitized) return sanitized;
      }
    } catch (_) {}
  } catch (e) {
    console.warn("Sqlite cover lookup error:", e);
  }
  return null;
}

/**
 * Multi-image gallery lookup returning all authentic covers and perspectives for an issue.
 * Enables the multi-photo inspection carousel on the slab encasement.
 */
export function lookupSqliteGallery(series: string, issueNumber: string | number): string[] {
  if (typeof window !== "undefined") return [];
  const db = getSqliteDb();
  if (!db) return [];
  const gallery: string[] = [];
  const seen = new Set<string>();

  try {
    const rawSeries = String(series || "").trim();
    const cleanSeries = rawSeries.replace(/^the\s+/i, "").trim();
    const strippedSeries = cleanSeries.replace(/\s*[\(\[].*?[\)\]]/g, "").trim();
    const cleanIssue = String(issueNumber || "1").replace(/^#/, "").trim();

    const seriesCandidates = [cleanSeries, strippedSeries];
    if (cleanSeries.toLowerCase() === "swamp thing") {
      seriesCandidates.push("Saga of the Swamp Thing");
    } else if (cleanSeries.toLowerCase() === "uncanny x-men") {
      seriesCandidates.push("X-Men");
    } else if (cleanSeries.toLowerCase() === "walking dead") {
      seriesCandidates.push("The Walking Dead");
    }

    const sanitizeUrl = (url: string | null | undefined): string | null => {
      if (!url || typeof url !== "string") return null;
      let trimmed = url.trim();
      if (!trimmed || trimmed.includes("526.jpg") || trimmed.includes("files1.comics.org") || trimmed.includes("wikia.nocookie.net")) return null;
      while (trimmed.includes("%25")) {
        try { trimmed = decodeURI(trimmed); } catch { break; }
      }
      try {
        return encodeURI(decodeURI(trimmed));
      } catch {
        return trimmed;
      }
    };

    const addUrl = (url: string | null | undefined) => {
      const sanitized = sanitizeUrl(url);
      if (sanitized && !seen.has(sanitized)) {
        seen.add(sanitized);
        gallery.push(sanitized);
      }
    };

    // 1. highres_covers (Prioritizing high-resolution Supabase Storage WebP and verified covers)
    for (const cand of seriesCandidates) {
      const rows = db.prepare(
        `SELECT DISTINCT cover_url FROM highres_covers 
         WHERE (series = ? OR series LIKE ? OR series LIKE ?) AND issue_number = ? 
         AND cover_url NOT LIKE '%526.jpg%'
         AND cover_url NOT LIKE '%files1.comics.org%'
         AND cover_url NOT LIKE '%wikia.nocookie%'
         ORDER BY CASE WHEN cover_url LIKE '%supabase.co%' THEN 0 ELSE 1 END 
         LIMIT 6`
      ).all(cand, cand + "%", "%" + cand + "%", cleanIssue) as any[];

      for (const r of rows) {
        addUrl(r.cover_url);
        if (gallery.length >= 5) break;
      }
      if (gallery.length >= 5) break;
    }

    // 2. verified_equities
    if (gallery.length < 5) {
      for (const cand of seriesCandidates) {
        const rows = db.prepare(
          `SELECT DISTINCT cover_url FROM verified_equities 
           WHERE (series = ? OR series LIKE ? OR series LIKE ?) AND issue_number = ? 
           AND cover_url NOT LIKE '%526.jpg%'
           AND cover_url NOT LIKE '%files1.comics.org%'
           ORDER BY CASE WHEN cover_url LIKE '%supabase.co%' THEN 0 ELSE 1 END 
           LIMIT 5`
        ).all(cand, cand + "%", "%" + cand + "%", cleanIssue) as any[];

        for (const r of rows) {
          addUrl(r.cover_url);
          if (gallery.length >= 5) break;
        }
        if (gallery.length >= 5) break;
      }
    }
  } catch (e) {
    console.warn("Sqlite gallery lookup error:", e);
  }
  return gallery;
}

/**
 * GoCollect Collectible Price Index sync.
 * Pulls every published CPI (5 age indexes + 7 themed) from gocollect.com, reads the live book list,
 * index value and divisor, and applies them through public.gocollect_cpi_apply (idempotent; adds new
 * books, deactivates dropped ones, records the weekly index value).
 *
 * GoCollect publishes weekly (Monday, sales through the previous Sunday). The book table is a Livewire
 * component: GET the page for the CSRF token + component snapshot, then POST /livewire/update calling
 * readyDisplay, exactly what the page itself does on load. Only the public (logged-out) view is read.
 */
import { createAdminServerClient } from "@/lib/supabase/admin";

const ORIGIN = "https://gocollect.com";
const UA = "Mozilla/5.0 (compatible; PanelProfitsCPISync/1.0; weekly)";

export const GOCOLLECT_CPI_INDEXES: { slug: string; name: string }[] = [
  { slug: "golden-age", name: "Golden Age" },
  { slug: "silver-age", name: "Silver Age" },
  { slug: "bronze-age", name: "Bronze Age" },
  { slug: "copper-age", name: "Copper Age" },
  { slug: "modern-age", name: "Modern Age" },
  { slug: "big-spenders-club", name: "Big Spenders Club" },
  { slug: "amazing-spider-man", name: "Amazing Spider-Man" },
  { slug: "fantastic-four", name: "Fantastic Four" },
  { slug: "pre-code-horror", name: "Pre-Code Horror" },
  { slug: "silver-surfer", name: "Silver Surfer" },
  { slug: "superman", name: "Superman" },
  { slug: "wolverine", name: "Wolverine" },
];

interface IndexPull {
  slug: string;
  name: string;
  value: number;
  divisor: number | null;
  count: number;
  analyzeDate: string | null;
  books: { id: string; title: string; url: string }[];
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function cookieHeader(res: Response): string {
  const raw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function pullIndex(slug: string, name: string): Promise<IndexPull> {
  const path = `/cpi/comics/${slug}-cpi`;
  const page = await fetch(ORIGIN + path, { headers: { "User-Agent": UA, Accept: "text/html" }, cache: "no-store" });
  if (!page.ok) throw new Error(`${slug}: page ${page.status}`);
  const html = await page.text();
  const csrf = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
  const snapshot = [...html.matchAll(/wire:snapshot="([^"]+)"/g)]
    .map((m) => decode(m[1]))
    .find((s) => s.includes("collectible-price-index.show"));
  if (!csrf || !snapshot) throw new Error(`${slug}: CSRF token or component snapshot not found`);
  const divisor = Number(snapshot.match(/"divisor":(\d+)/)?.[1]) || null;

  const res = await fetch(`${ORIGIN}/livewire/update`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Livewire": "",
      "X-CSRF-TOKEN": csrf,
      Cookie: cookieHeader(page),
      Origin: ORIGIN,
      Referer: ORIGIN + path,
      "User-Agent": UA,
    },
    body: JSON.stringify({
      _token: csrf,
      components: [{ snapshot, updates: {}, calls: [{ path: "", method: "readyDisplay", params: [] }] }],
    }),
  });
  if (!res.ok) throw new Error(`${slug}: livewire ${res.status}`);
  const out = (await res.json()) as { components?: { effects?: { html?: string } }[] };
  const body = out.components?.[0]?.effects?.html ?? "";
  if (!body) throw new Error(`${slug}: empty component response`);

  const books: IndexPull["books"] = [];
  const seen = new Set<string>();
  const rowRe = /wire:key="itemRow\.(\d+)\.[^"]*desktop_name"[\s\S]*?<a href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/g;
  for (const m of body.matchAll(rowRe)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    books.push({ id: m[1], url: decode(m[2]), title: decode(m[3]).trim() });
  }
  const count = Number(body.match(/(\d+) Comics in/)?.[1]);
  if (!count || count !== books.length) {
    throw new Error(`${slug}: page says ${count} books but parsed ${books.length}; not applying`);
  }
  const valueRaw = body.match(/class="pr-0\.5">\s*([\d,]+)\s*<\/div>/)?.[1];
  const value = valueRaw ? Number(valueRaw.replace(/,/g, "")) : NaN;
  if (!Number.isFinite(value)) throw new Error(`${slug}: index value not found`);
  const analyzeDate = body.match(/analyzeDate\.(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  return { slug, name, value, divisor, count, analyzeDate, books };
}

export async function syncGoCollectCpi() {
  const pulls: IndexPull[] = [];
  const errors: string[] = [];
  for (const { slug, name } of GOCOLLECT_CPI_INDEXES) {
    try {
      pulls.push(await pullIndex(slug, name));
    } catch (e) {
      errors.push((e as Error).message);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  if (!pulls.length) return { ok: false, applied: null, errors };

  // all indexes share one publish date; group in case a page lags
  const byDate = new Map<string, IndexPull[]>();
  for (const p of pulls) {
    const d = p.analyzeDate ?? new Date().toISOString().slice(0, 10);
    byDate.set(d, [...(byDate.get(d) ?? []), p]);
  }
  const supabase = createAdminServerClient();
  const applied: unknown[] = [];
  for (const [date, group] of byDate) {
    const payload = group.map((p) => ({
      slug: p.slug, name: p.name, value: p.value, divisor: p.divisor, count: p.count, books: p.books,
    }));
    const { data, error } = await supabase.rpc("gocollect_cpi_apply", { p_date: date, p_payload: payload });
    if (error) errors.push(`apply ${date}: ${error.message}`);
    else applied.push(data);
  }
  return { ok: errors.length === 0, applied, errors };
}

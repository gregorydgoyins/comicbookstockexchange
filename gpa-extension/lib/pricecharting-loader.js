/**
 * lib/pricecharting-loader.js
 * Panel Profits Graded Collector — PriceCharting comics price file loader.
 *
 * PriceCharting serves the download-custom file to this browser but refuses the same request from
 * cloud servers (503), so the download happens here and the rows go to
 * /api/ingestion/pricecharting, which stages and commits them with the same Postgres functions the
 * Supabase nightly job uses. The download link (it contains the account token) is typed into the
 * extension settings by the user and never leaves this browser except to PriceCharting itself.
 *
 * Runs at most once per UTC day automatically (checked every 30 minutes while Chrome is open),
 * or on demand. Every server step is idempotent, so a failed run is simply started again.
 */

const STATE_KEY = 'pcLoadState';
const CHUNK_CHARS = 1_200_000; // ~1.2MB of CSV text per request (Vercel body limit is 4.5MB)
const PARTS = 16; // commit parts (hash-partitioned by pp_id)
const RETRY_AFTER_FAIL_MS = 30 * 60 * 1000; // PriceCharting allows one download per 10 minutes

let running = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayUtc = () => new Date().toISOString().slice(0, 10);

async function getSettings() {
  const { settings } = await chrome.storage.local.get(['settings']);
  return { serverUrl: 'https://comicbookstockexchange.com', ingestionSecret: '', pricechartingUrl: '', ...(settings || {}) };
}

async function loadState() {
  const { [STATE_KEY]: s } = await chrome.storage.local.get([STATE_KEY]);
  return (
    s || {
      status: 'IDLE', // IDLE | RUNNING | DONE | ERROR
      phase: '',
      label: null,
      bytes: 0,
      rowsStaged: 0,
      commitPart: 0,
      lastDoneDate: null,
      lastSummary: null,
      lastError: null,
      nextAttemptAt: 0,
      updatedAt: null,
    }
  );
}

async function saveState(s) {
  s.updatedAt = Date.now();
  await chrome.storage.local.set({ [STATE_KEY]: s });
}

async function api(settings, payload, { retry }) {
  let delay = 2000;
  for (let attempt = 1; attempt <= (retry ? 4 : 1); attempt++) {
    try {
      const res = await fetch(`${settings.serverUrl}/api/ingestion/pricecharting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.ingestionSecret}` },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* non-JSON error body */ }
      if (res.status === 401) throw Object.assign(new Error('Ingestion secret rejected (401)'), { fatal: true });
      if (res.ok && json) return json;
      const msg = (json && json.error) || `HTTP ${res.status} ${text.slice(0, 120)}`;
      if (!retry || res.status < 500) throw Object.assign(new Error(msg), { fatal: res.status < 500 });
      if (attempt === 4) throw new Error(msg);
    } catch (err) {
      if (err.fatal || attempt === (retry ? 4 : 1)) throw err;
    }
    await sleep(delay);
    delay *= 2;
  }
  throw new Error('unreachable');
}

function buildDownloadUrl(raw) {
  const u = new URL(raw.trim());
  if (u.hostname !== 'www.pricecharting.com' && u.hostname !== 'pricecharting.com') {
    throw Object.assign(new Error('Download link must be a pricecharting.com link'), { fatal: true });
  }
  u.searchParams.set('category', 'comic-books');
  return u.toString();
}

async function run() {
  if (running) return;
  running = true;
  const state = await loadState();
  const settings = await getSettings();
  const label = `PriceCharting nightly ${todayUtc()}`;
  const snap = todayUtc();
  try {
    if (!settings.ingestionSecret) throw Object.assign(new Error('Set the ingestion secret in settings first'), { fatal: true });
    if (!settings.pricechartingUrl) throw Object.assign(new Error('Paste the PriceCharting download link in settings first'), { fatal: true });
    const downloadUrl = buildDownloadUrl(settings.pricechartingUrl);

    Object.assign(state, { status: 'RUNNING', phase: 'starting', label, bytes: 0, rowsStaged: 0, commitPart: 0, lastError: null });
    await saveState(state);

    const begun = await api(settings, { action: 'begin', label }, { retry: true });
    if (begun.skipped) {
      Object.assign(state, { status: 'DONE', phase: '', lastDoneDate: todayUtc(), lastSummary: 'Already loaded today' });
      return;
    }

    // 1. download (streamed) and stage
    state.phase = 'downloading';
    await saveState(state);
    const res = await fetch(downloadUrl, { credentials: 'omit' });
    if (!res.ok || !res.body) {
      throw Object.assign(new Error(`PriceCharting returned HTTP ${res.status}`), { retryLater: true });
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let first = true;
    const stage = async (piece) => {
      const out = await api(settings, { action: 'chunk', label, csv: piece, first }, { retry: false });
      state.rowsStaged += Number(out.staged || 0);
      first = false;
      await saveState(state); // also keeps the worker alive
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        state.bytes += value.length;
        buf += dec.decode(value, { stream: true });
      }
      if (done) buf += dec.decode();
      while (buf.length >= CHUNK_CHARS) {
        const cut = buf.lastIndexOf('\n');
        if (cut < 0) break;
        const piece = buf.slice(0, cut + 1);
        buf = buf.slice(cut + 1);
        await stage(piece);
      }
      if (done) break;
    }
    if (buf.length) await stage(buf);

    // 2. sanity check
    state.phase = 'checking';
    await saveState(state);
    const check = await api(settings, { action: 'check', label }, { retry: true });

    // 3. commit in parts
    state.phase = 'committing';
    let historyRows = 0;
    let updatedRows = 0;
    for (let part = 0; part < PARTS; part++) {
      state.commitPart = part + 1;
      await saveState(state);
      const out = await api(settings, { action: 'commit', label, snap, part, parts: PARTS }, { retry: true });
      historyRows += Number(out.result?.history_rows || 0);
      updatedRows += Number(out.result?.rows_updated || 0);
    }
    await api(settings, { action: 'finish', label }, { retry: true });

    Object.assign(state, {
      status: 'DONE',
      phase: '',
      lastDoneDate: todayUtc(),
      lastSummary: `${check.rows.toLocaleString()} comics, ${historyRows.toLocaleString()} history rows, ${updatedRows.toLocaleString()} prices updated`,
    });
  } catch (err) {
    state.lastError = err.message;
    state.status = 'ERROR';
    state.phase = '';
    if (err.retryLater) state.nextAttemptAt = Date.now() + RETRY_AFTER_FAIL_MS;
    if (err.fatal) state.nextAttemptAt = Number.MAX_SAFE_INTEGER; // needs the user; manual start resets it
    try { await api(settings, { action: 'finish', label }, { retry: false }); } catch { /* staging is cleared by the next 'begin' anyway */ }
  } finally {
    await saveState(state);
    running = false;
  }
}

export async function startPriceChartingLoad() {
  const s = await loadState();
  s.nextAttemptAt = 0;
  await saveState(s);
  run();
}

export async function getPriceChartingStatus() {
  return loadState();
}

// Daily check while Chrome is open: run once per UTC day; resume a run the worker dropped mid-way.
chrome.alarms.create('pc_price_daily', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pc_price_daily' || running) return;
  const s = await loadState();
  const settings = await getSettings();
  if (!settings.pricechartingUrl || !settings.ingestionSecret) return;
  if (s.status === 'RUNNING') {
    if (Date.now() - (s.updatedAt || 0) > 5 * 60 * 1000) run(); // worker died mid-run: start over (begin clears staging)
    return;
  }
  if (s.lastDoneDate === todayUtc()) return;
  if (Date.now() < (s.nextAttemptAt || 0)) return;
  run();
});

/**
 * coverProxy.ts — Client-side cover URL routing and quality upgrade (browser bundle).
 *
 * Patterns are imported from the single shared source:
 *   shared/imageUrlPatterns.cjs  (loaded via default import — Vite CJS interop
 *   exposes module.exports as the default, so we destructure from it)
 *
 * The canonical server-side implementation is server/lib/imageUrlUtils.cjs.
 * All three files import patterns from shared/imageUrlPatterns.cjs.
 */

import {
  LOW_RES_URL_PATTERNS,
  PRICECHARTING_REF_RE,
  SLAB_DOMAIN_PATTERNS,
  SLAB_PATH_PATTERNS,
  URL_UPGRADE_RULES,
} from './imageUrlPatterns';

/**
 * Returns true if the URL points to a graded-slab photo rather than raw cover art.
 * Mirrors the server-side isSlabPhotoUrl in server/lib/imageUrlUtils.cjs / .ts.
 * Detects:
 *  - PriceCharting "ref"-prefix auction reference images
 *  - Known auction-source domains (Heritage, eBay, GoCollect, CLZ, etc.)
 *  - URL path signatures indicating graded/slab content
 */
export function isSlabPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (PRICECHARTING_REF_RE.test(url)) return true;
  for (const p of SLAB_DOMAIN_PATTERNS) {
    if (p.test(url)) return true;
  }
  for (const p of SLAB_PATH_PATTERNS) {
    if (p.test(url)) return true;
  }
  return false;
}

// Hosts that serve images with cross-origin headers (kept for backwards-compat reference)
export const DIRECT_HOSTS: string[] = [];

// Hosts that need our backend proxy (restrictive CORS / hotlink protection)
export const PROXY_HOSTS: string[] = [
  'static.wikia.nocookie.net',
  'comicvine.gamespot.com',
  'www.coverbrowser.com',
  'coverbrowser.com',
  'www.comics.org',
  'comics.org',
  'storage.googleapis.com',
  'images.pricecharting.com',
  'pricecharting.com',
  'upload.wikimedia.org',
  'comicbookroundup.com',
  'www.mycomicshop.com',
  'i.annihil.us',
  'gateway.marvel.com',
  'cdn.marvel.com',
  'i1.wp.com',
  'i2.wp.com',
  'i3.wp.com',
];

/**
 * Returns true if the URL carries a dimension query param indicating the
 * image is below the minimum quality threshold (200px).
 * Covers: ?w=N, ?h=N, ?width=N, ?height=N where N < 200.
 */
function hasTinyDimension(url: string): boolean {
  try {
    const u = new URL(url, 'https://example.com');
    for (const [key, val] of u.searchParams) {
      if (['w', 'h', 'width', 'height'].includes(key.toLowerCase())) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n > 0 && n < 200) return true;
      }
    }
  } catch (_) {}
  return false;
}

/**
 * Returns true if the URL is detectably low-resolution — either by
 * path pattern or by a dimension query param below 200px.
 * Mirrors isLowResUrl in server/lib/imageUrlUtils.cjs / .ts.
 */
export function isLowResUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return LOW_RES_URL_PATTERNS.some(p => p.test(url)) || hasTinyDimension(url);
}

/**
 * Keywords whose presence in a URL (case-insensitive) indicates a
 * placeholder, logo, or default image rather than real cover art.
 * Mirrors LOW_QUALITY_MARKERS in server/lib/imageUrlUtils.cjs / .ts.
 */
const LOW_QUALITY_MARKERS: string[] = [
  'placeholder', 'logo', 'no-image', 'spinner',
  'loading', 'default', 'blank', 'missing',
];

/**
 * Returns true if the URL contains a low-quality marker suggesting it is
 * a placeholder or logo rather than real cover art.
 * Mirrors isLowQualityUrl in server/lib/imageUrlUtils.cjs / .ts.
 */
export function isLowQualityUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return LOW_QUALITY_MARKERS.some(m => lower.includes(m));
}

/**
 * Upgrade a cover URL to the best available resolution by applying the shared
 * URL_UPGRADE_RULES from shared/imageUrlPatterns.cjs in sequence.
 */
export function upgradeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return (URL_UPGRADE_RULES as [RegExp, string][]).reduce(
    (u, [pattern, replacement]) => u.replace(pattern, replacement),
    url,
  );
}

function upgradeUrl(url: string): string {
  return upgradeImageUrl(url) ?? url;
}

/**
 * Upgrade a URL and reject (return null) if the result is still low-res,
 * a slab/auction-house photo, or a placeholder/logo URL.
 * Mirrors upgradeOrReject in server/lib/imageUrlUtils.cjs / .ts.
 */
export function upgradeOrReject(url: string | null | undefined): string | null {
  const upgraded = upgradeImageUrl(url);
  if (!upgraded) return null;
  if (isSlabPhotoUrl(upgraded)) return null;
  if (isLowResUrl(upgraded)) return null;
  if (isLowQualityUrl(upgraded)) return null;
  return upgraded;
}

/**
 * proxyCoverUrl:
 * Canonical normalization and proxy delivery for comic covers across the client.
 *
 * Invariants:
 * 1. Returns null for null/empty/whitespace.
 * 2. Idempotent: already-proxied URLs (/api/cover-proxy?url=...) are returned directly without double-proxying.
 * 3. Local/static/data/blob assets (Category C: /renders/, /assets/, /images/, data:, blob:) are preserved and NOT proxied.
 * 4. Filters out slab photos, low-quality markers, and low-res covers.
 * 5. Rewrites images.pricecharting.com to storage.googleapis.com/images.pricecharting.com (valid TLS).
 * 6. All external comic covers route through /api/cover-proxy.
 */
export function proxyCoverUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Idempotency: already proxied via /api/cover-proxy
  if (trimmed.startsWith('/api/cover-proxy')) {
    return trimmed;
  }
  if (trimmed.includes('/api/cover-proxy?url=')) {
    return trimmed.slice(trimmed.indexOf('/api/cover-proxy'));
  }

  // Category C: Local static assets, relative paths, data URLs, and blob URLs
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  try {
    let upgraded = upgradeUrl(trimmed);
    if (isSlabPhotoUrl(upgraded)) return null;
    if (isLowQualityUrl(upgraded)) return null;
    if (isLowResUrl(upgraded)) return null;

    if (upgraded.startsWith('//')) {
      upgraded = 'https:' + upgraded;
    } else if (upgraded.startsWith('http://')) {
      upgraded = 'https://' + upgraded.slice(7);
    }

    const parsed = new URL(upgraded);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    parsed.protocol = 'https:';

    // Check if the URL points to our own app domain with /api/cover-proxy
    if (typeof window !== 'undefined' && parsed.host === window.location.host) {
      if (parsed.pathname.startsWith('/api/cover-proxy')) {
        return parsed.pathname + parsed.search;
      }
      return parsed.pathname + parsed.search;
    }

    // Direct CDN delivery with valid public CORS (Supabase, GCS covers bucket, eBay CDN)
    if (
      parsed.hostname.endsWith('supabase.co') ||
      parsed.hostname.endsWith('ebayimg.com') ||
      (parsed.hostname === 'storage.googleapis.com' && parsed.pathname.startsWith('/panel-profits-covers-all'))
    ) {
      return upgraded;
    }

    return `/api/cover-proxy?url=${encodeURIComponent(upgraded)}`;
  } catch {
    return null;
  }
}

export function proxyHeroCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return proxyCoverUrl(url);
}


declare global {
  interface Window {
    __PP_BACKEND_READY__?: boolean;
  }
}

if (typeof window !== 'undefined') {
  window.__PP_BACKEND_READY__ = false;

  fetch('/api/health')
    .then(() => {
      window.__PP_BACKEND_READY__ = true;
    })
    .catch(() => {});
}

-- ==============================================================================
-- CLEAN PRODUCTION RECOVERY SCHEMA (2026-11-01)
-- Replaces legacy pp_* and sniper_* tables with authoritative, domain-pure models.
-- ==============================================================================

-- 1. MASTER COMICS CATALOG & FULL PRICING MATRIX
create table if not exists public.catalog_comics (
  id                      text primary key,               -- PriceCharting Product ID (e.g. '2315040')
  lookup_key              text not null,                  -- canonical slug: 'amazingspiderman:300'
  series_name             text not null,
  product_name            text not null,
  issue_number            text,
  release_date            text,
  genre                   text,
  barcode_upc             text,
  ebay_epid               text,
  sales_volume            integer default 0,
  
  -- Edition & Variant Partitioning (Newsstand & Foreign are variants, NEVER sovereign)
  is_variant              boolean not null default false,
  variant_type            text,                           -- 'DIRECT', 'NEWSSTAND', 'FOREIGN_VARIANT', 'FOIL', 'REPRINT', etc.
  is_sovereign_eligible   boolean not null default true,  -- Only 1st print Direct Universal Blue is eligible

  -- Physical Certification Spectrum (Universal Blue Label Baseline in USD)
  raw                     numeric,
  cgc_2_0                 numeric,
  cgc_3_0                 numeric,
  cgc_4_0                 numeric,
  cgc_5_0                 numeric,
  cgc_6_0                 numeric,
  cgc_7_0                 numeric,
  cgc_8_0                 numeric,
  cgc_9_0                 numeric,
  cgc_9_2                 numeric,
  cgc_9_4                 numeric,
  cgc_9_6                 numeric,
  cgc_9_8                 numeric,
  cgc_9_8_ask             numeric,
  cgc_9_9                 numeric,
  cgc_10_0                numeric,

  -- Dealer Wholesale Bid / Retail Ask Spreads
  dealer_bid_raw          numeric,
  dealer_ask_raw          numeric,
  dealer_bid_4_0          numeric,
  dealer_ask_4_0          numeric,
  dealer_bid_6_0          numeric,
  dealer_ask_6_0          numeric,

  -- Complete Unmodified Raw Source Payload
  source_payload          jsonb,
  updated_at              timestamptz not null default now()
);

create index if not exists idx_cc_lookup_key on public.catalog_comics(lookup_key);
create index if not exists idx_cc_series on public.catalog_comics(series_name);
create index if not exists idx_cc_volume on public.catalog_comics(sales_volume desc);
create index if not exists idx_cc_cgc_9_8 on public.catalog_comics(cgc_9_8 desc);

alter table public.catalog_comics enable row level security;
drop policy if exists catalog_comics_read on public.catalog_comics;
create policy catalog_comics_read on public.catalog_comics for select using (true);


-- 2. VERIFIED COMPLETED EBAY AUCTION TRANSACTIONS
create table if not exists public.verified_completed_sales (
  sale_id                 text primary key,               -- 'ebay-198742983086'
  catalog_id              text references public.catalog_comics(id) on delete cascade,
  lookup_key              text not null,
  barcode_upc             text,
  ebay_epid               text,
  price_usd               numeric not null,
  sold_at                 timestamptz not null,
  certified_grade         numeric,                        -- 9.8, 9.6, etc. (null for RAW)
  grading_company         text default 'RAW',             -- 'CGC', 'CBCS', 'PSA', 'PGX', 'RAW'
  label_type              text default 'UNIVERSAL_BLUE',  -- 'UNIVERSAL_BLUE', 'QUALIFIED_GREEN', 'RESTORED_PURPLE', 'SIGNATURE_YELLOW'
  cert_number             text,
  venue                   text not null default 'eBay',
  source_url              text,                           -- Direct permalink to auction
  raw_title               text,                           -- Full raw transaction title
  created_at              timestamptz not null default now()
);

create index if not exists idx_vcs_lookup on public.verified_completed_sales(lookup_key, sold_at desc);
create index if not exists idx_vcs_catalog on public.verified_completed_sales(catalog_id, sold_at desc);
create index if not exists idx_vcs_grade on public.verified_completed_sales(certified_grade, price_usd desc);

alter table public.verified_completed_sales enable row level security;
drop policy if exists verified_completed_sales_read on public.verified_completed_sales;
create policy verified_completed_sales_read on public.verified_completed_sales for select using (true);

notify pgrst, 'reload schema';

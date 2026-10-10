-- Rail source table: one row per book that has a cover AND a price. No price floor.
-- PP, ComicBase and GoCollect prices live in separate columns (pp_ladder, cb_price/cb_values, gc_prices).
-- Rows are populated by batch jobs from public.comics (+ cover sources + cgc_population); this file defines the shape.
create table if not exists public.rail_books (
  comics_id         text primary key,
  series            text,
  issue_number      text,
  publisher         text,
  year              integer,
  volume            text,
  edition_form      text,
  printing          text,
  variant_label     text,
  cover_url         text,
  cover_source      text,
  cover_basis       text,
  pp_id             text,
  pp_ladder         jsonb,
  cb_source_id      text,
  cb_price          numeric,
  cb_values         jsonb,
  gc_prices         jsonb,
  age               text,
  origin_year       integer,
  origin_era        text,
  cgc_population_id bigint,
  cgc_total         integer,
  scarcity_tier     text,
  rail_seq          integer
);
create index if not exists rail_books_seq on public.rail_books (rail_seq);

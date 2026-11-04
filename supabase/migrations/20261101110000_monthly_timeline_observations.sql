-- ==============================================================================
-- 3. LONGITUDINAL MONTHLY TIMELINE OBSERVATIONS (UP TO 82 MONTHS PER TRACK)
-- Optimized for high-throughput time-series analytics and TradingView chart rendering.
-- ==============================================================================

create table if not exists public.monthly_timeline_observations (
  catalog_id              text not null references public.catalog_comics(id) on delete cascade,
  lookup_key              text not null,
  track_grade             text not null,                  -- 'RAW', '2.0', '4.0', '6.0', '8.0', '9.2', '9.8', etc.
  observed_date           date not null,                  -- YYYY-MM-01
  price_usd               numeric not null,
  primary key (catalog_id, track_grade, observed_date)
);

create index if not exists idx_mto_lookup_date on public.monthly_timeline_observations(lookup_key, observed_date desc);
create index if not exists idx_mto_catalog_track on public.monthly_timeline_observations(catalog_id, track_grade, observed_date desc);

alter table public.monthly_timeline_observations enable row level security;
drop policy if exists monthly_timeline_observations_read on public.monthly_timeline_observations;
create policy monthly_timeline_observations_read on public.monthly_timeline_observations for select using (true);

notify pgrst, 'reload schema';

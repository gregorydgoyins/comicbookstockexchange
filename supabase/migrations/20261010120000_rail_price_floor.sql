-- Rail price floor: only covered books whose headline price is $17.01 or more are served (the floor the original verified-equities rail always had).
-- Headline = most-quoted pp grade price (order 9.8, 9.4, 9.2, 8.0, 6.0, 4.0, RAW, 9.6, 9.0, 7.0, 5.0, 3.0, 2.0, 10.0), else ComicBase current price.
alter table public.rail_covered_books add column if not exists floor_seq integer;
create index if not exists rail_covered_books_floor_seq on public.rail_covered_books (floor_seq) where floor_seq is not null;
-- floor_seq is a dense 1..N sequence over rail_seq order for floor-passing books (populated by the applied migration).

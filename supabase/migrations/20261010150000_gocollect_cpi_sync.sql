-- GoCollect CPI: all 12 published indexes (5 age indexes + 7 themed), book lists kept current weekly.
-- Additive only. index_slug is the GoCollect slug ('golden-age', 'amazing-spider-man', ...).
alter table public.gocollect_cpi
  add column if not exists index_slug text,
  add column if not exists divisor integer,
  add column if not exists book_count integer;
alter table public.gocollect_cpi_books
  add column if not exists index_slug text,
  add column if not exists gocollect_item_id text;

update public.gocollect_cpi set index_slug = lower(replace(age_category,' ','-')) where index_slug is null;
update public.gocollect_cpi_books set index_slug = lower(replace(age_category,' ','-')) where index_slug is null;

create unique index if not exists gocollect_cpi_slug_date_uq on public.gocollect_cpi (index_slug, snapshot_date);
create unique index if not exists gocollect_cpi_books_slug_item_uq on public.gocollect_cpi_books (index_slug, gocollect_item_id) where gocollect_item_id is not null;

-- Apply one weekly pull. p_payload = [{slug,name,value,divisor,count,books:[{id,title,url}]}].
-- An index that comes back with no books is ignored (nothing is deactivated), so a failed scrape can't empty a list.
create or replace function public.gocollect_cpi_apply(p_date date, p_payload jsonb)
returns jsonb language plpgsql as $$
declare
  idx jsonb; v_slug text; v_name text; v_added int := 0; v_removed int := 0; v_n int; r record;
  out jsonb := '[]'::jsonb;
begin
  for idx in select * from jsonb_array_elements(p_payload) loop
    v_slug := idx->>'slug'; v_name := idx->>'name';
    if jsonb_array_length(coalesce(idx->'books','[]'::jsonb)) = 0 then
      out := out || jsonb_build_object('slug', v_slug, 'skipped', 'no books returned');
      continue;
    end if;

    insert into public.gocollect_cpi (snapshot_date, age_category, index_slug, current_value, divisor, book_count)
    values (p_date, v_name, v_slug, (idx->>'value')::numeric, nullif(idx->>'divisor','')::int, (idx->>'count')::int)
    on conflict (index_slug, snapshot_date) do update
      set current_value = excluded.current_value, divisor = excluded.divisor, book_count = excluded.book_count;

    -- attach GoCollect ids to rows captured earlier by title
    update public.gocollect_cpi_books b
       set gocollect_item_id = x.id, gocollect_url = x.url
      from jsonb_to_recordset(idx->'books') as x(id text, title text, url text)
     where b.index_slug = v_slug and b.gocollect_item_id is null and b.title = x.title;

    -- new books
    insert into public.gocollect_cpi_books (age_category, index_slug, title, gocollect_item_id, gocollect_url, is_active, date_added)
    select v_name, v_slug, x.title, x.id, x.url, true, p_date
      from jsonb_to_recordset(idx->'books') as x(id text, title text, url text)
     where not exists (select 1 from public.gocollect_cpi_books b where b.index_slug = v_slug and b.gocollect_item_id = x.id);
    get diagnostics v_n = row_count; v_added := v_added + v_n;

    -- books that came back after being dropped
    update public.gocollect_cpi_books b set is_active = true, date_removed = null, title = x.title, gocollect_url = x.url
      from jsonb_to_recordset(idx->'books') as x(id text, title text, url text)
     where b.index_slug = v_slug and b.gocollect_item_id = x.id and (b.is_active is not true or b.title <> x.title);

    -- books no longer in the index
    update public.gocollect_cpi_books b set is_active = false, date_removed = p_date
     where b.index_slug = v_slug and b.is_active
       and (b.gocollect_item_id is null or b.gocollect_item_id not in (select x.id from jsonb_to_recordset(idx->'books') as x(id text)));
    get diagnostics v_n = row_count; v_removed := v_removed + v_n;

    out := out || jsonb_build_object('slug', v_slug, 'books', jsonb_array_length(idx->'books'));
  end loop;
  return jsonb_build_object('date', p_date, 'added', v_added, 'removed', v_removed, 'indexes', out);
end $$;

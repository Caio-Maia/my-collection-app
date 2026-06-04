alter table public.collections
  add column if not exists is_public boolean not null default false;

-- Allow unauthenticated reads for public collections
create policy "collections: public read" on public.collections
  for select using (is_public = true);

-- Allow unauthenticated reads for items in public collections
create policy "items: public read via collection" on public.items
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = items.collection_id and c.is_public = true
    )
  );

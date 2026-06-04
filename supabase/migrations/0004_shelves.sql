create table if not exists public.shelves (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  name text not null default '',
  rows int not null default 4,
  cols int not null default 4,
  created_at timestamptz not null default now()
);

alter table public.items
  add column if not exists shelf_id uuid references public.shelves(id) on delete set null,
  add column if not exists shelf_row int,
  add column if not exists shelf_col int;

create index if not exists items_shelf_id_idx on public.items(shelf_id);

alter table public.shelves enable row level security;

create policy "shelves: own via collection" on public.shelves
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = shelves.collection_id and c.user_id = auth.uid()
    )
  );

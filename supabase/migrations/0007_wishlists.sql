create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_collection_id uuid references public.collections(id) on delete set null,
  title text not null,
  description text not null default '',
  photo_url text not null default '',
  attributes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wishlists_user_idx on public.wishlists(user_id);
create index if not exists wishlist_items_wishlist_idx on public.wishlist_items(wishlist_id);
create index if not exists wishlist_items_user_idx on public.wishlist_items(user_id);

alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

create policy "wishlists: own" on public.wishlists for all using (auth.uid() = user_id);
create policy "wishlist_items: own" on public.wishlist_items for all using (auth.uid() = user_id);

create policy "wishlists: public read" on public.wishlists
  for select using (is_public = true);

create policy "wishlist_items: public read via wishlist" on public.wishlist_items
  for select using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_items.wishlist_id and w.is_public = true
    )
  );

drop trigger if exists wishlist_items_set_updated_at on public.wishlist_items;
create trigger wishlist_items_set_updated_at
  before update on public.wishlist_items
  for each row execute procedure public.set_updated_at();

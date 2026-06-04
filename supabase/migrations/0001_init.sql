-- profiles table (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- collections table
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  icon text not null default 'BookOpen',
  created_at timestamptz not null default now()
);

-- items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  title text not null,
  description text not null default '',
  photo_url text not null default '',
  attributes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- activities table
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('added', 'edited', 'removed')),
  collection_id uuid not null,
  collection_name text not null default '',
  item_title text not null,
  created_at timestamptz not null default now()
);

-- Trigger: auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: auto-update updated_at on items
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.items enable row level security;
alter table public.activities enable row level security;

-- Profiles: users can only see/edit their own profile
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- Collections: users only see their own
create policy "collections: own" on public.collections
  for all using (auth.uid() = user_id);

-- Items: users only see items in their own collections
create policy "items: own via collection" on public.items
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = items.collection_id and c.user_id = auth.uid()
    )
  );

-- Activities: users only see their own
create policy "activities: own" on public.activities
  for all using (auth.uid() = user_id);

-- Storage bucket for item photos
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- Storage policies
create policy "item-photos: public read" on storage.objects
  for select using (bucket_id = 'item-photos');

create policy "item-photos: authenticated upload" on storage.objects
  for insert with check (bucket_id = 'item-photos' and auth.role() = 'authenticated');

create policy "item-photos: own delete" on storage.objects
  for delete using (bucket_id = 'item-photos' and auth.uid()::text = (storage.foldername(name))[1]);

alter table public.collections
  add column if not exists cover_color text not null default '',
  add column if not exists cover_image text not null default '';

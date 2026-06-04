alter table public.shelves
  add column if not exists theme text not null default 'default',
  add column if not exists theme_color text not null default '';

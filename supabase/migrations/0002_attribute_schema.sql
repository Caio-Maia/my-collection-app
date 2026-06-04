-- Add attribute_schema column to collections
alter table public.collections
  add column if not exists attribute_schema jsonb not null default '{}';

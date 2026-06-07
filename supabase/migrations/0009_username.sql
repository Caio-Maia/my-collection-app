alter table public.profiles add column if not exists username text not null default '';

-- Backfill: usuários existentes recebem o prefixo do email
update public.profiles
set username = split_part(email, '@', 1)
where username = '';

-- Garantir unicidade após backfill
alter table public.profiles add constraint profiles_username_unique unique (username);

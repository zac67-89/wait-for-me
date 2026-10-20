-- Shared key-card board. Photos live in Vercel Blob; photo_url stores that address.
-- reset_on is the Asia/Yangon date of the last 8:00 PM reset.

do $$ begin
  create type place as enum ('outside', 'lobby', '21', '22', '23');
exception
  when duplicate_object then null;
end $$;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  phone text not null default '',
  photo_url text,
  location place not null default 'outside',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists board (
  id boolean primary key default true check (id),
  reset_on date not null,
  updated_at timestamptz not null default now()
);

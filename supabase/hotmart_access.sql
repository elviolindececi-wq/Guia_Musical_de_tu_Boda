-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Crea el sistema de leads y permisos, y mantiene habilitados a TODOS los usuarios actuales.

create extension if not exists pgcrypto;

create table if not exists public.purchase_leads (
  id uuid primary key default gen_random_uuid(),
  product_code text not null default 'W106077396L',
  name text,
  email text not null,
  phone_e164 text not null,
  country_iso text,
  demo_key text,
  source text not null default 'app_demo',
  status text not null default 'new',
  hotmart_transaction text,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_leads_email_idx on public.purchase_leads (lower(email));
create index if not exists purchase_leads_created_idx on public.purchase_leads (created_at desc);

create table if not exists public.access_entitlements (
  id uuid primary key default gen_random_uuid(),
  product_code text not null default 'W106077396L',
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null check (status in ('active','legacy','refunded','chargeback','canceled','revoked')),
  source text not null check (source in ('hotmart','legacy','manual')),
  hotmart_transaction text not null unique,
  hotmart_event_id text,
  hotmart_product_id bigint,
  hotmart_product_ucode text,
  buyer_name text,
  buyer_phone text,
  purchased_at timestamptz,
  revoked_at timestamptz,
  last_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists access_entitlements_user_idx on public.access_entitlements (user_id);
create index if not exists access_entitlements_email_idx on public.access_entitlements (lower(email));
create index if not exists access_entitlements_product_status_idx on public.access_entitlements (product_code,status);

alter table public.purchase_leads enable row level security;
alter table public.access_entitlements enable row level security;

-- No se crean políticas públicas. Estas tablas se usan únicamente desde las APIs
-- de Vercel con SUPABASE_SERVICE_ROLE_KEY.

-- MIGRACIÓN CLAVE: todos los usuarios que ya existían conservan acceso completo.
insert into public.access_entitlements (
  product_code,
  user_id,
  email,
  status,
  source,
  hotmart_transaction,
  purchased_at,
  last_event
)
select
  'W106077396L',
  u.id,
  lower(u.email),
  'legacy',
  'legacy',
  'legacy-' || u.id::text,
  u.created_at,
  'LEGACY_USER_MIGRATION'
from auth.users u
where u.email is not null
on conflict (hotmart_transaction) do update
set user_id = excluded.user_id,
    email = excluded.email,
    status = 'legacy',
    updated_at = now();

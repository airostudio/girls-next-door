-- Clarity 4K — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database.

create extension if not exists "uuid-ossp";

-- ── Talent ───────────────────────────────────────────────────────────────────
create table if not exists talent (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  stage_name    text,
  email         text unique not null,
  phone         text,
  nationality   text,
  bio           text,
  avatar        text,
  status        text not null default 'ACTIVE',   -- ACTIVE | INACTIVE | PENDING
  tier          text not null default 'STANDARD', -- STANDARD | PREMIUM | ELITE
  joined_at     timestamptz not null default now(),
  contract_end  timestamptz,
  platform_links text,  -- JSON string { onlyfans, instagram, tiktok, … }
  social_links   text,  -- JSON string
  tags           text,  -- comma-separated
  agency_fee     float not null default 20,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Earnings ─────────────────────────────────────────────────────────────────
create table if not exists earnings (
  id          uuid primary key default uuid_generate_v4(),
  talent_id   uuid not null references talent(id) on delete cascade,
  platform    text not null,
  amount      float not null,
  currency    text not null default 'USD',
  month       int  not null,
  year        int  not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ── Expenses ─────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  talent_id   uuid not null references talent(id) on delete cascade,
  category    text not null,
  amount      float not null,
  currency    text not null default 'USD',
  date        timestamptz not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ── Campaigns ────────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  type        text not null, -- LAUNCH | PROMOTION | COLLAB | SEASONAL | SOCIAL_PUSH
  status      text not null default 'DRAFT', -- DRAFT | ACTIVE | PAUSED | COMPLETED
  start_date  timestamptz not null,
  end_date    timestamptz,
  budget      float,
  spent       float not null default 0,
  goal        text,
  platform    text,
  metrics     text, -- JSON: { impressions, clicks, conversions, revenue }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Campaign ↔ Talent ────────────────────────────────────────────────────────
create table if not exists campaign_talent (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  talent_id   uuid not null references talent(id)   on delete cascade,
  unique(campaign_id, talent_id)
);

-- ── Notes ────────────────────────────────────────────────────────────────────
create table if not exists notes (
  id         uuid primary key default uuid_generate_v4(),
  talent_id  uuid not null references talent(id) on delete cascade,
  content    text not null,
  author     text not null,
  created_at timestamptz not null default now()
);

-- ── Agency Settings ──────────────────────────────────────────────────────────
create table if not exists agency_settings (
  id            text primary key default 'default',
  agency_name   text not null default 'Clarity 4K',
  logo_url      text,
  currency      text not null default 'USD',
  default_fee   float not null default 20,
  contact_email text,
  contact_phone text,
  address       text,
  tax_id        text
);

insert into agency_settings (id) values ('default') on conflict (id) do nothing;

-- ── Staff (team members + roles) ──────────────────────────────────────────────
-- The access-control source of truth: who can sign in, and what they can do.
-- Replaces the old ALLOWED_EMAILS env var — managed from Settings > Team
-- instead of requiring a redeploy to add/remove someone. ADMIN_EMAIL (env var)
-- is a separate break-glass bootstrap account, always treated as ADMIN, so a
-- fresh install is never locked out before anyone exists in this table.
create table if not exists staff (
  id         uuid primary key default uuid_generate_v4(),
  email      text unique not null,
  name       text,
  role       text not null default 'VIEWER', -- ADMIN | MANAGER | VIEWER
  status     text not null default 'ACTIVE', -- ACTIVE | INACTIVE
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Clients (brand / sponsor deals) ───────────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  contact_name  text,
  contact_email text,
  contact_phone text,
  website       text,
  industry      text,
  status        text not null default 'PROSPECT', -- PROSPECT | ACTIVE | INACTIVE
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists deals (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  talent_id   uuid references talent(id) on delete set null,
  title       text not null,
  status      text not null default 'PROSPECT', -- PROSPECT | NEGOTIATING | ACTIVE | COMPLETED | CANCELLED
  value       float,
  currency    text default 'USD',
  start_date  timestamptz,
  end_date    timestamptz,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Disable RLS (single-tenant per deployment — service role does all access
--    control at the application layer via the staff table + RBAC checks) ─────
alter table talent          disable row level security;
alter table earnings        disable row level security;
alter table expenses        disable row level security;
alter table campaigns       disable row level security;
alter table campaign_talent disable row level security;
alter table notes           disable row level security;
alter table agency_settings disable row level security;
alter table staff           disable row level security;
alter table clients         disable row level security;
alter table deals           disable row level security;

-- ── NextAuth adapter schema ────────────────────────────────────────────────
-- Backs the magic-link (Email) login: stores users/sessions created by the
-- adapter and the one-time verification tokens emailed to sign in. Lives in
-- its own schema so it doesn't collide with the app's own tables above.
--
-- After running this, go to Supabase Dashboard > Project Settings > API >
-- Exposed schemas, and add "next_auth" to the list — @auth/supabase-adapter
-- talks to these tables over the REST API, which only serves exposed schemas.
create schema if not exists next_auth;

grant usage on schema next_auth to service_role;
grant all on all tables in schema next_auth to service_role;
grant all on all routines in schema next_auth to service_role;
grant all on all sequences in schema next_auth to service_role;
alter default privileges in schema next_auth grant all on tables to service_role;
alter default privileges in schema next_auth grant all on routines to service_role;
alter default privileges in schema next_auth grant all on sequences to service_role;

create table if not exists next_auth.users (
  id uuid not null default uuid_generate_v4(),
  name text,
  email text,
  "emailVerified" timestamptz,
  image text,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email)
);
grant all on table next_auth.users to service_role;

create table if not exists next_auth.sessions (
  id uuid not null default uuid_generate_v4(),
  expires timestamptz not null,
  "sessionToken" text not null,
  "userId" uuid,
  constraint sessions_pkey primary key (id),
  constraint sessions_sessionToken_key unique ("sessionToken"),
  constraint sessions_userId_fkey foreign key ("userId") references next_auth.users (id) on delete cascade
);
grant all on table next_auth.sessions to service_role;

create table if not exists next_auth.accounts (
  id uuid not null default uuid_generate_v4(),
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  "userId" uuid,
  constraint accounts_pkey primary key (id),
  constraint provider_unique unique (provider, "providerAccountId"),
  constraint accounts_userId_fkey foreign key ("userId") references next_auth.users (id) on delete cascade
);
grant all on table next_auth.accounts to service_role;

create table if not exists next_auth.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  constraint verification_tokens_pkey primary key (token),
  constraint token_identifier_unique unique (token, identifier)
);
grant all on table next_auth.verification_tokens to service_role;

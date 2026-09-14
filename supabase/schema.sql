-- Girls Next Door Talent Agency — Supabase Schema
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
  agency_name   text not null default 'Girls Next Door Talent Agency',
  logo_url      text,
  currency      text not null default 'USD',
  default_fee   float not null default 20,
  contact_email text,
  contact_phone text,
  address       text,
  tax_id        text
);

insert into agency_settings (id) values ('default') on conflict (id) do nothing;

-- Renames the row left behind by the Clarity 4K fork. Guarded on the old value
-- so it runs once and then never again: a name set deliberately in
-- Settings > Agency is not the placeholder, so this cannot overwrite it.
update agency_settings
   set agency_name = 'Girls Next Door Talent Agency'
 where id = 'default'
   and agency_name = 'Clarity 4K';

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

-- There are deliberately no password columns here. Staff sign in with Google or
-- a one-time emailed link; the only password in the system is the break-glass
-- ADMIN_PASSWORD env var, which is never stored in the database. These drops
-- clean up an earlier revision that did store per-staff hashes.
alter table staff drop column if exists password_hash;
alter table staff drop column if exists password_updated_at;

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

-- ── Suppliers (photographers, MUAs, stylists, studios) ──────────────────────
-- Distinct from `clients`: clients are brands who pay the agency, suppliers are
-- the people the agency books to produce work.
create table if not exists suppliers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  kind          text not null default 'OTHER', -- PHOTOGRAPHER | VIDEOGRAPHER | MUA | STYLIST | STUDIO | OTHER
  contact_name  text,
  contact_email text,
  contact_phone text,
  website       text,
  city          text,
  country       text,
  day_rate      float,
  currency      text not null default 'USD',
  status        text not null default 'ACTIVE', -- ACTIVE | INACTIVE
  notes         text,
  auth_user_id  uuid unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Media (portfolios, supplier samples, deal assets) ───────────────────────
-- One table serves all three owners, but deliberately NOT as a loose
-- (owner_type, owner_id) pair: that can't carry a foreign key, so deleting a
-- talent would silently strand their images. Instead there's a nullable FK per
-- owner with a check that exactly one is set — real referential integrity, and
-- `on delete cascade` cleans up the rows for free.
--
-- `storage_path` is the object key in the Supabase Storage bucket, kept so
-- deleting a row can delete the file too; `url` is what gets displayed.
create table if not exists media (
  id           uuid primary key default uuid_generate_v4(),
  talent_id    uuid references talent(id)    on delete cascade,
  supplier_id  uuid references suppliers(id) on delete cascade,
  deal_id      uuid references deals(id)     on delete cascade,
  url          text not null,
  storage_path text,
  kind         text not null default 'PHOTO', -- PHOTO | VIDEO
  caption      text,
  sort_order   int  not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint media_exactly_one_owner check (
    (talent_id is not null)::int + (supplier_id is not null)::int + (deal_id is not null)::int = 1
  )
);

create index if not exists media_talent_idx   on media (talent_id, sort_order)   where talent_id   is not null;
create index if not exists media_supplier_idx on media (supplier_id, sort_order) where supplier_id is not null;
create index if not exists media_deal_idx     on media (deal_id, sort_order)     where deal_id     is not null;

-- At most one primary item per owner — the shot used as their thumbnail.
create unique index if not exists media_one_primary_talent   on media (talent_id)   where is_primary and talent_id   is not null;
create unique index if not exists media_one_primary_supplier on media (supplier_id) where is_primary and supplier_id is not null;
create unique index if not exists media_one_primary_deal     on media (deal_id)     where is_primary and deal_id     is not null;

-- Cap each owner at 10 items. Enforced here as well as in the API: two uploads
-- racing each other both pass an application-level count check, and a direct
-- SQL insert skips it entirely.
create or replace function media_enforce_cap() returns trigger as $$
declare existing int;
begin
  select count(*) into existing from media
   where (new.talent_id   is not null and talent_id   = new.talent_id)
      or (new.supplier_id is not null and supplier_id = new.supplier_id)
      or (new.deal_id     is not null and deal_id     = new.deal_id);

  if existing >= 10 then
    raise exception 'This record already has the maximum of 10 media items'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists media_cap on media;
create trigger media_cap before insert on media
  for each row execute function media_enforce_cap();

-- Carry over anything already uploaded under the talent-only table, then retire
-- it. Safe to re-run: the insert is skipped once talent_media is gone.
do $$
begin
  if exists (select 1 from information_schema.tables
              where table_schema = 'public' and table_name = 'talent_media') then
    insert into media (talent_id, url, storage_path, kind, caption, sort_order, is_primary, created_at)
    select talent_id, url, storage_path, kind, caption, sort_order, is_primary, created_at
      from talent_media;
    drop table talent_media;
  end if;
end $$;

-- ── Applications (public join form) ─────────────────────────────────────────
-- Filled in by anyone who follows the public /join link. Deliberately its own
-- table rather than a row in `talent`, `suppliers` or `staff`: an application
-- is a claim by a stranger, not a record the agency has vetted. Nothing here
-- grants the ability to sign in to the agency app — access is still only the
-- `staff` allow-list, and an admin converts an approved application into a
-- talent or supplier record explicitly.
create table if not exists applications (
  id            uuid primary key default uuid_generate_v4(),
  kind          text not null default 'TALENT', -- TALENT | SUPPLIER
  -- Personal
  full_name     text not null,
  email         text not null,
  phone         text,
  city          text,
  country       text,
  -- Business
  business_name text,
  tax_id        text,   -- ABN / VAT / EIN, whatever applies
  website       text,
  instagram     text,
  experience    text,   -- NONE | SOME | EXPERIENCED | PROFESSIONAL
  about         text,
  -- Review
  status        text not null default 'PENDING', -- PENDING | REVIEWING | APPROVED | REJECTED
  review_note   text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists applications_status_idx on applications (status, created_at desc);

-- One open application per address, so a refresh or a double submit doesn't
-- create duplicates. A decided application doesn't block a later re-apply.
create unique index if not exists applications_one_open_per_email
  on applications (lower(email)) where status in ('PENDING', 'REVIEWING');

-- ── Disable RLS (single-tenant per deployment — service role does all access
--    control at the application layer via the staff table + RBAC checks) ─────
alter table talent          disable row level security;
alter table suppliers       disable row level security;
alter table media           disable row level security;
alter table applications    disable row level security;
alter table earnings        disable row level security;
alter table expenses        disable row level security;
alter table campaigns       disable row level security;
alter table campaign_talent disable row level security;
alter table notes           disable row level security;
alter table agency_settings disable row level security;
alter table staff           disable row level security;
alter table clients         disable row level security;
alter table deals           disable row level security;

-- ── Auth storage (public schema, on purpose) ────────────────────────────────
-- These back Google sign-in and magic links.
--
-- They live in `public` rather than a dedicated `next_auth` schema because
-- Supabase's REST API only serves schemas listed under Exposed schemas, and a
-- schema missing from that list fails every auth call with
-- "PGRST106 Invalid schema". `public` is exposed on every Supabase project by
-- default, so putting these here removes a dashboard setting from the list of
-- things that can break sign-in.
--
-- Prefixed auth_* so they never collide with the agency's own tables.
create table if not exists auth_users (
  id             uuid primary key default uuid_generate_v4(),
  name           text,
  email          text unique,
  email_verified timestamptz,
  image          text,
  created_at     timestamptz not null default now()
);

create table if not exists auth_accounts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth_users(id) on delete cascade,
  type                text not null,
  provider            text not null,
  provider_account_id text not null,
  refresh_token       text,
  access_token        text,
  expires_at          bigint,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text,
  created_at          timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create index if not exists auth_accounts_user_idx on auth_accounts (user_id);

-- One-time magic-link tokens. Rows are deleted as they are consumed.
create table if not exists auth_verification_tokens (
  identifier text        not null,
  token      text        not null,
  expires    timestamptz not null,
  primary key (identifier, token)
);

-- Declared here rather than inline because auth_users is created further down.
-- Safe to re-run.
alter table talent    add column if not exists auth_user_id uuid;
alter table suppliers add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'talent_auth_user_fk') then
    alter table talent add constraint talent_auth_user_fk
      foreign key (auth_user_id) references auth_users(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suppliers_auth_user_fk') then
    alter table suppliers add constraint suppliers_auth_user_fk
      foreign key (auth_user_id) references auth_users(id) on delete set null;
  end if;
end $$;

-- One login owns at most one record of each kind.
create unique index if not exists talent_auth_user_uniq    on talent (auth_user_id)    where auth_user_id is not null;
create unique index if not exists suppliers_auth_user_uniq on suppliers (auth_user_id) where auth_user_id is not null;

-- Which application this record was created from, when approving one created
-- it. Kept so approval is reversible: declining an application later can find
-- the account it produced and deactivate it, rather than leaving someone with
-- access to a decision that was withdrawn. Null for records added by hand.
alter table talent    add column if not exists application_id uuid;
alter table suppliers add column if not exists application_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'talent_application_fk') then
    alter table talent add constraint talent_application_fk
      foreign key (application_id) references applications(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suppliers_application_fk') then
    alter table suppliers add constraint suppliers_application_fk
      foreign key (application_id) references applications(id) on delete set null;
  end if;
end $$;

-- An application produces at most one record, so approving twice cannot create
-- a second account even if two reviewers click at the same moment.
create unique index if not exists talent_application_uniq    on talent (application_id)    where application_id is not null;
create unique index if not exists suppliers_application_uniq on suppliers (application_id) where application_id is not null;

alter table auth_users               disable row level security;
alter table auth_accounts            disable row level security;
alter table auth_verification_tokens disable row level security;

-- The old next_auth schema is no longer used. Left in place rather than
-- dropped, so any rows already written there are preserved; it can be removed
-- by hand once you're satisfied nothing needs them:
--   drop schema if exists next_auth cascade;

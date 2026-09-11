-- Clarity 4K — Demo Data
-- Run this in the Supabase SQL Editor AFTER running supabase/schema.sql.
-- Safe to re-run: every insert is guarded so it won't duplicate rows.

-- ── Agency settings ────────────────────────────────────────────────────────
insert into agency_settings (id, agency_name, currency, default_fee, contact_email, contact_phone)
values ('default', 'Clarity 4K', 'USD', 20, 'info@clarity4k.com', '+1 (555) 000-0001')
on conflict (id) do nothing;

-- ── Talent ─────────────────────────────────────────────────────────────────
insert into talent (name, stage_name, email, phone, nationality, bio, avatar, status, tier, agency_fee, tags, platform_links, social_links)
values
  ('Alexa Monroe', 'AlexaM', 'alexa@clarity4k.com', '+1 (555) 100-0001', 'American',
   'Fitness and lifestyle creator with a highly engaged audience. Specialises in wellness content.',
   'https://api.dicebear.com/9.x/personas/svg?seed=alexa', 'ACTIVE', 'ELITE', 20, 'fitness,lifestyle,wellness',
   '{"onlyfans":"https://onlyfans.com/alexam","instagram":"https://instagram.com/alexam"}',
   '{"twitter":"@alexam","tiktok":"@alexam_official"}'),

  ('Brianna Cole', 'BriCole', 'brianna@clarity4k.com', '+1 (555) 100-0002', 'Canadian',
   'Fashion-forward creator blending high-end style with authentic storytelling.',
   'https://api.dicebear.com/9.x/personas/svg?seed=brianna', 'ACTIVE', 'PREMIUM', 20, 'fashion,style,luxury',
   '{"onlyfans":"https://onlyfans.com/bricole","instagram":"https://instagram.com/bricole"}',
   '{"twitter":"@bricole","tiktok":"@bricole_style"}'),

  ('Camille Dupont', 'CamD', 'camille@clarity4k.com', '+1 (555) 100-0003', 'French',
   'Art and photography enthusiast creating visually stunning editorial content.',
   'https://api.dicebear.com/9.x/personas/svg?seed=camille', 'ACTIVE', 'PREMIUM', 18, 'art,photography,editorial',
   '{"onlyfans":"https://onlyfans.com/camd","instagram":"https://instagram.com/camd"}',
   '{"twitter":"@camd_art"}'),

  ('Diana Lee', 'DianaL', 'diana@clarity4k.com', '+1 (555) 100-0004', 'Australian',
   'Lifestyle and travel creator known for sun-soaked, aspirational content.',
   'https://api.dicebear.com/9.x/personas/svg?seed=diana', 'ACTIVE', 'STANDARD', 20, 'travel,lifestyle,outdoors',
   '{"onlyfans":"https://onlyfans.com/diana","instagram":"https://instagram.com/dianaleeofficial"}',
   '{"tiktok":"@dianalee_travel"}'),

  ('Elena Vasquez', 'ElenaV', 'elena@clarity4k.com', '+1 (555) 100-0005', 'Spanish',
   'Dance and performance creator with viral short-form video presence.',
   'https://api.dicebear.com/9.x/personas/svg?seed=elena', 'ACTIVE', 'ELITE', 20, 'dance,performance,viral',
   '{"onlyfans":"https://onlyfans.com/elenav","tiktok":"https://tiktok.com/@elenav_dance"}',
   '{"instagram":"elenav_official","twitter":"@elenav"}'),

  ('Fiona Walsh', 'FiW', 'fiona@clarity4k.com', '+1 (555) 100-0006', 'Irish',
   'Comedy and lifestyle content creator building a loyal, engaged community.',
   'https://api.dicebear.com/9.x/personas/svg?seed=fiona', 'PENDING', 'STANDARD', 20, 'comedy,lifestyle,community',
   '{"instagram":"https://instagram.com/fionaw"}',
   '{"tiktok":"@fionaw_comedy"}'),

  ('Sophia Reyes', 'SophR', 'sophia@clarity4k.com', '+1 (555) 100-0007', 'American',
   'Sun-kissed, girl-next-door charm with a warm, approachable style that resonates with a broad fan base. Beach and poolside lifestyle content.',
   'https://api.dicebear.com/9.x/personas/svg?seed=sophia', 'ACTIVE', 'ELITE', 20, 'girl-next-door,beach,lifestyle',
   '{"onlyfans":"https://onlyfans.com/sophr","instagram":"https://instagram.com/sophiareyes"}',
   '{"twitter":"@sophr","tiktok":"@sophr_official"}'),

  ('Mia Torres', 'MiaT', 'mia@clarity4k.com', '+1 (555) 100-0008', 'American',
   'Californian outdoors enthusiast with a natural, tanned, girl-next-door aesthetic. Known for laid-back, authentic day-in-the-life content.',
   'https://api.dicebear.com/9.x/personas/svg?seed=mia', 'ACTIVE', 'PREMIUM', 20, 'girl-next-door,outdoors,lifestyle',
   '{"onlyfans":"https://onlyfans.com/miat","instagram":"https://instagram.com/miatorres"}',
   '{"tiktok":"@miat_official"}'),

  ('Isabella Cruz', 'BellaC', 'isabella@clarity4k.com', '+1 (555) 100-0009', 'Brazilian',
   'Warm, sun-bronzed glow paired with an easygoing, approachable presence. Fast-growing fitness and swimwear content creator.',
   'https://api.dicebear.com/9.x/personas/svg?seed=isabella', 'ACTIVE', 'PREMIUM', 18, 'girl-next-door,fitness,swimwear',
   '{"onlyfans":"https://onlyfans.com/bellac","instagram":"https://instagram.com/isabellacruz"}',
   '{"twitter":"@bellac","tiktok":"@bellac_fit"}'),

  ('Kayla Bennett', 'KaylaB', 'kayla@clarity4k.com', '+1 (555) 100-0010', 'American',
   'Down-to-earth, tanned girl-next-door with a following built on genuine, relatable outdoor and travel content.',
   'https://api.dicebear.com/9.x/personas/svg?seed=kayla', 'PENDING', 'STANDARD', 20, 'girl-next-door,travel,outdoors',
   '{"instagram":"https://instagram.com/kaylabennett"}',
   '{"tiktok":"@kaylab_travels"}')
on conflict (email) do nothing;

-- ── Earnings — last 6 months of OnlyFans revenue for each ACTIVE talent ─────
-- (skips any talent/month/platform combo that already has a row, so this is
-- safe to re-run without doubling up revenue)
insert into earnings (talent_id, platform, amount, month, year, description)
select
  t.id,
  'OnlyFans',
  case t.tier when 'ELITE' then 9200 when 'PREMIUM' then 4600 else 1800 end,
  extract(month from (now() - (n || ' months')::interval))::int,
  extract(year  from (now() - (n || ' months')::interval))::int,
  'Monthly subscription revenue'
from talent t
cross join generate_series(0, 5) as n
where t.status = 'ACTIVE'
  and not exists (
    select 1 from earnings e
    where e.talent_id = t.id
      and e.platform  = 'OnlyFans'
      and e.month = extract(month from (now() - (n || ' months')::interval))::int
      and e.year  = extract(year  from (now() - (n || ' months')::interval))::int
  );

-- ── Earnings — brand deals for the last 3 months (ACTIVE talents only) ──────
insert into earnings (talent_id, platform, amount, month, year, description)
select
  t.id,
  'Instagram',
  1200,
  extract(month from (now() - (n || ' months')::interval))::int,
  extract(year  from (now() - (n || ' months')::interval))::int,
  'Brand deal / sponsorship'
from talent t
cross join generate_series(0, 2) as n
where t.status = 'ACTIVE'
  and not exists (
    select 1 from earnings e
    where e.talent_id = t.id
      and e.description = 'Brand deal / sponsorship'
      and e.month = extract(month from (now() - (n || ' months')::interval))::int
      and e.year  = extract(year  from (now() - (n || ' months')::interval))::int
  );

-- ── Expenses — last 4 months, one entry per active talent per month ────────
insert into expenses (talent_id, category, amount, date, description)
select
  t.id,
  'Shoot',
  650,
  (now() - (n || ' months')::interval),
  'Monthly operational expense'
from talent t
cross join generate_series(0, 3) as n
where t.status = 'ACTIVE'
  and not exists (
    select 1 from expenses e
    where e.talent_id = t.id
      and date_trunc('month', e.date) = date_trunc('month', now() - (n || ' months')::interval)
  );

-- ── Campaigns ────────────────────────────────────────────────────────────────
insert into campaigns (title, description, type, status, start_date, end_date, budget, spent, goal, platform, metrics)
select * from (values
  ('Summer Launch 2024', 'High-impact summer content push across all platforms to drive new subscriptions.',
   'LAUNCH', 'COMPLETED', '2024-06-01'::timestamptz, '2024-08-31'::timestamptz, 5000::float, 4750::float,
   'Grow subscriber base by 25%', 'OnlyFans',
   '{"impressions":320000,"clicks":18400,"conversions":2100,"revenue":52000}'),

  ('Elite Creator Promo — Q4', 'Exclusive promotional campaign targeting premium subscribers with elite tier content bundles.',
   'PROMOTION', 'ACTIVE', '2024-10-01'::timestamptz, null, 8000::float, 3200::float,
   'Increase ARPU by 15%', 'OnlyFans',
   '{"impressions":145000,"clicks":9200,"conversions":870,"revenue":28000}'),

  ('Instagram Reach Expansion', 'Cross-platform push to grow Instagram followings and funnel traffic to OnlyFans.',
   'SOCIAL_PUSH', 'ACTIVE', '2024-11-01'::timestamptz, null, 3000::float, 1100::float,
   'Add 50k Instagram followers across roster', 'Instagram',
   '{"impressions":210000,"clicks":7800,"conversions":430,"revenue":8500}'),

  ('Holiday Season Collab', 'Collaborative limited-time content series featuring top-tier talent for the holiday period.',
   'COLLAB', 'DRAFT', '2024-12-15'::timestamptz, '2025-01-05'::timestamptz, 6000::float, 0::float,
   'Drive 500 new subscriptions in 3 weeks', 'OnlyFans', null),

  ('New Talent Onboarding — Fiona', 'Launch campaign for newest talent Fiona Walsh, building initial audience and subscriber base.',
   'LAUNCH', 'DRAFT', '2025-01-10'::timestamptz, null, 2500::float, 0::float,
   'Reach 500 subscribers in first 30 days', 'OnlyFans', null),

  ('Girl-Next-Door Collective Launch', 'Joint launch campaign introducing Sophia, Mia, Isabella and Kayla with a shared sun-soaked content series.',
   'LAUNCH', 'DRAFT', '2025-02-01'::timestamptz, null, 4000::float, 0::float,
   'Reach 1,000 combined new subscribers in first 30 days', 'OnlyFans', null)
) as v(title, description, type, status, start_date, end_date, budget, spent, goal, platform, metrics)
where not exists (select 1 from campaigns c where c.title = v.title);

-- ── Campaign ↔ Talent links ────────────────────────────────────────────────
insert into campaign_talent (campaign_id, talent_id)
select c.id, t.id from campaigns c, talent t
where (c.title, t.email) in (
  ('Summer Launch 2024', 'alexa@clarity4k.com'),
  ('Summer Launch 2024', 'brianna@clarity4k.com'),
  ('Summer Launch 2024', 'elena@clarity4k.com'),
  ('Elite Creator Promo — Q4', 'alexa@clarity4k.com'),
  ('Elite Creator Promo — Q4', 'elena@clarity4k.com'),
  ('Instagram Reach Expansion', 'brianna@clarity4k.com'),
  ('Instagram Reach Expansion', 'camille@clarity4k.com'),
  ('Instagram Reach Expansion', 'diana@clarity4k.com'),
  ('Holiday Season Collab', 'alexa@clarity4k.com'),
  ('Holiday Season Collab', 'elena@clarity4k.com'),
  ('New Talent Onboarding — Fiona', 'fiona@clarity4k.com'),
  ('Girl-Next-Door Collective Launch', 'sophia@clarity4k.com'),
  ('Girl-Next-Door Collective Launch', 'mia@clarity4k.com'),
  ('Girl-Next-Door Collective Launch', 'isabella@clarity4k.com'),
  ('Girl-Next-Door Collective Launch', 'kayla@clarity4k.com')
)
on conflict (campaign_id, talent_id) do nothing;

-- ── Notes ────────────────────────────────────────────────────────────────────
insert into notes (talent_id, content, author)
select t.id, v.content, v.author
from (values
  ('alexa@clarity4k.com',   'Alexa is ready for the next shoot — schedule confirmed for Dec 3rd.', 'Sarah Mitchell'),
  ('alexa@clarity4k.com',   'Brand deal with NutriCo finalised — $3,200 deliverable due Dec 10.', 'Admin User'),
  ('brianna@clarity4k.com', 'Discussed raising tier to ELITE — review after Q4 numbers.', 'Sarah Mitchell'),
  ('elena@clarity4k.com',   'Elena is performing exceptionally — viral TikTok drove 12k new follows this week.', 'Sarah Mitchell'),
  ('fiona@clarity4k.com',   'Fiona onboarding in progress — paperwork sent, awaiting signed contract.', 'Admin User'),
  ('sophia@clarity4k.com',  'Sophia hit ELITE tier this quarter — renegotiating her agency fee split.', 'Sarah Mitchell'),
  ('mia@clarity4k.com',     'Mia''s beach shoot footage is in — scheduling release across all platforms next week.', 'Admin User'),
  ('isabella@clarity4k.com','Isabella''s swimwear collab is picking up strong early engagement.', 'Sarah Mitchell'),
  ('kayla@clarity4k.com',   'Kayla onboarding in progress — awaiting signed contract before going ACTIVE.', 'Admin User')
) as v(email, content, author)
join talent t on t.email = v.email
where not exists (
  select 1 from notes n where n.talent_id = t.id and n.content = v.content
);

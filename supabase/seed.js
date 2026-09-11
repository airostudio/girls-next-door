// Seeds demo data into Supabase. Requires NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY to be set (service role bypasses RLS for inserts).
// Safe to re-run: talents are deduped by email, campaigns by title, and
// earnings/expenses/notes are only generated for talents newly created in
// this run — so running this again after adding more demo talents won't
// duplicate anything for the ones that already existed.
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  await supabase.from('agency_settings').upsert({
    id: 'default',
    agency_name: 'Clarity 4K',
    currency: 'USD',
    default_fee: 20,
    contact_email: 'info@clarity4k.com',
    contact_phone: '+1 (555) 000-0001',
  })

  const talents = [
    {
      name: 'Alexa Monroe', stage_name: 'AlexaM', email: 'alexa@clarity4k.com',
      phone: '+1 (555) 100-0001', nationality: 'American',
      bio: 'Fitness and lifestyle creator with a highly engaged audience. Specialises in wellness content.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=alexa',
      status: 'ACTIVE', tier: 'ELITE', agency_fee: 20, tags: 'fitness,lifestyle,wellness',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/alexam', instagram: 'https://instagram.com/alexam' }),
      social_links: JSON.stringify({ twitter: '@alexam', tiktok: '@alexam_official' }),
    },
    {
      name: 'Brianna Cole', stage_name: 'BriCole', email: 'brianna@clarity4k.com',
      phone: '+1 (555) 100-0002', nationality: 'Canadian',
      bio: 'Fashion-forward creator blending high-end style with authentic storytelling.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=brianna',
      status: 'ACTIVE', tier: 'PREMIUM', agency_fee: 20, tags: 'fashion,style,luxury',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/bricole', instagram: 'https://instagram.com/bricole' }),
      social_links: JSON.stringify({ twitter: '@bricole', tiktok: '@bricole_style' }),
    },
    {
      name: 'Camille Dupont', stage_name: 'CamD', email: 'camille@clarity4k.com',
      phone: '+1 (555) 100-0003', nationality: 'French',
      bio: 'Art and photography enthusiast creating visually stunning editorial content.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=camille',
      status: 'ACTIVE', tier: 'PREMIUM', agency_fee: 18, tags: 'art,photography,editorial',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/camd', instagram: 'https://instagram.com/camd' }),
      social_links: JSON.stringify({ twitter: '@camd_art' }),
    },
    {
      name: 'Diana Lee', stage_name: 'DianaL', email: 'diana@clarity4k.com',
      phone: '+1 (555) 100-0004', nationality: 'Australian',
      bio: 'Lifestyle and travel creator known for sun-soaked, aspirational content.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=diana',
      status: 'ACTIVE', tier: 'STANDARD', agency_fee: 20, tags: 'travel,lifestyle,outdoors',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/diana', instagram: 'https://instagram.com/dianaleeofficial' }),
      social_links: JSON.stringify({ tiktok: '@dianalee_travel' }),
    },
    {
      name: 'Elena Vasquez', stage_name: 'ElenaV', email: 'elena@clarity4k.com',
      phone: '+1 (555) 100-0005', nationality: 'Spanish',
      bio: 'Dance and performance creator with viral short-form video presence.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=elena',
      status: 'ACTIVE', tier: 'ELITE', agency_fee: 20, tags: 'dance,performance,viral',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/elenav', tiktok: 'https://tiktok.com/@elenav_dance' }),
      social_links: JSON.stringify({ instagram: 'elenav_official', twitter: '@elenav' }),
    },
    {
      name: 'Fiona Walsh', stage_name: 'FiW', email: 'fiona@clarity4k.com',
      phone: '+1 (555) 100-0006', nationality: 'Irish',
      bio: 'Comedy and lifestyle content creator building a loyal, engaged community.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=fiona',
      status: 'PENDING', tier: 'STANDARD', agency_fee: 20, tags: 'comedy,lifestyle,community',
      platform_links: JSON.stringify({ instagram: 'https://instagram.com/fionaw' }),
      social_links: JSON.stringify({ tiktok: '@fionaw_comedy' }),
    },
    {
      name: 'Sophia Reyes', stage_name: 'SophR', email: 'sophia@clarity4k.com',
      phone: '+1 (555) 100-0007', nationality: 'American',
      bio: 'Sun-kissed, girl-next-door charm with a warm, approachable style that resonates with a broad fan base. Beach and poolside lifestyle content.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=sophia',
      status: 'ACTIVE', tier: 'ELITE', agency_fee: 20, tags: 'girl-next-door,beach,lifestyle',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/sophr', instagram: 'https://instagram.com/sophiareyes' }),
      social_links: JSON.stringify({ twitter: '@sophr', tiktok: '@sophr_official' }),
    },
    {
      name: 'Mia Torres', stage_name: 'MiaT', email: 'mia@clarity4k.com',
      phone: '+1 (555) 100-0008', nationality: 'American',
      bio: 'Californian outdoors enthusiast with a natural, tanned, girl-next-door aesthetic. Known for laid-back, authentic day-in-the-life content.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=mia',
      status: 'ACTIVE', tier: 'PREMIUM', agency_fee: 20, tags: 'girl-next-door,outdoors,lifestyle',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/miat', instagram: 'https://instagram.com/miatorres' }),
      social_links: JSON.stringify({ tiktok: '@miat_official' }),
    },
    {
      name: 'Isabella Cruz', stage_name: 'BellaC', email: 'isabella@clarity4k.com',
      phone: '+1 (555) 100-0009', nationality: 'Brazilian',
      bio: 'Warm, sun-bronzed glow paired with an easygoing, approachable presence. Fast-growing fitness and swimwear content creator.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=isabella',
      status: 'ACTIVE', tier: 'PREMIUM', agency_fee: 18, tags: 'girl-next-door,fitness,swimwear',
      platform_links: JSON.stringify({ onlyfans: 'https://onlyfans.com/bellac', instagram: 'https://instagram.com/isabellacruz' }),
      social_links: JSON.stringify({ twitter: '@bellac', tiktok: '@bellac_fit' }),
    },
    {
      name: 'Kayla Bennett', stage_name: 'KaylaB', email: 'kayla@clarity4k.com',
      phone: '+1 (555) 100-0010', nationality: 'American',
      bio: 'Down-to-earth, tanned girl-next-door with a following built on genuine, relatable outdoor and travel content.',
      avatar: 'https://api.dicebear.com/9.x/personas/svg?seed=kayla',
      status: 'PENDING', tier: 'STANDARD', agency_fee: 20, tags: 'girl-next-door,travel,outdoors',
      platform_links: JSON.stringify({ instagram: 'https://instagram.com/kaylabennett' }),
      social_links: JSON.stringify({ tiktok: '@kaylab_travels' }),
    },
  ]

  const createdTalents = []
  const newlyCreatedIds = new Set()
  for (const t of talents) {
    const { data: existing } = await supabase.from('talent').select('id').eq('email', t.email).maybeSingle()
    if (existing) { createdTalents.push(existing); continue }
    const { data, error } = await supabase.from('talent').insert(t).select().single()
    if (error) throw error
    createdTalents.push(data)
    newlyCreatedIds.add(data.id)
  }

  const now = new Date()
  const newActiveTalents = createdTalents.filter((t, i) => newlyCreatedIds.has(t.id) && talents[i].status === 'ACTIVE')
  for (const talent of newActiveTalents) {
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const base = talent.tier === 'ELITE' ? 8000 : talent.tier === 'PREMIUM' ? 4000 : 1500
      await supabase.from('earnings').insert({
        talent_id: talent.id, platform: 'OnlyFans',
        amount: base + Math.floor(Math.random() * base * 0.5),
        month: d.getMonth() + 1, year: d.getFullYear(),
        description: 'Monthly subscription revenue',
      })
      if (i < 3) {
        await supabase.from('earnings').insert({
          talent_id: talent.id,
          platform: ['Instagram', 'TikTok', 'Other'][Math.floor(Math.random() * 3)],
          amount: Math.floor(Math.random() * 2000) + 200,
          month: d.getMonth() + 1, year: d.getFullYear(),
          description: 'Brand deal / sponsorship',
        })
      }
    }
  }

  const categories = ['Shoot', 'Travel', 'Equipment', 'Marketing', 'Other']
  for (const talent of newActiveTalents) {
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15)
      await supabase.from('expenses').insert({
        talent_id: talent.id,
        category: categories[Math.floor(Math.random() * categories.length)],
        amount: Math.floor(Math.random() * 1200) + 100,
        date: d.toISOString(),
        description: 'Monthly operational expense',
      })
    }
  }

  const campaigns = [
    {
      title: 'Summer Launch 2024', type: 'LAUNCH', status: 'COMPLETED',
      description: 'High-impact summer content push across all platforms to drive new subscriptions.',
      start_date: '2024-06-01', end_date: '2024-08-31', budget: 5000, spent: 4750,
      goal: 'Grow subscriber base by 25%', platform: 'OnlyFans',
      metrics: JSON.stringify({ impressions: 320000, clicks: 18400, conversions: 2100, revenue: 52000 }),
    },
    {
      title: 'Elite Creator Promo — Q4', type: 'PROMOTION', status: 'ACTIVE',
      description: 'Exclusive promotional campaign targeting premium subscribers with elite tier content bundles.',
      start_date: '2024-10-01', budget: 8000, spent: 3200,
      goal: 'Increase ARPU by 15%', platform: 'OnlyFans',
      metrics: JSON.stringify({ impressions: 145000, clicks: 9200, conversions: 870, revenue: 28000 }),
    },
    {
      title: 'Instagram Reach Expansion', type: 'SOCIAL_PUSH', status: 'ACTIVE',
      description: 'Cross-platform push to grow Instagram followings and funnel traffic to OnlyFans.',
      start_date: '2024-11-01', budget: 3000, spent: 1100,
      goal: 'Add 50k Instagram followers across roster', platform: 'Instagram',
      metrics: JSON.stringify({ impressions: 210000, clicks: 7800, conversions: 430, revenue: 8500 }),
    },
    {
      title: 'Holiday Season Collab', type: 'COLLAB', status: 'DRAFT',
      description: 'Collaborative limited-time content series featuring top-tier talent for the holiday period.',
      start_date: '2024-12-15', end_date: '2025-01-05', budget: 6000, spent: 0,
      goal: 'Drive 500 new subscriptions in 3 weeks', platform: 'OnlyFans', metrics: null,
    },
    {
      title: 'New Talent Onboarding — Fiona', type: 'LAUNCH', status: 'DRAFT',
      description: 'Launch campaign for newest talent Fiona Walsh, building initial audience and subscriber base.',
      start_date: '2025-01-10', budget: 2500, spent: 0,
      goal: 'Reach 500 subscribers in first 30 days', platform: 'OnlyFans', metrics: null,
    },
    {
      title: 'Girl-Next-Door Collective Launch', type: 'LAUNCH', status: 'DRAFT',
      description: 'Joint launch campaign introducing Sophia, Mia, Isabella and Kayla with a shared sun-soaked content series.',
      start_date: '2025-02-01', budget: 4000, spent: 0,
      goal: 'Reach 1,000 combined new subscribers in first 30 days', platform: 'OnlyFans', metrics: null,
    },
  ]

  const createdCampaigns = []
  const newlyCreatedCampaignIds = new Set()
  for (const c of campaigns) {
    const { data: existing } = await supabase.from('campaigns').select('*').eq('title', c.title).maybeSingle()
    if (existing) { createdCampaigns.push(existing); continue }
    const { data, error } = await supabase.from('campaigns').insert(c).select().single()
    if (error) throw error
    createdCampaigns.push(data)
    newlyCreatedCampaignIds.add(data.id)
  }

  const links = [
    [0, 0], [0, 1], [0, 4],
    [1, 0], [1, 4],
    [2, 1], [2, 2], [2, 3],
    [3, 0], [3, 4],
    [4, 5],
    [5, 6], [5, 7], [5, 8], [5, 9],
  ]
  for (const [ci, ti] of links) {
    const campaignId = createdCampaigns[ci].id
    const talentId = createdTalents[ti].id
    const { data: existingLink } = await supabase
      .from('campaign_talent').select('id')
      .eq('campaign_id', campaignId).eq('talent_id', talentId).maybeSingle()
    if (!existingLink) {
      await supabase.from('campaign_talent').insert({ campaign_id: campaignId, talent_id: talentId })
    }
  }

  const notes = [
    { i: 0, content: 'Alexa is ready for the next shoot — schedule confirmed for Dec 3rd.', author: 'Sarah Mitchell' },
    { i: 0, content: 'Brand deal with NutriCo finalised — $3,200 deliverable due Dec 10.', author: 'Admin User' },
    { i: 1, content: 'Discussed raising tier to ELITE — review after Q4 numbers.', author: 'Sarah Mitchell' },
    { i: 4, content: 'Elena is performing exceptionally — viral TikTok drove 12k new follows this week.', author: 'Sarah Mitchell' },
    { i: 5, content: 'Fiona onboarding in progress — paperwork sent, awaiting signed contract.', author: 'Admin User' },
    { i: 6, content: 'Sophia hit ELITE tier this quarter — renegotiating her agency fee split.', author: 'Sarah Mitchell' },
    { i: 7, content: "Mia's beach shoot footage is in — scheduling release across all platforms next week.", author: 'Admin User' },
    { i: 8, content: "Isabella's swimwear collab is picking up strong early engagement.", author: 'Sarah Mitchell' },
    { i: 9, content: 'Kayla onboarding in progress — awaiting signed contract before going ACTIVE.', author: 'Admin User' },
  ]
  for (const n of notes) {
    if (!newlyCreatedIds.has(createdTalents[n.i].id)) continue // talent already existed, likely already has this note
    await supabase.from('notes').insert({ talent_id: createdTalents[n.i].id, content: n.content, author: n.author })
  }

  console.log('✅ Supabase seed complete')
}

main().catch(e => { console.error(e); process.exit(1) })

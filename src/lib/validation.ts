import { NextResponse } from 'next/server'
import { z } from 'zod'

type ValidateResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

/** Parses a request body against a zod schema, returning a uniform ok/response shape. */
export async function validateBody<T>(req: Request, schema: z.ZodType<T>): Promise<ValidateResult<T>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      ),
    }
  }
  return { ok: true, data: result.data }
}

// ── Shared enums ───────────────────────────────────────────────────────────
const talentStatus  = z.enum(['ACTIVE', 'INACTIVE', 'PENDING'])
const talentTier    = z.enum(['STANDARD', 'PREMIUM', 'ELITE'])
const campaignType  = z.enum(['LAUNCH', 'PROMOTION', 'COLLAB', 'SEASONAL', 'SOCIAL_PUSH'])
const campaignStat  = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'])
const clientStatus  = z.enum(['PROSPECT', 'ACTIVE', 'INACTIVE'])
const dealStatus    = z.enum(['PROSPECT', 'NEGOTIATING', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
const staffRole     = z.enum(['ADMIN', 'MANAGER', 'VIEWER'])
const staffStatus   = z.enum(['ACTIVE', 'INACTIVE'])

// ── Talent ───────────────────────────────────────────────────────────────────
export const TalentCreateSchema = z.object({
  name:          z.string().trim().min(1).max(200),
  stageName:     z.string().trim().max(200).optional(),
  email:         z.string().trim().email().max(255),
  phone:         z.string().trim().max(50).optional(),
  nationality:   z.string().trim().max(100).optional(),
  bio:           z.string().trim().max(5000).optional(),
  avatar:        z.string().trim().url().max(2000).optional(),
  status:        talentStatus.optional(),
  tier:          talentTier.optional(),
  agencyFee:     z.number().min(0).max(100).optional(),
  tags:          z.string().trim().max(500).optional(),
  platformLinks: z.string().max(5000).optional(),
  socialLinks:   z.string().max(5000).optional(),
})
export const TalentUpdateSchema = TalentCreateSchema.partial()

// ── Earnings / Expenses ────────────────────────────────────────────────────
export const EarningCreateSchema = z.object({
  talentId:    z.string().uuid(),
  platform:    z.string().trim().min(1).max(100),
  amount:      z.coerce.number().positive().max(100_000_000),
  currency:    z.string().trim().length(3).optional(),
  month:       z.coerce.number().int().min(1).max(12),
  year:        z.coerce.number().int().min(2000).max(2100),
  description: z.string().trim().max(2000).optional(),
})

export const ExpenseCreateSchema = z.object({
  talentId:    z.string().uuid(),
  category:    z.string().trim().min(1).max(100),
  amount:      z.coerce.number().positive().max(100_000_000),
  currency:    z.string().trim().length(3).optional(),
  date:        z.coerce.date(),
  description: z.string().trim().max(2000).optional(),
})

// ── Campaigns ────────────────────────────────────────────────────────────────
export const CampaignCreateSchema = z.object({
  title:       z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  type:        campaignType,
  status:      campaignStat.optional(),
  startDate:   z.coerce.date(),
  endDate:     z.coerce.date().optional(),
  budget:      z.coerce.number().min(0).max(100_000_000).optional(),
  goal:        z.string().trim().max(500).optional(),
  platform:    z.string().trim().max(100).optional(),
  talentIds:   z.array(z.string().uuid()).optional(),
})
export const CampaignUpdateSchema = z.object({
  title:       z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  type:        campaignType.optional(),
  status:      campaignStat.optional(),
  startDate:   z.coerce.date().optional(),
  endDate:     z.coerce.date().optional(),
  budget:      z.coerce.number().min(0).max(100_000_000).optional(),
  spent:       z.coerce.number().min(0).max(100_000_000).optional(),
  goal:        z.string().trim().max(500).optional(),
  platform:    z.string().trim().max(100).optional(),
  metrics:     z.string().max(5000).optional(),
})

// ── Clients / Deals ────────────────────────────────────────────────────────
export const ClientCreateSchema = z.object({
  name:         z.string().trim().min(1).max(200),
  contactName:  z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(50).optional(),
  website:      z.string().trim().url().max(2000).optional().or(z.literal('')),
  industry:     z.string().trim().max(100).optional(),
  status:       clientStatus.optional(),
  notes:        z.string().trim().max(5000).optional(),
})
export const ClientUpdateSchema = ClientCreateSchema.partial()

export const DealCreateSchema = z.object({
  clientId:    z.string().uuid(),
  talentId:    z.string().uuid().optional(),
  title:       z.string().trim().min(1).max(200),
  status:      dealStatus.optional(),
  value:       z.coerce.number().min(0).max(100_000_000).optional(),
  currency:    z.string().trim().length(3).optional(),
  startDate:   z.coerce.date().optional(),
  endDate:     z.coerce.date().optional(),
  description: z.string().trim().max(5000).optional(),
})
export const DealUpdateSchema = DealCreateSchema.partial().extend({ clientId: z.string().uuid().optional() })

// ── Agency settings ────────────────────────────────────────────────────────
export const AgencySettingsSchema = z.object({
  agencyName:   z.string().trim().min(1).max(200).optional(),
  currency:     z.string().trim().length(3).optional(),
  defaultFee:   z.coerce.number().min(0).max(100).optional(),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(50).optional(),
  address:      z.string().trim().max(1000).optional(),
  taxId:        z.string().trim().max(100).optional(),
})

// ── Staff ───────────────────────────────────────────────────────────────────
export const StaffCreateSchema = z.object({
  email:  z.string().trim().email().max(255),
  name:   z.string().trim().max(200).optional(),
  role:   staffRole.optional(),
  status: staffStatus.optional(),
})
export const StaffUpdateSchema = z.object({
  name:   z.string().trim().max(200).optional(),
  role:   staffRole.optional(),
  status: staffStatus.optional(),
})

export type TalentStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING'
export type TalentTier   = 'STANDARD' | 'PREMIUM' | 'ELITE'
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
export type CampaignType   = 'LAUNCH' | 'PROMOTION' | 'COLLAB' | 'SEASONAL' | 'SOCIAL_PUSH'
export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER'

export interface Talent {
  id: string
  name: string
  stageName?: string | null
  email: string
  phone?: string | null
  nationality?: string | null
  bio?: string | null
  avatar?: string | null
  status: TalentStatus
  tier: TalentTier
  joinedAt: string
  contractEnd?: string | null
  platformLinks?: string | null
  socialLinks?: string | null
  tags?: string | null
  agencyFee: number
  _count?: { earnings: number; campaigns: number }
  totalEarnings?: number
}

export interface Earning {
  id: string
  talentId: string
  platform: string
  amount: number
  currency: string
  month: number
  year: number
  description?: string | null
  createdAt: string
  talent?: { name: string; stageName?: string | null }
}

export interface Expense {
  id: string
  talentId: string
  category: string
  amount: number
  currency: string
  date: string
  description?: string | null
  talent?: { name: string; stageName?: string | null }
}

export interface Campaign {
  id: string
  title: string
  description?: string | null
  type: CampaignType
  status: CampaignStatus
  startDate: string
  endDate?: string | null
  budget?: number | null
  spent: number
  goal?: string | null
  platform?: string | null
  metrics?: string | null
  talents?: { talent: { id: string; name: string; avatar?: string | null } }[]
}

export interface KPIData {
  totalTalent: number
  activeTalent: number
  totalRevenue: number
  agencyRevenue: number
  activeCampaigns: number
  avgEarningsPerTalent: number
}

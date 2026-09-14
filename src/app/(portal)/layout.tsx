import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getAgencyBranding } from '@/lib/agency'
import PortalChrome from '@/components/portal/PortalChrome'

/**
 * Member area — models and suppliers only.
 *
 * Staff are sent to the CRM rather than shown both. This is navigation; the
 * actual boundary is requireAccount on every /api/portal route, which derives
 * the caller's record from the session and scopes every query to it.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const accountType = (session.user as any)?.accountType
  if (accountType === 'STAFF') redirect('/dashboard')
  if (accountType !== 'TALENT' && accountType !== 'SUPPLIER') redirect('/auth/login')

  const { agencyName } = await getAgencyBranding()

  return (
    <PortalChrome
      agencyName={agencyName}
      accountType={accountType}
      name={session.user?.name ?? session.user?.email ?? 'Your account'}
    >
      {children}
    </PortalChrome>
  )
}

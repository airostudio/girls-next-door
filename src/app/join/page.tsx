import JoinForm from '@/components/join/JoinForm'
import { getAgencyBranding } from '@/lib/agency'

export const dynamic = 'force-dynamic'

/**
 * Built from the agency name in the database rather than hard-coded, so the
 * tab title cannot drift from the name shown on the page itself — which is
 * exactly what happened while this page said "Girls next Door" and the heading
 * beneath it said something else.
 */
export async function generateMetadata() {
  const { agencyName } = await getAgencyBranding()
  return {
    title: `Join — ${agencyName}`,
    description: `Apply to join the ${agencyName} roster as talent, or register as a supplier.`,
  }
}

/**
 * Public — deliberately outside the (app) route group, so it has no session
 * check. Submitting it creates an application for review; it does not create an
 * account or grant access to anything.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams?: { from?: string; email?: string; name?: string }
}) {
  const { agencyName } = await getAgencyBranding()

  // Set when someone signed in with Google but isn't a member yet, so the page
  // can say why they're here instead of on the dashboard they were expecting.
  const fromSignIn = searchParams?.from === 'signin'

  return (
    <JoinForm
      agencyName={agencyName}
      fromSignIn={fromSignIn}
      prefillEmail={searchParams?.email ?? ''}
      prefillName={searchParams?.name ?? ''}
    />
  )
}

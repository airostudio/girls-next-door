import JoinForm from '@/components/join/JoinForm'
import { getAgencyBranding } from '@/lib/agency'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Join — Girls next Door Talent Agency',
  description: 'Apply to join the Girls next Door roster as talent, or register as a supplier.',
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

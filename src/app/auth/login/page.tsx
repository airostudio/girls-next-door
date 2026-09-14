import LoginForm from '@/components/auth/LoginForm'
import { getAgencyBranding } from '@/lib/agency'
import { emailSignInEnabled } from '@/lib/auth'

export default async function LoginPage() {
  const { agencyName } = await getAgencyBranding()
  return <LoginForm agencyName={agencyName} magicLinkEnabled={emailSignInEnabled()} />
}

import LoginForm from '@/components/auth/LoginForm'
import { getAgencyBranding } from '@/lib/agency'

export default async function LoginPage() {
  const { agencyName } = await getAgencyBranding()
  return <LoginForm agencyName={agencyName} />
}

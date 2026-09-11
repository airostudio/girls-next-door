import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { getAgencyBranding } from '@/lib/agency'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const branding = await getAgencyBranding()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar agencyName={branding.agencyName} />
      <main className="flex-1 overflow-y-auto bg-surface">
        {children}
      </main>
    </div>
  )
}
